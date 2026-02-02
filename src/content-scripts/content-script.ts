import browser from 'webextension-polyfill';
import type { SelectionAndDom } from '@/shared/types';

declare global {
  interface Window {
    getSelectionAndDom: () => SelectionAndDom;
    copyToClipboard: (text: string) => void;
    downloadMarkdown: (filename: string, text: string) => void;
  }
}

function getHTMLOfDocument(): string {
  if (document.head.getElementsByTagName('title').length === 0) {
    const titleEl = document.createElement('title');
    titleEl.innerText = document.title;
    document.head.append(titleEl);
  }

  const baseEls = document.head.getElementsByTagName('base');
  let baseEl: HTMLBaseElement;

  if (baseEls.length > 0) {
    baseEl = baseEls[0];
  } else {
    baseEl = document.createElement('base');
    document.head.append(baseEl);
  }

  const href = baseEl.getAttribute('href');

  if (!href || !href.startsWith(window.location.origin)) {
    baseEl.setAttribute('href', window.location.href);
  }

  removeHiddenNodes(document.body);

  return document.documentElement.outerHTML;
}

function removeHiddenNodes(root: HTMLElement): HTMLElement {
  const nodeIterator = document.createNodeIterator(
    root,
    NodeFilter.SHOW_ELEMENT,
    (node: Node) => {
      const element = node as HTMLElement;
      const nodeName = element.nodeName.toLowerCase();

      if (
        nodeName === 'script' ||
        nodeName === 'style' ||
        nodeName === 'noscript' ||
        nodeName === 'math'
      ) {
        return NodeFilter.FILTER_REJECT;
      }

      if ((element as HTMLElement).offsetParent === undefined) {
        return NodeFilter.FILTER_ACCEPT;
      }

      const computedStyle = window.getComputedStyle(element, null);
      if (
        computedStyle.getPropertyValue('visibility') === 'hidden' ||
        computedStyle.getPropertyValue('display') === 'none'
      ) {
        return NodeFilter.FILTER_ACCEPT;
      }

      return NodeFilter.FILTER_SKIP;
    }
  );

  const nodesToRemove: Node[] = [];
  let node: Node | null;
  while ((node = nodeIterator.nextNode())) {
    nodesToRemove.push(node);
  }

  for (const nodeToRemove of nodesToRemove) {
    if (nodeToRemove.parentNode instanceof HTMLElement) {
      nodeToRemove.parentNode.removeChild(nodeToRemove);
    }
  }

  return root;
}

function getHTMLOfSelection(): string {
  if (document.getSelection) {
    const selection = document.getSelection();
    if (selection && selection.rangeCount > 0) {
      let content = '';
      for (let i = 0; i < selection.rangeCount; i++) {
        const range = selection.getRangeAt(i);
        const clonedSelection = range.cloneContents();
        const div = document.createElement('div');
        div.appendChild(clonedSelection);
        content += div.innerHTML;
      }
      return content;
    }
  }
  return '';
}

function getSelectionAndDom(): SelectionAndDom {
  return {
    selection: getHTMLOfSelection(),
    dom: getHTMLOfDocument(),
  };
}

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text);
}

function downloadMarkdown(filename: string, text: string): void {
  const datauri = `data:text/markdown;base64,${text}`;
  const link = document.createElement('a');
  link.download = filename;
  link.href = datauri;
  link.click();
}

// Expose functions to window
window.getSelectionAndDom = getSelectionAndDom;
window.copyToClipboard = copyToClipboard;
window.downloadMarkdown = downloadMarkdown;

// Load page context script for MathJax handling
(function loadPageContextScript() {
  const s = document.createElement('script');
  s.src = browser.runtime.getURL('content-scripts/page-context.js');
  (document.head || document.documentElement).appendChild(s);
})();
