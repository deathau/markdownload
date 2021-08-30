// these are the default options
const defaultOptions = {
  headingStyle: "atx",
  hr: "___",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  fence: "```",
  emDelimiter: "_",
  strongDelimiter: "**",
  linkStyle: "inlined",
  linkReferenceStyle: "full",
  imageStyle: "markdown",
  frontmatter: "---\ncreated: {date:YYYY-MM-DDTHH:mm:ss} (UTC {date:Z})\ntags: [{keywords}]\nsource: {baseURI}\nauthor: {byline}\n---\n\n# {pageTitle}\n\n> ## Excerpt\n> {excerpt}\n\n---",
  backmatter: "",
  title: "{title}",
  includeTemplate: false,
  saveAs: false,
  downloadImages: false,
  imagePrefix: '{title}/',
  mdClipsFolder: null,
  disallowedChars: '[]#^',
  downloadMode: 'downloadsApi',
  turndownEscape: true,
  // obsidianVault: null,
  // obsidianPathType: 'name'
}

// add notification listener for foreground page messages
browser.runtime.onMessage.addListener(notify);
// create context menus
createMenus();

TurndownService.prototype.defaultEscape = TurndownService.prototype.escape;

// function to convert the article content to markdown using Turndown
function turndown(content, options, article) {
  if (options.turndownEscape) TurndownService.prototype.escape = TurndownService.prototype.defaultEscape;
  else TurndownService.prototype.escape = s => s;

  var turndownService = new TurndownService(options);

  turndownService.keep(['iframe']);

  let imageList = {};
  // add an image rule
  turndownService.addRule('images', {
    filter: function (node, tdopts) {
      // if we're looking at an img node with a src
      if (node.nodeName == 'IMG' && node.getAttribute('src')) {

        // get the original src
        let src = node.getAttribute('src')
        // set the new src
        node.setAttribute('src', validateUri(src, article.baseURI));

        // if we're downloading images, there's more to do.
        if (options.downloadImages) {
          // generate a file name for the image
          let imageFilename = getImageFilename(src, options, false);
          if (!imageList[src] || imageList[src] != imageFilename) {
            // if the imageList already contains this file, add a number to differentiate
            let i = 1;
            while (Object.values(imageList).includes(imageFilename)) {
              const parts = imageFilename.split('.');
              if (i == 1) parts.splice(parts.length - 1, 0, i++);
              else parts.splice(parts.length - 2, 1, i++);
              imageFilename = parts.join('.');
            }
            // add it to the list of images to download later
            imageList[src] = imageFilename;
          }
          // check if we're doing an obsidian style link
          const obsidianLink = options.imageStyle.startsWith("obsidian");
          // figure out the (local) src of the image
          const localSrc = options.imageStyle === 'obsidian-nofolder'
            // if using "nofolder" then we just need the filename, no folder
            ? imageFilename.substring(imageFilename.lastIndexOf('/') + 1)
            // otherwise we may need to modify the filename to uri encode parts for a pure markdown link
            : imageFilename.split('/').map(s => obsidianLink ? s : encodeURI(s)).join('/')

          // set the new src attribute to be the local filename
          if (options.imageStyle != 'originalSource') node.setAttribute('src', localSrc);
          // pass the filter if we're making an obsidian link (or stripping links)
          return obsidianLink || options.imageStyle == 'noImage';
        }
        else return options.imageStyle == 'noImage'
      }
      // don't pass the filter, just output a normal markdown link
      return false;
    },
    replacement: function (content, node, tdopts) {
      // if we're stripping images, output nothing
      if (options.imageStyle == 'noImage') return '';
      // otherwise, this must be an obsidian link, so output that
      else return `![[${node.getAttribute('src')}]]`;
    }

  });

  // add a rule for links
  turndownService.addRule('links', {
    filter: (node, tdopts) => {
      // check that this is indeed a link
      if (node.nodeName == 'A' && node.getAttribute('href')) {
        // get the href
        const href = node.getAttribute('href');
        // set the new href
        node.setAttribute('href', validateUri(href, article.baseURI));
        // if we are to strip links, the filter needs to pass
        return options.linkStyle == 'stripLinks';
      }
      // we're not passing the filter, just do the normal thing.
      return false;
    },
    // if the filter passes, we're stripping links, so just return the content
    replacement: (content, node, tdopts) => content
  });

  // handle multiple lines math
  turndownService.addRule('mathjax', {
    filter(node, options) {
      const id = node.id || ''
      return id.startsWith('MathJax-Element')
    },
    replacement(content, node, options) {
      const mathId = node.id.match(/MathJax-Element-(\d+)/)[1]
      const math = article.math[mathId]
      if (math.inline)
        return `$${math.tex}$`
      else
        return `$$\n${math.tex}\n$$`
    }
  })


  let markdown = options.frontmatter + turndownService.turndown(content)
    + options.backmatter;

  // strip out non-printing special characters which CodeMirror displays as a red dot
  // see: https://codemirror.net/doc/manual.html#option_specialChars
  markdown = markdown.replace(/[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028\u2029\ufeff\ufff9-\ufffc]/g, '');

  return { markdown: markdown, imageList: imageList };
}

