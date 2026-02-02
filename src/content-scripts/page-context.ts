// This script runs in the page context to access MathJax objects

interface MathJax3 {
  version?: string;
  startup?: {
    document?: {
      getMathItemsWithin?: (el: Element) => Array<{
        start: { node: Element };
        end: { node: Element };
        math: { tex: string; display: boolean };
      }>;
    };
  };
}

(function () {
  const win = window as Window & { MathJax?: MathJax3 };

  // Handle MathJax 3
  if (win.MathJax && win.MathJax.version && win.MathJax.version.startsWith('3')) {
    const mathDocument = win.MathJax.startup?.document;
    if (mathDocument && mathDocument.getMathItemsWithin) {
      const mathItems = mathDocument.getMathItemsWithin(document.body);
      for (const item of mathItems) {
        const startNode = item.start.node;
        const endNode = item.end.node;

        if (startNode && endNode) {
          const parent = startNode.parentElement;
          if (parent) {
            const marker = document.createElement('span');
            marker.setAttribute('markdownload-latex', item.math.tex);
            marker.setAttribute('display', String(item.math.display));
            parent.insertBefore(marker, startNode);
          }
        }
      }
    }
  }
})();

export {};
