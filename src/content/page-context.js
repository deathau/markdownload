function ensureBase(){
  // check for a existing base elements. If we don't find one, create and append a new one.
  let baseEl = document.head.querySelector('base') ?? document.head.appendChild(document.createElement('base'));
  // if the base element doesn't have a href, use the current location
  if (!baseEl.getAttribute('href')) baseEl.setAttribute('href', window.location.href)
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
addLatexToMathJax3()
markHiddenNodes(document.documentElement)
''