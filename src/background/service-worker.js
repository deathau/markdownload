// Service Worker for MarkDownload - Manifest V3
// Import required scripts
importScripts(
  '../browser-polyfill.min.js',
  'apache-mime-types.js',
  'moment.min.js',
  'turndown.js',
  'turndown-plugin-gfm.js',
  'Readability.js',
  '../shared/context-menus.js',
  '../shared/default-options.js'
);

// Log platform info on startup
chrome.runtime.getPlatformInfo().then(async platformInfo => {
  console.info('Platform:', platformInfo);
});

// Add notification listener for foreground page messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle async response
  handleMessage(message, sender).then(sendResponse).catch(err => {
    console.error('Message handling error:', err);
    sendResponse({ error: err.message });
  });
  return true; // Keep the message channel open for async response
});

// Create context menus on install
chrome.runtime.onInstalled.addListener(() => {
  createMenus();
});

// Also create menus on startup (service worker may restart)
chrome.runtime.onStartup.addListener(() => {
  createMenus();
});

TurndownService.prototype.defaultEscape = TurndownService.prototype.escape;

// Function to convert the article content to markdown using Turndown
function turndown(content, options, article) {
  if (options.turndownEscape) TurndownService.prototype.escape = TurndownService.prototype.defaultEscape;
  else TurndownService.prototype.escape = s => s;

  var turndownService = new TurndownService(options);

  turndownService.use(turndownPluginGfm.gfm);

  turndownService.keep(['iframe', 'sub', 'sup', 'u', 'ins', 'del', 'small', 'big']);

  let imageList = {};

  // Add an image rule
  turndownService.addRule('images', {
    filter: function (node, tdopts) {
      if (node.nodeName == 'IMG' && node.getAttribute('src')) {
        let src = node.getAttribute('src');
        node.setAttribute('src', validateUri(src, article.baseURI));

        if (options.downloadImages) {
          let imageFilename = getImageFilename(src, options, false);
          if (!imageList[src] || imageList[src] != imageFilename) {
            let i = 1;
            while (Object.values(imageList).includes(imageFilename)) {
              const parts = imageFilename.split('.');
              if (i == 1) parts.splice(parts.length - 1, 0, i++);
              else parts.splice(parts.length - 2, 1, i++);
              imageFilename = parts.join('.');
            }
            imageList[src] = imageFilename;
          }
          const obsidianLink = options.imageStyle.startsWith("obsidian");
          const localSrc = options.imageStyle === 'obsidian-nofolder'
            ? imageFilename.substring(imageFilename.lastIndexOf('/') + 1)
            : imageFilename.split('/').map(s => obsidianLink ? s : encodeURI(s)).join('/');

          if (options.imageStyle != 'originalSource' && options.imageStyle != 'base64') {
            node.setAttribute('src', localSrc);
          }
          return true;
        }
        else return true;
      }
      return false;
    },
    replacement: function (content, node, tdopts) {
      if (options.imageStyle == 'noImage') return '';
      else if (options.imageStyle.startsWith('obsidian')) return `![[${node.getAttribute('src')}]]`;
      else {
        var alt = cleanAttribute(node.getAttribute('alt'));
        var src = node.getAttribute('src') || '';
        var title = cleanAttribute(node.getAttribute('title'));
        var titlePart = title ? ' "' + title + '"' : '';
        if (options.imageRefStyle == 'referenced') {
          var id = this.references.length + 1;
          this.references.push('[fig' + id + ']: ' + src + titlePart);
          return '![' + alt + '][fig' + id + ']';
        }
        else return src ? '![' + alt + ']' + '(' + src + titlePart + ')' : '';
      }
    },
    references: [],
    append: function (options) {
      var references = '';
      if (this.references.length) {
        references = '\n\n' + this.references.join('\n') + '\n\n';
        this.references = [];
      }
      return references;
    }
  });

  // Add a rule for links
  turndownService.addRule('links', {
    filter: (node, tdopts) => {
      if (node.nodeName == 'A' && node.getAttribute('href')) {
        const href = node.getAttribute('href');
        node.setAttribute('href', validateUri(href, article.baseURI));
        return options.linkStyle == 'stripLinks';
      }
      return false;
    },
    replacement: (content, node, tdopts) => content
  });

  // Handle MathJax
  turndownService.addRule('mathjax', {
    filter(node, options) {
      return article.math.hasOwnProperty(node.id);
    },
    replacement(content, node, options) {
      const math = article.math[node.id];
      let tex = math.tex.trim().replaceAll('\xa0', '');

      if (math.inline) {
        tex = tex.replaceAll('\n', ' ');
        return `$${tex}$`;
      }
      else
        return `$$\n${tex}\n$$`;
    }
  });

  function repeat(character, count) {
    return Array(count + 1).join(character);
  }

  function convertToFencedCodeBlock(node, options) {
    node.innerHTML = node.innerHTML.replaceAll('<br-keep></br-keep>', '<br>');
    const langMatch = node.id?.match(/code-lang-(.+)/);
    const language = langMatch?.length > 0 ? langMatch[1] : '';

    const code = node.innerText;

    const fenceChar = options.fence.charAt(0);
    let fenceSize = 3;
    const fenceInCodeRegex = new RegExp('^' + fenceChar + '{3,}', 'gm');

    let match;
    while ((match = fenceInCodeRegex.exec(code))) {
      if (match[0].length >= fenceSize) {
        fenceSize = match[0].length + 1;
      }
    }

    const fence = repeat(fenceChar, fenceSize);

    return (
      '\n\n' + fence + language + '\n' +
      code.replace(/\n$/, '') +
      '\n' + fence + '\n\n'
    );
  }

  turndownService.addRule('fencedCodeBlock', {
    filter: function (node, options) {
      return (
        options.codeBlockStyle === 'fenced' &&
        node.nodeName === 'PRE' &&
        node.firstChild &&
        node.firstChild.nodeName === 'CODE'
      );
    },
    replacement: function (content, node, options) {
      return convertToFencedCodeBlock(node.firstChild, options);
    }
  });

  // Handle <pre> as code blocks
  turndownService.addRule('pre', {
    filter: (node, tdopts) => {
      return node.nodeName == 'PRE'
             && (!node.firstChild || node.firstChild.nodeName != 'CODE')
             && !node.querySelector('img');
    },
    replacement: (content, node, tdopts) => {
      return convertToFencedCodeBlock(node, tdopts);
    }
  });

  let markdown = options.frontmatter + turndownService.turndown(content) + options.backmatter;

  // Strip out non-printing special characters
  markdown = markdown.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028\u2029\ufeff\ufff9-\ufffc]/g, '');

  return { markdown: markdown, imageList: imageList };
}

