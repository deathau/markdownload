// Runs in the tab's isolated world via executeScript — document/DOMParser always available.

function cleanAttribute(attribute) {
  return attribute ? attribute.replace(/(\n+\s*)+/g, '\n') : '';
}

function validateUri(href, baseURI) {
  try { new URL(href); }
  catch {
    const baseUri = new URL(baseURI);
    href = href.startsWith('/')
      ? baseUri.origin + href
      : baseUri.href + (baseUri.href.endsWith('/') ? '' : '/') + href;
  }
  return href;
}

function generateValidFileName(title, disallowedChars = null) {
  if (!title) return title;
  title = title + '';
  var name = title
    .replace(/[\/\?<>\\:\*\|":]/g, '')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (disallowedChars) {
    for (let c of disallowedChars) {
      if (`[\\^$.|?*+()`.includes(c)) c = `\\${c}`;
      name = name.replace(new RegExp(c, 'g'), '');
    }
  }
  return name;
}

function getImageFilename(src, options, prependFilePath = true) {
  const slashPos = src.lastIndexOf('/');
  const queryPos = src.indexOf('?');
  let filename = src.substring(slashPos + 1, queryPos > 0 ? queryPos : src.length);
  let imagePrefix = options.imagePrefix || '';
  if (prependFilePath && options.title && options.title.includes('/')) {
    imagePrefix = options.title.substring(0, options.title.lastIndexOf('/') + 1) + imagePrefix;
  } else if (prependFilePath && options.title) {
    imagePrefix = options.title + (imagePrefix.startsWith('/') ? '' : '/') + imagePrefix;
  }
  if (filename.includes(';base64,')) {
    filename = 'image.' + filename.substring(0, filename.indexOf(';'));
  }
  const extension = filename.substring(filename.lastIndexOf('.'));
  if (extension === filename) filename += '.idunno';
  filename = generateValidFileName(filename, options.disallowedChars);
  return imagePrefix + filename;
}

function turndownInPage(content, options, article) {
  // defaultEscape is set in background.js (SW context) but not in tab context — save it here if missing
  if (!TurndownService.prototype.defaultEscape) {
    TurndownService.prototype.defaultEscape = TurndownService.prototype.escape;
  }
  if (options.turndownEscape) TurndownService.prototype.escape = TurndownService.prototype.defaultEscape;
  else TurndownService.prototype.escape = s => s;

  const turndownService = new TurndownService(options);
  turndownService.use(turndownPluginGfm.gfm);
  turndownService.keep(['iframe', 'sub', 'sup', 'u', 'ins', 'del', 'small', 'big']);

  const imageList = {};

  turndownService.addRule('images', {
    filter(node) {
      if (node.nodeName === 'IMG' && node.getAttribute('src')) {
        const src = node.getAttribute('src');
        node.setAttribute('src', validateUri(src, article.baseURI));
        if (options.downloadImages) {
          let imageFilename = getImageFilename(src, options, false);
          if (!imageList[src] || imageList[src] !== imageFilename) {
            let i = 1;
            while (Object.values(imageList).includes(imageFilename)) {
              const parts = imageFilename.split('.');
              if (i === 1) parts.splice(parts.length - 1, 0, i++);
              else parts.splice(parts.length - 2, 1, i++);
              imageFilename = parts.join('.');
            }
            imageList[src] = imageFilename;
          }
          const obsidianLink = options.imageStyle.startsWith('obsidian');
          const localSrc = options.imageStyle === 'obsidian-nofolder'
            ? imageFilename.substring(imageFilename.lastIndexOf('/') + 1)
            : imageFilename.split('/').map(s => obsidianLink ? s : encodeURI(s)).join('/');
          if (options.imageStyle !== 'originalSource' && options.imageStyle !== 'base64')
            node.setAttribute('src', localSrc);
        }
        return true;
      }
      return false;
    },
    replacement(content, node) {
      if (options.imageStyle === 'noImage') return '';
      if (options.imageStyle.startsWith('obsidian')) return `![[${node.getAttribute('src')}]]`;
      const alt = cleanAttribute(node.getAttribute('alt'));
      const src = node.getAttribute('src') || '';
      const title = cleanAttribute(node.getAttribute('title'));
      const titlePart = title ? ' "' + title + '"' : '';
      if (options.imageRefStyle === 'referenced') {
        const id = this.references.length + 1;
        this.references.push('[fig' + id + ']: ' + src + titlePart);
        return '![' + alt + '][fig' + id + ']';
      }
      return src ? '![' + alt + '](' + src + titlePart + ')' : '';
    },
    references: [],
    append() {
      let refs = '';
      if (this.references.length) { refs = '\n\n' + this.references.join('\n') + '\n\n'; this.references = []; }
      return refs;
    }
  });

  turndownService.addRule('links', {
    filter(node) {
      if (node.nodeName === 'A' && node.getAttribute('href')) {
        node.setAttribute('href', validateUri(node.getAttribute('href'), article.baseURI));
        return options.linkStyle === 'stripLinks';
      }
      return false;
    },
    replacement: (content) => content
  });

  turndownService.addRule('mathjax', {
    filter: (node) => article.math && Object.prototype.hasOwnProperty.call(article.math, node.id),
    replacement(content, node) {
      const math = article.math[node.id];
      let tex = math.tex.trim().replaceAll('\xa0', '');
      if (math.inline) { tex = tex.replaceAll('\n', ' '); return `$${tex}$`; }
      return `$$\n${tex}\n$$`;
    }
  });

  function repeat(ch, n) { return Array(n + 1).join(ch); }

  function convertToFencedCodeBlock(node, opts) {
    node.innerHTML = node.innerHTML.replaceAll('<br-keep></br-keep>', '<br>');
    const langMatch = node.id && node.id.match(/code-lang-(.+)/);
    const language = langMatch ? langMatch[1] : '';
    const code = node.innerText;
    const fenceChar = opts.fence.charAt(0);
    let fenceSize = 3;
    const re = new RegExp('^' + fenceChar + '{3,}', 'gm');
    let m;
    while ((m = re.exec(code))) { if (m[0].length >= fenceSize) fenceSize = m[0].length + 1; }
    const fence = repeat(fenceChar, fenceSize);
    return '\n\n' + fence + language + '\n' + code.replace(/\n$/, '') + '\n' + fence + '\n\n';
  }

  turndownService.addRule('fencedCodeBlock', {
    filter: (node, opts) =>
      opts.codeBlockStyle === 'fenced' && node.nodeName === 'PRE' &&
      node.firstChild && node.firstChild.nodeName === 'CODE',
    replacement: (content, node, opts) => convertToFencedCodeBlock(node.firstChild, opts)
  });

  turndownService.addRule('pre', {
    filter: (node) =>
      node.nodeName === 'PRE' &&
      (!node.firstChild || node.firstChild.nodeName !== 'CODE') &&
      !node.querySelector('img'),
    replacement: (content, node, opts) => convertToFencedCodeBlock(node, opts)
  });

  // Parse HTML here (page context always has DOMParser) and pass DOM node to
  // TurndownService — bypasses turndown's internal htmlParser() which fails in SW.
  let inputNode;
  try {
    const doc = new DOMParser().parseFromString(
      '<x-md id="td-root">' + content + '</x-md>', 'text/html'
    );
    inputNode = doc.getElementById('td-root') || doc.body;
  } catch (e) {
    inputNode = content; // fallback: let turndown try with the string
  }

  let markdown = options.frontmatter + turndownService.turndown(inputNode) + options.backmatter;
  markdown = markdown.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028\u2029\ufeff\ufff9-\ufffc]/g, '');
  return { markdown, imageList };
}
