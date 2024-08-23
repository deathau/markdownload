// code taken from here: https://stackoverflow.com/a/5084044/304786
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
              range = selection.getRangeAt(0);
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

(function grabSelection() {
  return new Promise((resolve, reject) => {
    let selection = getHTMLOfSelection()

    if(selection) {
      resolve(selection)
    }
    else {
      var targetHtml = null;

      var box = document.createElement('div')
      box.style.outline = "2px dotted red";
      box.style.margin = "0";
      box.style.border = "0";
      box.style.padding = "0";
      box.style.backgroundColor = "rgba(100, 0, 0, 0.3)";
      box.style.pointerEvents = "none";
      box.style.zIndex = "2147483647";
      box.style.position = "fixed";


      document.body.appendChild(box)

      let mousemove = (e) => {
        var target = e.target;
        
        let boundingRect = target.getBoundingClientRect();
        
        box.style.top = boundingRect.top + "px";
        box.style.left = boundingRect.left + "px";
        box.style.width = boundingRect.width + "px";
        box.style.height = boundingRect.height + "px";
      }

      let click = (e) => {
        e.preventDefault()
        var target = e.target
        targetHtml = target.outerHTML
        
        box.parentNode.removeChild(box)
        document.body.removeEventListener("mousemove", mousemove)
        document.body.removeEventListener("click", click)

        resolve(targetHtml)
      }

      document.body.addEventListener("mousemove", mousemove)
      document.body.addEventListener("click", click)
    }
  })
})()