function cleanAttribute(attribute) {
  return attribute ? attribute.replace(/(\n+\s*)+/g, '\n') : '';
}

function validateUri(href, baseURI) {
  try {
    new URL(href);
  }
  catch {
    const baseUri = new URL(baseURI);
    if (href.startsWith('/')) {
      href = baseUri.origin + href;
    }
    else {
      // Fixed: Don't add extra slash if baseUri already ends with /
      href = baseUri.href + (baseUri.href.endsWith('/') ? '' : '/') + href;
    }
  }
  return href;
}

function getImageFilename(src, options, prependFilePath = true) {
  const slashPos = src.lastIndexOf('/');
  const queryPos = src.indexOf('?');
  let filename = src.substring(slashPos + 1, queryPos > 0 ? queryPos : src.length);

  let imagePrefix = (options.imagePrefix || '');

  if (prependFilePath && options.title.includes('/')) {
    imagePrefix = options.title.substring(0, options.title.lastIndexOf('/') + 1) + imagePrefix;
  }
  else if (prependFilePath) {
    imagePrefix = options.title + (imagePrefix.startsWith('/') ? '' : '/') + imagePrefix;
  }

  if (filename.includes(';base64,')) {
    filename = 'image.' + filename.substring(0, filename.indexOf(';'));
  }

  let extension = filename.substring(filename.lastIndexOf('.'));
  if (extension == filename) {
    filename = filename + '.idunno';
  }

  filename = generateValidFileName(filename, options.disallowedChars);

  return imagePrefix + filename;
}