function validateUri(href, baseURI) {
  // check if the href is a valid url
  try {
    new URL(href);
  }
  catch {
    // if it's not a valid url, that likely means we have to prepend the base uri
    const baseUri = new URL(baseURI);

    // if the href starts with '/', we need to go from the origin
    if (href.startsWith('/')) {
      href = baseUri.origin + href
    }
    // otherwise we need to go from the local folder
    else {
      href = baseUri.href + (baseUri.href.endsWith('/') ? '/' : '') + href
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
    imagePrefix = options.title + (imagePrefix.startsWith('/') ? '' : '/') + imagePrefix
  }

  if (filename.includes(';base64,')) {
    // this is a base64 encoded image, so what are we going to do for a filename here?
    filename = 'image.' + filename.substring(0, filename.indexOf(';'));
  }

  let extension = filename.substring(filename.lastIndexOf('.'));
  if (extension == filename) {
    // there is no extension, so we need to figure one out
    // for now, give it an 'idunno' extension and we'll process it later
    filename = filename + '.idunno';
  }

  filename = generateValidFileName(filename, options.disallowedChars);

  return imagePrefix + filename;
}

// function to replace placeholder strings with article info
function textReplace(string, article, disallowedChars = null) {
  for (const key in article) {
    if (article.hasOwnProperty(key) && key != "content") {
      let s = (article[key] || '') + '';
      if (s && disallowedChars) s = s.split('/').map(x => this.generateValidFileName(x, disallowedChars)).join('/');
      string = string.split('{' + key + '}').join(s);
    }
  }

  // replace date formats
  const now = new Date();
  const dateRegex = /{date:(.+?)}/g
  const matches = string.match(dateRegex);
  if (matches && matches.forEach) {
    matches.forEach(match => {
      const format = match.substring(6, match.length - 1);
      const dateString = moment(now).format(format);
      string = string.replace(new RegExp(match, 'g'), dateString);
    });
  }

  // replace keywords
  const keywordRegex = /{keywords:?(.*)?}/g
  const keywordMatches = string.match(keywordRegex);
  if (keywordMatches && keywordMatches.forEach) {
    keywordMatches.forEach(match => {
      let seperator = match.substring(10, match.length - 1)
      try {
        seperator = JSON.parse(JSON.stringify(seperator).replace(/\\\\/g, '\\'));
      }
      catch { }
      const keywordsString = (article.keywords || []).join(seperator);
      string = string.replace(new RegExp(match.replace(/\\/g, '\\\\'), 'g'), keywordsString);
    })
  }

  return string;
}

// function to get the options from storage and substitute default options if it fails
async function getOptions() {
  let options = defaultOptions;
  try {
    options = await browser.storage.sync.get(defaultOptions);
  } catch (err) {
    console.error(err);
  }
  if (!browser.downloads) options.downloadMode = 'contentLink';
  return options;
}

// function to convert an article info object into markdown
async function convertArticleToMarkdown(article, downloadImages = null) {
  const options = await getOptions();
  if (downloadImages != null) {
    options.downloadImages = downloadImages;
  }

  // substitute front and backmatter templates if necessary
  if (options.includeTemplate) {
    options.frontmatter = textReplace(options.frontmatter, article) + '\n';
    options.backmatter = '\n' + textReplace(options.backmatter, article);
  }
  else {
    options.frontmatter = options.backmatter = '';
  }

  options.imagePrefix = textReplace(options.imagePrefix, article, options.disallowedChars)
    .split('/').map(s => generateValidFileName(s, options.disallowedChars)).join('/');

  let result = turndown(article.content, options, article);
  if (options.downloadImages && options.downloadMode == 'downloadsApi') {
    // pre-download the images
    result = await preDownloadImages(result.imageList, result.markdown);
  }
  return result;
}

// function to turn the title into a valid file name
function generateValidFileName(title, disallowedChars = null) {
  if (!title) return title;
  else title = title + '';
  // remove < > : " / \ | ? * 
  var illegalRe = /[\/\?<>\\:\*\|":]/g;
  // and non-breaking spaces (thanks @Licat)
  var name = title.replace(illegalRe, "").replace(new RegExp('\u00A0', 'g'), ' ');

  if (disallowedChars) {
    for (let c of disallowedChars) {
      if (`[\\^$.|?*+()`.includes(c)) c = `\\${c}`;
      name = name.replace(new RegExp(c, 'g'), '');
    }
  }

  return name;
}

async function preDownloadImages(imageList, markdown) {
  const options = await getOptions();
  let newImageList = {};
  // originally, I was downloading the markdown file first, then all the images
  // however, in some cases we need to download images *first* so we can get the
  // proper file extension to put into the markdown.
  // so... here we are waiting for all the downloads and replacements to complete
  await Promise.all(Object.entries(imageList).map(([src, filename]) => new Promise((resolve, reject) => {
    // we're doing an xhr so we can get it as a blob and determine filetype
    // before the final save
    const xhr = new XMLHttpRequest();
    xhr.open('GET', src);
    xhr.responseType = "blob";
    xhr.onload = async function () {
      // here's the returned blob
      const blob = xhr.response;
      let newFilename = filename;
      if (newFilename.endsWith('.idunno')) {
        // replace any unknown extension with a lookup based on mime type
        newFilename = filename.replace('.idunno', '.' + mimedb[blob.type]);

        // and replace any instances of this in the markdown
        // remember to url encode for replacement if it's not an obsidian link
        if (!options.imageStyle.startsWith("obsidian")) {
          markdown = markdown.replaceAll(filename.split('/').map(s => encodeURI(s)).join('/'), newFilename.split('/').map(s => encodeURI(s)).join('/'))
        }
        else {
          markdown = markdown.replaceAll(filename, newFilename)
        }
      }

      // create an object url for the blob (no point fetching it twice)
      const blobUrl = URL.createObjectURL(blob);

      // add this blob into the new image list
      newImageList[blobUrl] = newFilename;

      // resolve this promise now
      // (the file might not be saved yet, but the blob is and replacements are complete)
      resolve();
    };
    xhr.onerror = function () {
      reject('A network error occurred attempting to download ' + src);
    };
    xhr.send();
  })));

  return { imageList: newImageList, markdown: markdown };
}

// function to actually download the markdown file
async function downloadMarkdown(markdown, title, tabId, imageList = {}, mdClipsFolder = '') {
  // get the options
  const options = await getOptions();

  // download via the downloads API
  if (options.downloadMode == 'downloadsApi' && browser.downloads) {

    // create the object url with markdown data as a blob
    const url = URL.createObjectURL(new Blob([markdown], {
      type: "text/markdown;charset=utf-8"
    }));

    try {
      // start the download
      const id = await browser.downloads.download({
        url: url,
        filename: mdClipsFolder + title + ".md",
        saveAs: options.saveAs
      });

      // add a listener for the download completion
      browser.downloads.onChanged.addListener(downloadListener(id, url));

      // download images (if enabled)
      if (options.downloadImages) {
        // get the relative path of the markdown file (if any) for image path
        const destPath = mdClipsFolder + title.substring(0, title.lastIndexOf('/'));
        Object.entries(imageList).forEach(async ([src, filename]) => {
          // start the download of the image
          const imgId = await browser.downloads.download({
            url: src,
            // set a destination path (relative to md file)
            filename: destPath ? destPath + '/' + filename : filename,
            saveAs: false
          })
          // add a listener (so we can release the blob url)
          browser.downloads.onChanged.addListener(downloadListener(imgId, src));
        });
      }
    }
    catch (err) {
      console.error("Download failed", err);
    }
  }
  // // download via obsidian://new uri
  // else if (options.downloadMode == 'obsidianUri') {
  //   try {
  //     await ensureScripts(tabId);
  //     let uri = 'obsidian://new?';
  //     uri += `${options.obsidianPathType}=${encodeURIComponent(title)}`;
  //     if (options.obsidianVault) uri += `&vault=${encodeURIComponent(options.obsidianVault)}`;
  //     uri += `&content=${encodeURIComponent(markdown)}`;
  //     let code = `window.location='${uri}'`;
  //     await browser.tabs.executeScript(tabId, {code: code});
  //   }
  //   catch (error) {
  //     // This could happen if the extension is not allowed to run code in
  //     // the page, for example if the tab is a privileged page.
  //     console.error("Failed to execute script: " + error);
  //   };

  // }
  // download via content link
  else {
    try {
      await ensureScripts(tabId);
      const filename = mdClipsFolder + generateValidFileName(title, options.disallowedChars) + ".md";
      const code = `downloadMarkdown("${filename}","${base64EncodeUnicode(markdown)}");`
      await browser.tabs.executeScript(tabId, { code: code });
    }
    catch (error) {
      // This could happen if the extension is not allowed to run code in
      // the page, for example if the tab is a privileged page.
      console.error("Failed to execute script: " + error);
    };
  }
}

function downloadListener(id, url) {
  const self = (delta) => {
    if (delta.id === id && delta.state && delta.state.current == "complete") {
      // detatch this listener
      browser.downloads.onChanged.removeListener(self);
      //release the url for the blob
      URL.revokeObjectURL(url);
    }
  }
  return self;
}

function base64EncodeUnicode(str) {
  // Firstly, escape the string using encodeURIComponent to get the UTF-8 encoding of the characters, 
  // Secondly, we convert the percent encodings into raw bytes, and add it to btoa() function.
  const utf8Bytes = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
    return String.fromCharCode('0x' + p1);
  });

  return btoa(utf8Bytes);
}

