import type TurndownService from 'turndown';
import type { Article } from '@/shared/types';

export function createMathRule(article: Article): TurndownService.Rule {
  return {
    filter(node) {
      return Object.prototype.hasOwnProperty.call(article.math, node.id);
    },

    replacement(_content, node) {
      const element = node as HTMLElement;
      const math = article.math[element.id];
      let tex = math.tex.trim().replaceAll('\xa0', '');

      if (math.inline) {
        tex = tex.replaceAll('\n', ' ');
        return `$${tex}$`;
      }

      return `$$\n${tex}\n$$`;
    },
  };
}
