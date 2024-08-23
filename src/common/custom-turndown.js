export default async function customTurndown(turndownService) {
  // potentially strip out links, depending on options
  links(turndownService)
  // output (previously marked) mathjax elements as latex
  mathjax(turndownService)
  // custom rule for fenced code blocks (<pre><code>)
  fencedCodeBlock(turndownService)
  // handle <pre> as code blocks
  preToFencedCodeBlock(turndownService)
  // handle images
  images(turndownService)
}

function links(turndownService) {
  // add a rule for links
  turndownService.addRule('links', {
    // if we are to strip links, the filter needs to pass
    filter: (node, options) => node.nodeName == 'A' && options.linkStyle == 'stripLinks',
    // if the filter passes, we're stripping links, so just return the content
    replacement: (content, node, options) => content
  })
}

function mathjax(turndownService) {
  // handle multiple lines math
  turndownService.addRule('mathjax', {
    filter(node, options) {
      return options.math.hasOwnProperty(node.id);
    },
    replacement(content, node, options) {
      const math = options.math[node.id];
      let tex = math.tex.trim().replaceAll('\xa0', '');

      if (math.inline) {
        tex = tex.replaceAll('\n', ' ');
        return `$${tex}$`;
      }
      else
        return `$$\n${tex}\n$$`;
    }
  });
}

function fencedCodeBlock(turndownService){
  turndownService.addRule('fencedCodeBlock', {
    filter: function (node, options) {
      return (
        options.codeBlockStyle === 'fenced' &&
        node.nodeName === 'PRE' &&
        node.firstChild &&
        node.firstChild.nodeName === 'CODE'
      );
    },
    replacement: function (content, node, options) {
      return convertToFencedCodeBlock(node.firstChild, options);
    }
  });
}

function preToFencedCodeBlock(turndownService){
  // handle <pre> as code blocks
  turndownService.addRule('pre', {
    filter: (node, tdopts) => node.nodeName == 'PRE' && (!node.firstChild || node.firstChild.nodeName != 'CODE'),
    replacement: (content, node, tdopts) => {
      return convertToFencedCodeBlock(node, tdopts);
    }
  });
}

function repeat(character, count) {
  return Array(count + 1).join(character);
}

function convertToFencedCodeBlock(node, options) {
  node.innerHTML = node.innerHTML.replaceAll('<br-keep></br-keep>', '<br>');
  const langMatch = node.id?.match(/code-lang-(.+)/);
  const language = langMatch?.length > 0 ? langMatch[1] : '';

  var code;

  if (language) {
    var div = document.createElement('div');
    document.body.appendChild(div);
    div.appendChild(node);
    code = node.innerText;
    div.remove();
  } else {
    code = node.innerHTML;
  }

  var fenceChar = options.fence.charAt(0);
  var fenceSize = 3;
  var fenceInCodeRegex = new RegExp('^' + fenceChar + '{3,}', 'gm');

  var match;
  while ((match = fenceInCodeRegex.exec(code))) {
    if (match[0].length >= fenceSize) {
      fenceSize = match[0].length + 1;
    }
  }

  var fence = repeat(fenceChar, fenceSize);

  return (
    '\n\n' + fence + language + '\n' +
    code.replace(/\n$/, '') +
    '\n' + fence + '\n\n'
  )
}

function cleanAttribute(attribute) {
  return attribute ? attribute.replace(/(\n+\s*)+/g, '\n') : ''
}

function images(turndownService) {
  // add a rule for images
  turndownService.addRule('images', {
    filter: (node, options) => node.nodeName == 'IMG' && node.getAttribute('src'),
    replacement: (content, node, options) => {
      let src = node.getAttribute('src')
      if(options.downloadImages) src = options.imageList[node.getAttribute('src')] ?? src
      // if we're stripping images, output nothing
      if (options.imageStyle == 'noImage') return ''
      // if this is an obsidian-style image, output that
      else if (options.imageStyle.startsWith('obsidian')) return `![[${src}]]`
      else {
        var alt = cleanAttribute(node.getAttribute('alt'));
        var title = cleanAttribute(node.getAttribute('title'));
        var titlePart = title ? ' "' + title + '"' : '';
        if (options.imageRefStyle == 'referenced') {
          var id = this.references.length + 1;
          this.references.push('[fig' + id + ']: ' + src + titlePart);
          return '![' + alt + '][fig' + id + ']';
        }
        else return src ? '![' + alt + ']' + '(' + src + titlePart + ')' : ''
      }
    },
    references: [],
    append: function (options) {
      var references = '';
      if (this.references.length) {
        references = '\n\n' + this.references.join('\n') + '\n\n';
        this.references = []; // Reset references
      }
      return references
    }
  })
}