// Function to replace placeholder strings with article info
function textReplace(string, article, disallowedChars = null) {
  for (const key in article) {
    if (article.hasOwnProperty(key) && key != "content") {
      let s = (article[key] || '') + '';
      if (s && disallowedChars) s = generateValidFileName(s, disallowedChars);

      string = string.replace(new RegExp('{' + key + '}', 'g'), s)
        .replace(new RegExp('{' + key + ':lower}', 'g'), s.toLowerCase())
        .replace(new RegExp('{' + key + ':upper}', 'g'), s.toUpperCase())
        .replace(new RegExp('{' + key + ':kebab}', 'g'), s.replace(/ /g, '-').toLowerCase())
        .replace(new RegExp('{' + key + ':mixed-kebab}', 'g'), s.replace(/ /g, '-'))
        .replace(new RegExp('{' + key + ':snake}', 'g'), s.replace(/ /g, '_').toLowerCase())
        .replace(new RegExp('{' + key + ':mixed_snake}', 'g'), s.replace(/ /g, '_'))
        .replace(new RegExp('{' + key + ':obsidian-cal}', 'g'), s.replace(/ /g, '-').replace(/-{2,}/g, "-"))
        .replace(new RegExp('{' + key + ':camel}', 'g'), s.replace(/ ./g, (str) => str.trim().toUpperCase()).replace(/^./, (str) => str.toLowerCase()))
        .replace(new RegExp('{' + key + ':pascal}', 'g'), s.replace(/ ./g, (str) => str.trim().toUpperCase()).replace(/^./, (str) => str.toUpperCase()));
    }
  }

  // Replace date formats
  const now = new Date();
  const dateRegex = /{date:(.+?)}/g;
  const matches = string.match(dateRegex);
  if (matches && matches.forEach) {
    matches.forEach(match => {
      const format = match.substring(6, match.length - 1);
      const dateString = moment(now).format(format);
      string = string.replaceAll(match, dateString);
    });
  }

  // Replace keywords
  const keywordRegex = /{keywords:?(.*)?}/g;
  const keywordMatches = string.match(keywordRegex);
  if (keywordMatches && keywordMatches.forEach) {
    keywordMatches.forEach(match => {
      let seperator = match.substring(10, match.length - 1);
      try {
        seperator = JSON.parse(JSON.stringify(seperator).replace(/\\\\/g, '\\'));
      }
      catch (e) { /* ignore parse errors */ }
      const keywordsString = (article.keywords || []).join(seperator);
      string = string.replace(new RegExp(match.replace(/\\/g, '\\\\'), 'g'), keywordsString);
    });
  }

  // Replace anything left in curly braces
  const defaultRegex = /{(.*?)}/g;
  string = string.replace(defaultRegex, '');

  return string;
}

// Function to convert an article info object into markdown
async function convertArticleToMarkdown(article, downloadImages = null) {
  const options = await getOptions();
  if (downloadImages != null) {
    options.downloadImages = downloadImages;
  }

  // Clone options to avoid mutating the original
  const opts = { ...options };

  if (opts.includeTemplate) {
    opts.frontmatter = textReplace(opts.frontmatter, article) + '\n';
    opts.backmatter = '\n' + textReplace(opts.backmatter, article);
  }
  else {
    opts.frontmatter = opts.backmatter = '';
  }

  opts.imagePrefix = textReplace(opts.imagePrefix, article, opts.disallowedChars)
    .split('/').map(s => generateValidFileName(s, opts.disallowedChars)).join('/');

  let result = turndown(article.content, opts, article);
  if (opts.downloadImages && opts.downloadMode == 'downloadsApi') {
    result = await preDownloadImages(result.imageList, result.markdown);
  }
  return result;
}

