// Content Script for MarkDownload - Manifest V3

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getSelectionAndDom") {
    const result = getSelectionAndDom();
    sendResponse(result);
    return true;
  }
  else if (message.type === "copyToClipboard") {
    copyToClipboard(message.text);
    sendResponse({ success: true });
    return true;
  }
  else if (message.type === "downloadViaContentLink") {
    downloadMarkdown(message.filename, message.markdown);
    sendResponse({ success: true });
    return true;
  }
  return false;
});

function getHTMLOfDocument() {
  // Make sure a title tag exists so that pageTitle is not empty and
  // a filename can be generated.
  if (document.head.getElementsByTagName('title').length == 0) {
    let titleEl = document.createElement('title');
    titleEl.innerText = document.title;
    document.head.append(titleEl);
  }

  // If the document doesn't have a "base" element make one
  // This allows the DOM parser in future steps to fix relative URIs
  let baseEls = document.head.getElementsByTagName('base');
  let baseEl;

  if (baseEls.length > 0) {
    baseEl = baseEls[0];
  } else {
    baseEl = document.createElement('base');
    document.head.append(baseEl);
  }

  // Make sure the 'base' element always has a good 'href'
  // attribute so that the DOMParser generates usable
  // baseURI and documentURI properties when used in the
  // background context.
  let href = baseEl.getAttribute('href');

  if (!href || !href.startsWith(window.location.origin)) {
    baseEl.setAttribute('href', window.location.href);
  }

  // Clone the document to avoid modifying the original
  const docClone = document.cloneNode(true);

  // Remove the hidden content from the cloned page
  removeHiddenNodes(docClone.body);

  // Get the content of the page as a string
  return docClone.documentElement.outerHTML;
}

// Remove hidden nodes from the DOM
function removeHiddenNodes(root) {
  let nodeIterator, node, i = 0;

  nodeIterator = document.createNodeIterator(root, NodeFilter.SHOW_ELEMENT, function(node) {
    let nodeName = node.nodeName.toLowerCase();
    if (nodeName === "script" || nodeName === "style" || nodeName === "noscript" || nodeName === "math") {
      return NodeFilter.FILTER_REJECT;
    }
    if (node.offsetParent === void 0) {
      return NodeFilter.FILTER_ACCEPT;
    }
    let computedStyle = window.getComputedStyle(node, null);
    if (computedStyle.getPropertyValue("visibility") === "hidden" || computedStyle.getPropertyValue("display") === "none") {
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  while ((node = nodeIterator.nextNode()) && ++i) {
    if (node.parentNode instanceof HTMLElement) {
      node.parentNode.removeChild(node);
    }
  }
  return root;
}

// Get HTML of the current selection
function getHTMLOfSelection() {
  var range;
  if (document.selection && document.selection.createRange) {
    range = document.selection.createRange();
    return range.htmlText;
  } else if (window.getSelection) {
    var selection = window.getSelection();
    if (selection.rangeCount > 0) {
      let content = '';
      for (let i = 0; i < selection.rangeCount; i++) {
        // Fixed: Use getRangeAt(i) instead of getRangeAt(0)
        range = selection.getRangeAt(i);
        var clonedSelection = range.cloneContents();
        var div = document.createElement('div');
        div.appendChild(clonedSelection);
        content += div.innerHTML;
      }
      return content;
    } else {
      return '';
    }
  } else {
    return '';
  }
}

// Get selection and full DOM
function getSelectionAndDom() {
  return {
    selection: getHTMLOfSelection(),
    dom: getHTMLOfDocument()
  };
}

// Copy text to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(err => {
    console.error('Failed to copy to clipboard:', err);
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } catch (e) {
      console.error('Fallback copy failed:', e);
    }
    document.body.removeChild(textarea);
  });
}

// Download markdown file via data URI
function downloadMarkdown(filename, base64Content) {
  let datauri = `data:text/markdown;base64,${base64Content}`;
  var link = document.createElement('a');
  link.download = filename;
  link.href = datauri;
  link.click();
}

// Load page context script for MathJax support
(function loadPageContextScript() {
  var s = document.createElement('script');
  s.src = chrome.runtime.getURL('contentScript/pageContext.js');
  (document.head || document.documentElement).appendChild(s);
})();
