import type TurndownService from 'turndown';
import type { Options, Article } from '@/shared/types';
import { validateUri } from '@/lib/markdown/uri-validator';
import { getImageFilename } from '@/lib/markdown/filename-generator';

export interface ImageRule {
  imageList: Record<string, string>;
  rule: TurndownService.Rule;
}

function cleanAttribute(attribute: string | null): string {
  return attribute ? attribute.replace(/(\n+\s*)+/g, '\n') : '';
}

export function createImageRule(options: Options, article: Article): ImageRule {
  const imageList: Record<string, string> = {};
  const references: string[] = [];

  const rule: TurndownService.Rule = {
    filter(node) {
      if (node.nodeName !== 'IMG' || !node.getAttribute('src')) {
        return false;
      }

      const src = node.getAttribute('src')!;
      node.setAttribute('src', validateUri(src, article.baseURI));

      if (options.downloadImages) {
        let imageFilename = getImageFilename(src, options, false);

        if (!imageList[src] || imageList[src] !== imageFilename) {
          let i = 1;
          while (Object.values(imageList).includes(imageFilename)) {
            const parts = imageFilename.split('.');
            if (i === 1) {
              parts.splice(parts.length - 1, 0, String(i++));
            } else {
              parts.splice(parts.length - 2, 1, String(i++));
            }
            imageFilename = parts.join('.');
          }
          imageList[src] = imageFilename;
        }

        const obsidianLink = options.imageStyle.startsWith('obsidian');
        const localSrc =
          options.imageStyle === 'obsidian-nofolder'
            ? imageFilename.substring(imageFilename.lastIndexOf('/') + 1)
            : imageFilename
                .split('/')
                .map((s) => (obsidianLink ? s : encodeURI(s)))
                .join('/');

        if (options.imageStyle !== 'originalSource' && options.imageStyle !== 'base64') {
          node.setAttribute('src', localSrc);
        }
      }

      return true;
    },

    replacement(_content, node) {
      const element = node as HTMLImageElement;

      if (options.imageStyle === 'noImage') {
        return '';
      }

      if (options.imageStyle.startsWith('obsidian')) {
        return `![[${element.getAttribute('src')}]]`;
      }

      const alt = cleanAttribute(element.getAttribute('alt'));
      const src = element.getAttribute('src') || '';
      const title = cleanAttribute(element.getAttribute('title'));
      const titlePart = title ? ` "${title}"` : '';

      if (options.imageRefStyle === 'referenced') {
        const id = references.length + 1;
        references.push(`[fig${id}]: ${src}${titlePart}`);
        return `![${alt}][fig${id}]`;
      }

      return src ? `![${alt}](${src}${titlePart})` : '';
    },
  } as TurndownService.Rule;

  return { imageList, rule };
}
