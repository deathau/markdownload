// Content script: runs in the tab context where document IS available.
// Injected on demand by background.js via chrome.scripting.executeScript.

function getArticleFromCurrentPage(selection) {
  // Clone the live document — Readability modifies the DOM in place
  const dom = document.cloneNode(true);

  const math = {};

  const storeMathInfo = (el, mathInfo) => {
    let randomId = URL.createObjectURL(new Blob([]));
    randomId = randomId.substring(randomId.length - 36);
    el.id = randomId;
    math[randomId] = mathInfo;
  };

  dom.body.querySelectorAll('script[id^=MathJax-Element-]')?.forEach(mathSource => {
    const type = mathSource.attributes.type.value;
    storeMathInfo(mathSource, {
      tex: mathSource.innerText,
      inline: type ? !type.includes('mode=display') : false
    });
  });

  dom.body.querySelectorAll('[markdownload-latex]')?.forEach(mathJax3Node => {
    const tex = mathJax3Node.getAttribute('markdownload-latex');
    const display = mathJax3Node.getAttribute('display');
    const inline = !(display && display === 'true');

    const mathNode = document.createElement(inline ? 'i' : 'p');
    mathNode.textContent = tex;
    mathJax3Node.parentNode.insertBefore(mathNode, mathJax3Node.nextSibling);
    mathJax3Node.parentNode.removeChild(mathJax3Node);

    storeMathInfo(mathNode, {
      tex: tex,
      inline: inline
    });
  });

  dom.body.querySelectorAll('.katex-mathml')?.forEach(kaTeXNode => {
    storeMathInfo(kaTeXNode, {
      tex: kaTeXNode.querySelector('annotation').textContent,
      inline: true
    });
  });

  dom.body.querySelectorAll('[class*=highlight-text],[class*=highlight-source]')?.forEach(codeSource => {
    const language = codeSource.className.match(/highlight-(?:text|source)-([a-z0-9]+)/)?.[1];
    if (codeSource.firstChild.nodeName == 'PRE') {
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
    if (codeSource.firstChild.nodeName !== 'CODE' && !codeSource.className.includes('language')) {
      codeSource.id = `code-lang-text`;
    }
  });

  dom.body.querySelectorAll('h1, h2, h3, h4, h5, h6')?.forEach(header => {
    header.className = '';
    header.outerHTML = header.outerHTML;
  });

  dom.documentElement.removeAttribute('class');

  // Parse with Readability (injected before this script runs)
  const article = new Readability(dom).parse();

  // Attach URL metadata from the live document
  article.baseURI = document.baseURI;
  article.pageTitle = document.title;
  const url = new URL(document.baseURI);
  article.hash = url.hash;
  article.host = url.host;
  article.origin = url.origin;
  article.hostname = url.hostname;
  article.pathname = url.pathname;
  article.port = url.port;
  article.protocol = url.protocol;
  article.search = url.search;

  if (document.head) {
    article.keywords = document.head.querySelector('meta[name="keywords"]')?.content?.split(',')?.map(s => s.trim());

    document.head.querySelectorAll('meta[name][content], meta[property][content]')?.forEach(meta => {
      const key = (meta.getAttribute('name') || meta.getAttribute('property'));
      const val = meta.getAttribute('content');
      if (key && val && !article[key]) {
        article[key] = val;
      }
    });
  }

  article.math = math;

  // If selection mode and user has selected text, replace article content
  if (selection) {
    const sel = window.getSelection();
    if (sel && sel.toString().trim()) {
      article.content = sel.toString();
    }
  }

  return article;
}
