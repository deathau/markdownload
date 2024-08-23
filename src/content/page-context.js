function ensureBase(){
  // check for a existing base elements. If we don't find one, create and append a new one.
  let baseEl = document.head.querySelector('base') ?? document.head.appendChild(document.createElement('base'))

  // make sure the 'base' element always has a good 'href`
  // attribute so that the DOMParser generates usable
  // baseURI and documentURI properties when used in the
  // background context.
  let href = baseEl.getAttribute('href')
  if (!href || !href.startsWith(window.location.origin)) baseEl.setAttribute('href', window.location.href)
}

function ensureTitle() {
  // make sure a title tag exists so that pageTitle is not empty and
  // a filename can be genarated.
  if (document.head.getElementsByTagName('title').length == 0) {
    let titleEl = document.createElement('title');
    // prepate a good default text (the text displayed in the window title)
    titleEl.innerText = document.title;
    document.head.append(titleEl);
  }
}

function addLatexToMathJax3() {
  // strict mode throws a reference error, so we'll use a try-catch
  try { if (!MathJax?.startup?.document?.math) return }
  catch { return }

  for (math of MathJax.startup.document.math)
    math.typesetRoot.setAttribute("markdownload-latex", math.math)
}

// code taken from here: https://www.reddit.com/r/javascript/comments/27bcao/anyone_have_a_method_for_finding_all_the_hidden/
function markHiddenNodes(root) {
  let nodeIterator, node,i = 0;

  nodeIterator = document.createNodeIterator(root, NodeFilter.SHOW_ELEMENT, function(node) {
    let nodeName = node.nodeName.toLowerCase();
    if (nodeName === "math") {
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
    node.setAttribute("markdownload-hidden", true);
  }
  return root
}

ensureBase()
ensureTitle()
addLatexToMathJax3()
markHiddenNodes(document.documentElement)
''