// Function to turn the title into a valid file name
function generateValidFileName(title, disallowedChars = null) {
  if (!title) return title;
  else title = title + '';

  var illegalRe = /[\/\?<>\\:\*\|":]/g;
  var name = title.replace(illegalRe, "").replace(new RegExp('\u00A0', 'g'), ' ')
      .replace(new RegExp(/\s+/, 'g'), ' ')
      .trim();

  if (disallowedChars) {
    for (let c of disallowedChars) {
      if (`[\\^$.|?*+()`.includes(c)) c = `\\${c}`;
      name = name.replace(new RegExp(c, 'g'), '');
    }
  }

  return name;
}

// Pre-download images using fetch instead of XMLHttpRequest
async function preDownloadImages(imageList, markdown) {
  const options = await getOptions();
  let newImageList = {};

  await Promise.all(Object.entries(imageList).map(([src, filename]) =>
    fetch(src)
      .then(response => response.blob())
      .then(async blob => {
        if (options.imageStyle == 'base64') {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = function () {
              markdown = markdown.replaceAll(src, reader.result);
              resolve();
            };
            reader.readAsDataURL(blob);
          });
        }
        else {
          let newFilename = filename;
          if (newFilename.endsWith('.idunno')) {
            newFilename = filename.replace('.idunno', '.' + (mimedb[blob.type] || 'png'));

            if (!options.imageStyle.startsWith("obsidian")) {
              markdown = markdown.replaceAll(
                filename.split('/').map(s => encodeURI(s)).join('/'),
                newFilename.split('/').map(s => encodeURI(s)).join('/')
              );
            }
            else {
              markdown = markdown.replaceAll(filename, newFilename);
            }
          }

          const blobUrl = URL.createObjectURL(blob);
          newImageList[blobUrl] = newFilename;
        }
      })
      .catch(err => {
        console.error('Failed to download image:', src, err);
      })
  ));

  return { imageList: newImageList, markdown: markdown };
}

// Function to actually download the markdown file
async function downloadMarkdown(markdown, title, tabId, imageList = {}, mdClipsFolder = '') {
  const options = await getOptions();

  if (options.downloadMode == 'downloadsApi' && chrome.downloads) {
    const url = URL.createObjectURL(new Blob([markdown], {
      type: "text/markdown;charset=utf-8"
    }));

    try {
      if (mdClipsFolder && !mdClipsFolder.endsWith('/')) mdClipsFolder += '/';

      const id = await chrome.downloads.download({
        url: url,
        filename: mdClipsFolder + title + ".md",
        saveAs: options.saveAs
      });

      chrome.downloads.onChanged.addListener(downloadListener(id, url));

      if (options.downloadImages) {
        let destPath = mdClipsFolder + title.substring(0, title.lastIndexOf('/'));
        if (destPath && !destPath.endsWith('/')) destPath += '/';

        for (const [src, filename] of Object.entries(imageList)) {
          try {
            const imgId = await chrome.downloads.download({
              url: src,
              filename: destPath ? destPath + filename : filename,
              saveAs: false
            });
            chrome.downloads.onChanged.addListener(downloadListener(imgId, src));
          } catch (imgErr) {
            console.error('Failed to download image:', filename, imgErr);
          }
        }
      }
    }
    catch (err) {
      console.error("Download failed", err);
    }
  }
  else {
    // Download via content link - send message to content script
    try {
      const filename = mdClipsFolder + generateValidFileName(title, options.disallowedChars) + ".md";
      await chrome.tabs.sendMessage(tabId, {
        type: "downloadViaContentLink",
        filename: filename,
        markdown: base64EncodeUnicode(markdown)
      });
    }
    catch (error) {
      console.error("Failed to download via content link:", error);
    }
  }
}