//function that handles messages from the injected script into the site
async function notify(message) {
  const options = await this.getOptions();
  // message for initial clipping of the dom
  if (message.type == "clip") {
    // get the article info from the passed in dom
    const article = await getArticleFromDom(message.dom);

    // if selection info was passed in (and we're to clip the selection)
    // replace the article content
    if (message.selection && message.clipSelection) {
      article.content = message.selection;
    }

    // convert the article to markdown
    const { markdown, imageList } = await convertArticleToMarkdown(article);

    // format the title
    article.title = await formatTitle(article);

    // format the mdClipsFolder
    const mdClipsFolder = await formatMdClipsFolder(article);

    // display the data in the popup
    await browser.runtime.sendMessage({ type: "display.md", markdown: markdown, article: article, imageList: imageList, mdClipsFolder: mdClipsFolder });
  }
  // message for triggering download
  else if (message.type == "download") {
    downloadMarkdown(message.markdown, message.title, message.tab.id, message.imageList, message.mdClipsFolder);
  }
}

// create the context menus
async function createMenus() {
  const options = await getOptions();

  browser.contextMenus.removeAll();

  // tab menu (chrome does not support this)
  try {
    browser.contextMenus.create({
      id: "download-markdown-tab",
      title: "Download Tab as Markdown",
      contexts: ["tab"]
    }, () => { });

    browser.contextMenus.create({
      id: "tab-download-markdown-alltabs",
      title: "Download All Tabs as Markdown",
      contexts: ["tab"]
    }, () => { });

    browser.contextMenus.create({
      id: "copy-tab-as-markdown-link-tab",
      title: "Copy Tab URL as Markdown Link",
      contexts: ["tab"]
    }, () => { });

    browser.contextMenus.create({
      id: "tab-separator-1",
      type: "separator",
      contexts: ["tab"]
    }, () => { });

    browser.contextMenus.create({
      id: "tabtoggle-includeTemplate",
      type: "checkbox",
      title: "Include front/back template",
      contexts: ["tab"],
      checked: options.includeTemplate
    }, () => { });
  } catch {

  }
  // add the download all tabs option to the page context menu as well
  browser.contextMenus.create({
    id: "download-markdown-alltabs",
    title: "Download All Tabs as Markdown",
    contexts: ["all"]
  }, () => { });
  browser.contextMenus.create({
    id: "separator-0",
    type: "separator",
    contexts: ["all"]
  }, () => { });

  // download actions
  browser.contextMenus.create({
    id: "download-markdown-selection",
    title: "Download Selection As Markdown",
    contexts: ["selection"]
  }, () => { });
  browser.contextMenus.create({
    id: "download-markdown-all",
    title: "Download Tab As Markdown",
    contexts: ["all"]
  }, () => { });

  browser.contextMenus.create({
    id: "separator-1",
    type: "separator",
    contexts: ["all"]
  }, () => { });

  // copy to clipboard actions
  browser.contextMenus.create({
    id: "copy-markdown-selection",
    title: "Copy Selection As Markdown",
    contexts: ["selection"]
  }, () => { });
  browser.contextMenus.create({
    id: "copy-markdown-link",
    title: "Copy Link As Markdown",
    contexts: ["link"]
  }, () => { });
  browser.contextMenus.create({
    id: "copy-markdown-image",
    title: "Copy Image As Markdown",
    contexts: ["image"]
  }, () => { });
  browser.contextMenus.create({
    id: "copy-markdown-all",
    title: "Copy Tab As Markdown",
    contexts: ["all"]
  }, () => { });
  browser.contextMenus.create({
    id: "copy-tab-as-markdown-link",
    title: "Copy Tab URL as Markdown Link",
    contexts: ["all"]
  }, () => { });

  browser.contextMenus.create({
    id: "separator-2",
    type: "separator",
    contexts: ["all"]
  }, () => { });

  // options
  browser.contextMenus.create({
    id: "toggle-includeTemplate",
    type: "checkbox",
    title: "Include front/back template",
    contexts: ["all"],
    checked: options.includeTemplate
  }, () => { });
}

