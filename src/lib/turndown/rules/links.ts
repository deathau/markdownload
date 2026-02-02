import type TurndownService from 'turndown';
import type { Options, Article } from '@/shared/types';
import { validateUri } from '@/lib/markdown/uri-validator';

export function createLinkRule(options: Options, article: Article): TurndownService.Rule {
  return {
    filter(node) {
      if (node.nodeName !== 'A' || !node.getAttribute('href')) {
        return false;
      }

      const href = node.getAttribute('href')!;
      node.setAttribute('href', validateUri(href, article.baseURI));

      return options.linkStyle === 'stripLinks';
    },

    replacement(content) {
      return content;
    },
  };
}