function downloadListener(id, url) {
  const self = (delta) => {
    if (delta.id === id && delta.state && delta.state.current == "complete") {
      chrome.downloads.onChanged.removeListener(self);
      URL.revokeObjectURL(url);
    }
  };
  return self;
}

function base64EncodeUnicode(str) {
  const utf8Bytes = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
    return String.fromCharCode('0x' + p1);
  });
  return btoa(utf8Bytes);
}

// Main message handler
async function handleMessage(message, sender) {
  const options = await getOptions();

  if (message.type == "clip") {
    const article = await getArticleFromDom(message.dom);

    if (message.selection && message.clipSelection) {
      article.content = message.selection;
    }

    const { markdown, imageList } = await convertArticleToMarkdown(article);
    article.title = await formatTitle(article);
    const mdClipsFolder = await formatMdClipsFolder(article);

    return { type: "display.md", markdown: markdown, article: article, imageList: imageList, mdClipsFolder: mdClipsFolder };
  }
  else if (message.type == "download") {
    await downloadMarkdown(message.markdown, message.title, message.tab.id, message.imageList, message.mdClipsFolder);
    return { success: true };
  }
  else if (message.type == "getSelectionAndDom") {
    // This message comes from popup requesting content script data
    return { success: true };
  }

  return { success: true };
}