browser.commands.onCommand.addListener(function (command) {
  if (command == "download_tab_as_markdown") {
    const tab = browser.tabs.getCurrent()
    const info = { menuItemId: "download-markdown-all" };
    downloadMarkdownFromContext(info, tab);
  }
});

// click handler for the context menus
browser.contextMenus.onClicked.addListener(function (info, tab) {
  // one of the copy to clipboard commands
  if (info.menuItemId.startsWith("copy-markdown")) {
    copyMarkdownFromContext(info, tab);
  }
  else if (info.menuItemId == "download-markdown-alltabs" || info.menuItemId == "tab-download-markdown-alltabs") {
    downloadMarkdownForAllTabs(info);
  }
  // one of the download commands
  else if (info.menuItemId.startsWith("download-markdown")) {
    downloadMarkdownFromContext(info, tab);
  }
  // copy tab as markdown link
  else if (info.menuItemId.startsWith("copy-tab-as-markdown-link")) {
    copyTabAsMarkdownLink(tab);
  }
  // a settings toggle command
  else if (info.menuItemId.startsWith("toggle-") || info.menuItemId.startsWith("tabtoggle-")) {
    toggleSetting(info.menuItemId.split('-')[1]);
  }
});

// this function toggles the specified option
async function toggleSetting(setting, options = null) {
  // if there's no options object passed in, we need to go get one
  if (options == null) {
    // get the options from storage and toggle the setting
    await toggleSetting(setting, await getOptions());
  }
  else {
    // toggle the option and save back to storage
    options[setting] = !options[setting];
    await browser.storage.sync.set(options);
    if (setting == "includeTemplate") {
      browser.contextMenus.update("toggle-includeTemplate", {
        checked: options.includeTemplate
      });
      try {
        browser.contextMenus.update("tabtoggle-includeTemplate", {
          checked: options.includeTemplate
        });
      } catch { }
    }
  }
}

