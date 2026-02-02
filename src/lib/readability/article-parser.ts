import { Readability } from '@mozilla/readability';
import type { Article, MathInfo } from '@/shared/types';

export function parseArticleFromDom(domString: string): Article {
  const parser = new DOMParser();
  const dom = parser.parseFromString(domString, 'text/html');

  if (dom.documentElement.nodeName === 'parsererror') {
    throw new Error('Failed to parse DOM');
  }

  const math: Record<string, MathInfo> = {};

  const storeMathInfo = (el: Element, mathInfo: MathInfo): void => {
    let randomId = URL.createObjectURL(new Blob([]));
    randomId = randomId.substring(randomId.length - 36);
    el.id = randomId;
    math[randomId] = mathInfo;
  };

  // Handle MathJax 2
  dom.body.querySelectorAll('script[id^=MathJax-Element-]')?.forEach((mathSource) => {
    const type = mathSource.getAttribute('type') || '';
    storeMathInfo(mathSource, {
      tex: mathSource.textContent || '',
      inline: type ? !type.includes('mode=display') : false,
    });
  });

  // Handle MathJax 3
  dom.body.querySelectorAll('[markdownload-latex]')?.forEach((mathJax3Node) => {
    const tex = mathJax3Node.getAttribute('markdownload-latex') || '';
    const display = mathJax3Node.getAttribute('display');
    const inline = !(display && display === 'true');

    const mathNode = document.createElement(inline ? 'i' : 'p');
    mathNode.textContent = tex;
    mathJax3Node.parentNode?.insertBefore(mathNode, mathJax3Node.nextSibling);
    mathJax3Node.parentNode?.removeChild(mathJax3Node);

    storeMathInfo(mathNode, { tex, inline });
  });

  // Handle KaTeX
  dom.body.querySelectorAll('.katex-mathml')?.forEach((kaTeXNode) => {
    const annotation = kaTeXNode.querySelector('annotation');
    storeMathInfo(kaTeXNode, {
      tex: annotation?.textContent || '',
      inline: true,
    });
  });

  // Handle code blocks with language hints
  dom.body
    .querySelectorAll('[class*=highlight-text],[class*=highlight-source]')
    ?.forEach((codeSource) => {
      const language = codeSource.className.match(
        /highlight-(?:text|source)-([a-z0-9]+)/
      )?.[1];
      const firstChild = codeSource.firstChild as HTMLElement;
      if (firstChild?.nodeName === 'PRE') {
        firstChild.id = `code-lang-${language}`;
      }
    });

  dom.body.querySelectorAll('[class*=language-]')?.forEach((codeSource) => {
    const language = codeSource.className.match(/language-([a-z0-9]+)/)?.[1];
    codeSource.id = `code-lang-${language}`;
  });

  // Preserve <br> in pre blocks
  dom.body.querySelectorAll('pre br')?.forEach((br) => {
    br.outerHTML = '<br-keep></br-keep>';
  });

  // Handle codehilite
  dom.body.querySelectorAll('.codehilite > pre')?.forEach((codeSource) => {
    const firstChild = codeSource.firstChild as HTMLElement;
    if (firstChild?.nodeName !== 'CODE' && !codeSource.className.includes('language')) {
      codeSource.id = 'code-lang-text';
    }
  });

  // Clean heading classNames (Readability bug workaround)
  dom.body.querySelectorAll('h1, h2, h3, h4, h5, h6')?.forEach((header) => {
    header.className = '';
    header.outerHTML = header.outerHTML;
  });

  // Clean document element class
  dom.documentElement.removeAttribute('class');

  // Run Readability
  const readabilityArticle = new Readability(dom).parse();

  if (!readabilityArticle) {
    throw new Error('Failed to parse article with Readability');
  }

  // Build article object
  const url = new URL(dom.baseURI);
  const article: Article = {
    title: readabilityArticle.title,
    content: readabilityArticle.content,
    textContent: readabilityArticle.textContent,
    length: readabilityArticle.length,
    excerpt: readabilityArticle.excerpt,
    byline: readabilityArticle.byline || '',
    dir: readabilityArticle.dir || '',
    siteName: readabilityArticle.siteName || '',
    lang: readabilityArticle.lang || '',
    baseURI: dom.baseURI,
    pageTitle: dom.title,
    hash: url.hash,
    host: url.host,
    origin: url.origin,
    hostname: url.hostname,
    pathname: url.pathname,
    port: url.port,
    protocol: url.protocol,
    search: url.search,
    math,
  };

  // Add keywords from meta
  if (dom.head) {
    const keywordsMeta = dom.head.querySelector('meta[name="keywords"]');
    if (keywordsMeta) {
      const content = keywordsMeta.getAttribute('content');
      if (content) {
        article.keywords = content.split(',').map((s) => s.trim());
      }
    }

    // Add all other meta tags
    dom.head
      .querySelectorAll('meta[name][content], meta[property][content]')
      ?.forEach((meta) => {
        const key = meta.getAttribute('name') || meta.getAttribute('property');
        const val = meta.getAttribute('content');
        if (key && val && !article[key]) {
          article[key] = val;
        }
      });
  }

  return article;
}
