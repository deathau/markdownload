import type TurndownService from 'turndown';

function repeat(character: string, count: number): string {
  return Array(count + 1).join(character);
}

function convertToFencedCodeBlock(
  node: HTMLElement,
  options: TurndownService.Options
): string {
  node.innerHTML = node.innerHTML.replaceAll('<br-keep></br-keep>', '<br>');
  const langMatch = node.id?.match(/code-lang-(.+)/);
  const language = langMatch && langMatch.length > 0 ? langMatch[1] : '';

  const code = node.innerText;
  const fenceChar = (options.fence || '```').charAt(0);
  let fenceSize = 3;
  const fenceInCodeRegex = new RegExp('^' + fenceChar + '{3,}', 'gm');

  let match;
  while ((match = fenceInCodeRegex.exec(code))) {
    if (match[0].length >= fenceSize) {
      fenceSize = match[0].length + 1;
    }
  }

  const fence = repeat(fenceChar, fenceSize);

  return '\n\n' + fence + language + '\n' + code.replace(/\n$/, '') + '\n' + fence + '\n\n';
}

export function createFencedCodeBlockRule(): TurndownService.Rule {
  return {
    filter(node, options) {
      return (
        options.codeBlockStyle === 'fenced' &&
        node.nodeName === 'PRE' &&
        !!node.firstChild &&
        (node.firstChild as HTMLElement).nodeName === 'CODE'
      );
    },

    replacement(_content, node, options) {
      return convertToFencedCodeBlock(node.firstChild as HTMLElement, options);
    },
  };
}

export function createPreRule(): TurndownService.Rule {
  return {
    filter(node) {
      const element = node as HTMLElement;
      return (
        element.nodeName === 'PRE' &&
        (!element.firstChild || (element.firstChild as HTMLElement).nodeName !== 'CODE') &&
        !element.querySelector('img')
      );
    },

    replacement(_content, node, options) {
      return convertToFencedCodeBlock(node as HTMLElement, options);
    },
  };
}