// this function ensures the content script is loaded (and loads it if it isn't)
async function ensureScripts(tabId) {
  const results = await browser.tabs.executeScript(tabId, { code: "typeof getSelectionAndDom === 'function';" })
  // The content script's last expression will be true if the function
  // has been defined. If this is not the case, then we need to run
  // pageScraper.js to define function getSelectionAndDom.
  if (!results || results[0] !== true) {
    await browser.tabs.executeScript(tabId, { file: "/contentScript/contentScript.js" });
  }
}

// get Readability article info from the dom passed in
async function getArticleFromDom(domString) {
  // parse the dom
  const parser = new DOMParser();
  const dom = parser.parseFromString(domString, "text/html");
  if (dom.documentElement.nodeName == "parsererror") {
    console.error("error while parsing");
  }

  const math = {}
  dom.body.querySelectorAll('script[id^=MathJax-Element-]')?.forEach(mathSource => {
    const mathId = mathSource.id.match(/MathJax-Element-(\d+)/)[1]
    if (mathId) {
      let tex = mathSource.innerText.trim()
      tex = tex.replaceAll("\xa0", " ")

      const type = mathSource.attributes.type.value
      math[mathId] = {
        tex,
        inline: type ? !type.includes('mode=display') : false
      };
    }
  })

  // simplify the dom into an article
  const article = new Readability(dom).parse();
  // get the base uri from the dom and attach it as important article info
  article.baseURI = dom.baseURI;
  // also grab the page title
  article.pageTitle = dom.title;

  // and the keywords, should they exist, as an array
  article.keywords = dom.head.querySelector('meta[name="keywords"]')?.content?.split(',')?.map(s => s.trim());

  // add all meta tags, so users can do whatever they want
  dom.head.querySelectorAll('meta[name][content]')?.forEach(meta => {
    if (meta.name && meta.content && !article[meta.name]) {
      article[meta.name] = meta.content;
    }
  })

  article.math = math

  // return the article
  return article;
}