// Command listener
chrome.commands.onCommand.addListener(async function (command) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (command == "download_tab_as_markdown") {
    const info = { menuItemId: "download-markdown-all" };
    await downloadMarkdownFromContext(info, tab);
  }
  else if (command == "copy_tab_as_markdown") {
    const info = { menuItemId: "copy-markdown-all" };
    await copyMarkdownFromContext(info, tab);
  }
  else if (command == "copy_selection_as_markdown") {
    const info = { menuItemId: "copy-markdown-selection" };
    await copyMarkdownFromContext(info, tab);
  }
  else if (command == "copy_tab_as_markdown_link") {
    await copyTabAsMarkdownLink(tab);
  }
  else if (command == "copy_selected_tab_as_markdown_link") {
    await copySelectedTabAsMarkdownLink(tab);
  }
  else if (command == "copy_selection_to_obsidian") {
    const info = { menuItemId: "copy-markdown-obsidian" };
    await copyMarkdownFromContext(info, tab);
  }
  else if (command == "copy_tab_to_obsidian") {
    const info = { menuItemId: "copy-markdown-obsall" };
    await copyMarkdownFromContext(info, tab);
  }
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener(async function (info, tab) {
  if (info.menuItemId.startsWith("copy-markdown")) {
    await copyMarkdownFromContext(info, tab);
  }
  else if (info.menuItemId == "download-markdown-alltabs" || info.menuItemId == "tab-download-markdown-alltabs") {
    await downloadMarkdownForAllTabs(info);
  }
  else if (info.menuItemId.startsWith("download-markdown")) {
    await downloadMarkdownFromContext(info, tab);
  }
  else if (info.menuItemId.startsWith("copy-tab-as-markdown-link-all")) {
    await copyTabAsMarkdownLinkAll(tab);
  }
  else if (info.menuItemId.startsWith("copy-tab-as-markdown-link-selected")) {
    await copySelectedTabAsMarkdownLink(tab);
  }
  else if (info.menuItemId.startsWith("copy-tab-as-markdown-link")) {
    await copyTabAsMarkdownLink(tab);
  }
  else if (info.menuItemId.startsWith("toggle-") || info.menuItemId.startsWith("tabtoggle-")) {
    await toggleSetting(info.menuItemId.split('-')[1]);
  }
});

// Toggle setting function
async function toggleSetting(setting, options = null) {
  if (options == null) {
    await toggleSetting(setting, await getOptions());
  }
  else {
    options[setting] = !options[setting];
    await chrome.storage.sync.set(options);

    if (setting == "includeTemplate") {
      try {
        await chrome.contextMenus.update("toggle-includeTemplate", { checked: options.includeTemplate });
      } catch (e) { /* menu might not exist */ }
      try {
        await chrome.contextMenus.update("tabtoggle-includeTemplate", { checked: options.includeTemplate });
      } catch (e) { /* menu might not exist */ }
    }

    if (setting == "downloadImages") {
      try {
        await chrome.contextMenus.update("toggle-downloadImages", { checked: options.downloadImages });
      } catch (e) { /* menu might not exist */ }
      try {
        await chrome.contextMenus.update("tabtoggle-downloadImages", { checked: options.downloadImages });
      } catch (e) { /* menu might not exist */ }
    }
  }
}

// Get article from DOM string
async function getArticleFromDom(domString) {
  const parser = new DOMParser();
  const dom = parser.parseFromString(domString, "text/html");

  if (dom.documentElement.nodeName == "parsererror") {
    console.error("Error while parsing DOM");
  }

  const math = {};

  const storeMathInfo = (el, mathInfo) => {
    // Generate a unique ID without creating a Blob URL (fixing memory leak)
    const randomId = 'math-' + crypto.randomUUID();
    el.id = randomId;
    math[randomId] = mathInfo;
  };

  dom.body.querySelectorAll('script[id^=MathJax-Element-]')?.forEach(mathSource => {
    const type = mathSource.attributes.type?.value;
    storeMathInfo(mathSource, {
      tex: mathSource.innerText,
      inline: type ? !type.includes('mode=display') : false
    });
  });

  dom.body.querySelectorAll('[markdownload-latex]')?.forEach(mathJax3Node => {
    const tex = mathJax3Node.getAttribute('markdownload-latex');
    const display = mathJax3Node.getAttribute('display');
    const inline = !(display && display === 'true');

    const mathNode = dom.createElement(inline ? "i" : "p");
    mathNode.textContent = tex;
    mathJax3Node.parentNode.insertBefore(mathNode, mathJax3Node.nextSibling);
    mathJax3Node.parentNode.removeChild(mathJax3Node);

    storeMathInfo(mathNode, {
      tex: tex,
      inline: inline
    });
  });

  dom.body.querySelectorAll('.katex-mathml')?.forEach(kaTeXNode => {
    const annotation = kaTeXNode.querySelector('annotation');
    if (annotation) {
      storeMathInfo(kaTeXNode, {
        tex: annotation.textContent,
        inline: true
      });
    }
  });

  dom.body.querySelectorAll('[class*=highlight-text],[class*=highlight-source]')?.forEach(codeSource => {
    const language = codeSource.className.match(/highlight-(?:text|source)-([a-z0-9]+)/)?.[1];
    if (codeSource.firstChild?.nodeName == "PRE") {
      codeSource.firstChild.id = `code-lang-${language}`;
    }
  });

  dom.body.querySelectorAll('[class*=language-]')?.forEach(codeSource => {
    const language = codeSource.className.match(/language-([a-z0-9]+)/)?.[1];
    codeSource.id = `code-lang-${language}`;
  });

  dom.body.querySelectorAll('pre br')?.forEach(br => {
    br.outerHTML = '<br-keep></br-keep>';
  });

  dom.body.querySelectorAll('.codehilite > pre')?.forEach(codeSource => {
    if (codeSource.firstChild?.nodeName !== 'CODE' && !codeSource.className.includes('language')) {
      codeSource.id = `code-lang-text`;
    }
  });

  dom.body.querySelectorAll('h1, h2, h3, h4, h5, h6')?.forEach(header => {
    header.className = '';
    header.outerHTML = header.outerHTML;
  });

  dom.documentElement.removeAttribute('class');

  const article = new Readability(dom).parse();

  article.baseURI = dom.baseURI;
  article.pageTitle = dom.title;

  const url = new URL(dom.baseURI);
  article.hash = url.hash;
  article.host = url.host;
  article.origin = url.origin;
  article.hostname = url.hostname;
  article.pathname = url.pathname;
  article.port = url.port;
  article.protocol = url.protocol;
  article.search = url.search;

  if (dom.head) {
    article.keywords = dom.head.querySelector('meta[name="keywords"]')?.content?.split(',')?.map(s => s.trim());

    dom.head.querySelectorAll('meta[name][content], meta[property][content]')?.forEach(meta => {
      const key = (meta.getAttribute('name') || meta.getAttribute('property'));
      const val = meta.getAttribute('content');
      if (key && val && !article[key]) {
        article[key] = val;
      }
    });
  }

  article.math = math;

  return article;
}

// Get article from content script
async function getArticleFromContent(tabId, selection = false) {
  try {
    const results = await chrome.tabs.sendMessage(tabId, { type: "getSelectionAndDom" });

    if (results && results.dom) {
      const article = await getArticleFromDom(results.dom);

      if (selection && results.selection) {
        article.content = results.selection;
      }

      return article;
    }
  } catch (error) {
    console.error("Failed to get article from content:", error);
  }
  return null;
}

// Format title
async function formatTitle(article) {
  let options = await getOptions();

  let title = textReplace(options.title, article, options.disallowedChars + '/');
  title = title.split('/').map(s => generateValidFileName(s, options.disallowedChars)).join('/');
  return title;
}

// Format MD clips folder
async function formatMdClipsFolder(article) {
  let options = await getOptions();

  let mdClipsFolder = '';
  if (options.mdClipsFolder && options.downloadMode == 'downloadsApi') {
    mdClipsFolder = textReplace(options.mdClipsFolder, article, options.disallowedChars);
    mdClipsFolder = mdClipsFolder.split('/').map(s => generateValidFileName(s, options.disallowedChars)).join('/');
    if (!mdClipsFolder.endsWith('/')) mdClipsFolder += '/';
  }

  return mdClipsFolder;
}

// Format Obsidian folder
async function formatObsidianFolder(article) {
  let options = await getOptions();

  let obsidianFolder = '';
  if (options.obsidianFolder) {
    obsidianFolder = textReplace(options.obsidianFolder, article, options.disallowedChars);
    obsidianFolder = obsidianFolder.split('/').map(s => generateValidFileName(s, options.disallowedChars)).join('/');
    if (!obsidianFolder.endsWith('/')) obsidianFolder += '/';
  }

  return obsidianFolder;
}

// Download markdown from context menu
async function downloadMarkdownFromContext(info, tab) {
  const article = await getArticleFromContent(tab.id, info.menuItemId == "download-markdown-selection");
  if (!article) {
    console.error("Failed to get article");
    return;
  }

  const title = await formatTitle(article);
  const { markdown, imageList } = await convertArticleToMarkdown(article);
  const mdClipsFolder = await formatMdClipsFolder(article);
  await downloadMarkdown(markdown, title, tab.id, imageList, mdClipsFolder);
}

// Copy tab as markdown link
async function copyTabAsMarkdownLink(tab) {
  try {
    const article = await getArticleFromContent(tab.id);
    if (!article) return;

    const title = await formatTitle(article);
    const text = `[${title}](${article.baseURI})`;

    await chrome.tabs.sendMessage(tab.id, { type: "copyToClipboard", text: text });
  }
  catch (error) {
    console.error("Failed to copy as markdown link:", error);
  }
}

// Copy all tabs as markdown links
async function copyTabAsMarkdownLinkAll(tab) {
  try {
    const options = await getOptions();
    const tabs = await chrome.tabs.query({ currentWindow: true });

    const links = [];
    for (const t of tabs) {
      const article = await getArticleFromContent(t.id);
      if (article) {
        const title = await formatTitle(article);
        const link = `${options.bulletListMarker} [${title}](${article.baseURI})`;
        links.push(link);
      }
    }

    const markdown = links.join('\n');
    await chrome.tabs.sendMessage(tab.id, { type: "copyToClipboard", text: markdown });
  }
  catch (error) {
    console.error("Failed to copy as markdown links:", error);
  }
}

// Copy selected tabs as markdown links
async function copySelectedTabAsMarkdownLink(tab) {
  try {
    const options = await getOptions();
    const tabs = await chrome.tabs.query({ currentWindow: true, highlighted: true });

    const links = [];
    for (const t of tabs) {
      const article = await getArticleFromContent(t.id);
      if (article) {
        const title = await formatTitle(article);
        const link = `${options.bulletListMarker} [${title}](${article.baseURI})`;
        links.push(link);
      }
    }

    const markdown = links.join('\n');
    await chrome.tabs.sendMessage(tab.id, { type: "copyToClipboard", text: markdown });
  }
  catch (error) {
    console.error("Failed to copy as markdown links:", error);
  }
}

// Copy markdown from context menu
async function copyMarkdownFromContext(info, tab) {
  try {
    const options = await getOptions();

    if (info.menuItemId == "copy-markdown-link") {
      const article = await getArticleFromContent(tab.id, false);
      if (!article) return;

      const { markdown } = turndown(
        `<a href="${escapeHtml(info.linkUrl)}">${escapeHtml(info.linkText || info.selectionText || '')}</a>`,
        { ...options, downloadImages: false, frontmatter: '', backmatter: '' },
        article
      );
      await chrome.tabs.sendMessage(tab.id, { type: "copyToClipboard", text: markdown });
    }
    else if (info.menuItemId == "copy-markdown-image") {
      const text = `![](${info.srcUrl})`;
      await chrome.tabs.sendMessage(tab.id, { type: "copyToClipboard", text: text });
    }
    else if (info.menuItemId == "copy-markdown-obsidian") {
      const article = await getArticleFromContent(tab.id, true);
      if (!article) return;

      const title = await formatTitle(article);
      const obsidianVault = options.obsidianVault;
      const obsidianFolder = await formatObsidianFolder(article);
      const { markdown } = await convertArticleToMarkdown(article, false);

      await chrome.tabs.sendMessage(tab.id, { type: "copyToClipboard", text: markdown });
      await chrome.tabs.update(tab.id, {
        url: "obsidian://advanced-uri?vault=" + encodeURIComponent(obsidianVault) +
             "&clipboard=true&mode=new&filepath=" + encodeURIComponent(obsidianFolder + generateValidFileName(title))
      });
    }
    else if (info.menuItemId == "copy-markdown-obsall") {
      const article = await getArticleFromContent(tab.id, false);
      if (!article) return;

      const title = await formatTitle(article);
      const obsidianVault = options.obsidianVault;
      const obsidianFolder = await formatObsidianFolder(article);
      const { markdown } = await convertArticleToMarkdown(article, false);

      await chrome.tabs.sendMessage(tab.id, { type: "copyToClipboard", text: markdown });
      await chrome.tabs.update(tab.id, {
        url: "obsidian://advanced-uri?vault=" + encodeURIComponent(obsidianVault) +
             "&clipboard=true&mode=new&filepath=" + encodeURIComponent(obsidianFolder + generateValidFileName(title))
      });
    }
    else {
      const article = await getArticleFromContent(tab.id, info.menuItemId == "copy-markdown-selection");
      if (!article) return;

      const { markdown } = await convertArticleToMarkdown(article, false);
      await chrome.tabs.sendMessage(tab.id, { type: "copyToClipboard", text: markdown });
    }
  }
  catch (error) {
    console.error("Failed to copy text:", error);
  }
}

// Download markdown for all tabs
async function downloadMarkdownForAllTabs(info) {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  for (const tab of tabs) {
    await downloadMarkdownFromContext(info, tab);
  }
}

// Helper function to escape HTML for safe insertion
function escapeHtml(text) {
  if (!text) return '';
  const div = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => div[m]);
}