// get Readability article info from the content of the tab id passed in
// `selection` is a bool indicating whether we should just get the selected text
async function getArticleFromContent(tabId, selection = false) {
  // run the content script function to get the details
  const results = await browser.tabs.executeScript(tabId, { code: "getSelectionAndDom()" });

  // make sure we actually got a valid result
  if (results && results[0] && results[0].dom) {
    const article = await getArticleFromDom(results[0].dom, selection);

    // if we're to grab the selection, and we've selected something,
    // replace the article content with the selection
    if (selection && results[0].selection) {
      article.content = results[0].selection;
    }

    //return the article
    return article;
  }
  else return null;
}

// function to apply the title template
async function formatTitle(article) {
  let options = await getOptions();

  let title = textReplace(options.title, article, options.disallowedChars);
  title = title.split('/').map(s => generateValidFileName(s, options.disallowedChars)).join('/');
  return title;
}

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

// function to download markdown, triggered by context menu
async function downloadMarkdownFromContext(info, tab) {
  await ensureScripts(tab.id);
  const article = await getArticleFromContent(tab.id, info.menuItemId == "download-markdown-selection");
  const title = await formatTitle(article);
  const { markdown, imageList } = await convertArticleToMarkdown(article);
  // format the mdClipsFolder
  const mdClipsFolder = await formatMdClipsFolder(article);
  await downloadMarkdown(markdown, title, tab.id, imageList, mdClipsFolder);

}

// function to copy a tab url as a markdown link
async function copyTabAsMarkdownLink(tab) {
  try {
    await ensureScripts(tab.id);
    const article = await getArticleFromContent(tab.id);
    const title = await formatTitle(article);
    //await browser.tabs.executeScript(tab.id, { code: `copyToClipboard("[${title}](${article.baseURI})")` });
    await navigator.clipboard.writeText(`[${title}](${article.baseURI})`);
  }
  catch (error) {
    // This could happen if the extension is not allowed to run code in
    // the page, for example if the tab is a privileged page.
    console.error("Failed to copy as markdown link: " + error);
  };
}

// function to copy markdown to the clipboard, triggered by context menu
async function copyMarkdownFromContext(info, tab) {
  try {
    await ensureScripts(tab.id);
    if (info.menuItemId == "copy-markdown-link") {
      const options = await getOptions();
      options.frontmatter = options.backmatter = '';
      const article = await getArticleFromContent(tab.id, false);
      const { markdown } = turndown(`<a href="${info.linkUrl}">${info.linkText || info.selectionText}</a>`, { ...options, downloadImages: false }, article);
      await browser.tabs.executeScript(tab.id, { code: `copyToClipboard(${JSON.stringify(markdown)})` });
    }
    else if (info.menuItemId == "copy-markdown-image") {
      await browser.tabs.executeScript(tab.id, { code: `copyToClipboard("![](${info.srcUrl})")` });
    }
    else {
      const article = await getArticleFromContent(tab.id, info.menuItemId == "copy-markdown-selection");
      const { markdown } = await convertArticleToMarkdown(article, downloadImages = false);
      await browser.tabs.executeScript(tab.id, { code: `copyToClipboard(${JSON.stringify(markdown)})` });
    }
  }
  catch (error) {
    // This could happen if the extension is not allowed to run code in
    // the page, for example if the tab is a privileged page.
    console.error("Failed to copy text: " + error);
  };
}

async function downloadMarkdownForAllTabs(info) {
  const tabs = await browser.tabs.query({
    currentWindow: true
  });
  tabs.forEach(tab => {
    downloadMarkdownFromContext(info, tab);
  });
}

/**
 * String.prototype.replaceAll() polyfill
 * https://gomakethings.com/how-to-replace-a-section-of-a-string-with-another-one-with-vanilla-js/
 * @author Chris Ferdinandi
 * @license MIT
 */
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function (str, newStr) {

    // If a regex pattern
    if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') {
      return this.replace(str, newStr);
    }

    // If a string
    return this.replace(new RegExp(str, 'g'), newStr);

  };
}
