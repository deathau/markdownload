import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import type { Options, Article, ConversionResult } from '@/shared/types';
import { createImageRule } from './rules/images';
import { createLinkRule } from './rules/links';
import { createMathRule } from './rules/math';
import { createFencedCodeBlockRule, createPreRule } from './rules/code-blocks';

const DEFAULT_ESCAPE = TurndownService.prototype.escape;

export function createTurndownService(
  options: Options,
  article: Article
): { service: TurndownService; imageList: Record<string, string> } {
  if (options.turndownEscape) {
    TurndownService.prototype.escape = DEFAULT_ESCAPE;
  } else {
    TurndownService.prototype.escape = (s: string) => s;
  }

  const service = new TurndownService({
    headingStyle: options.headingStyle,
    hr: options.hr,
    bulletListMarker: options.bulletListMarker,
    codeBlockStyle: options.codeBlockStyle,
    fence: options.fence,
    emDelimiter: options.emDelimiter,
    strongDelimiter: options.strongDelimiter,
    linkStyle: options.linkStyle === 'stripLinks' ? 'inlined' : options.linkStyle,
    linkReferenceStyle: options.linkReferenceStyle,
  });

  service.use(gfm);

  service.keep(['iframe', 'sub', 'sup', 'u', 'ins', 'del', 'small'] as (keyof HTMLElementTagNameMap)[]);

  const { imageList, rule: imageRule } = createImageRule(options, article);
  service.addRule('images', imageRule);
  service.addRule('links', createLinkRule(options, article));
  service.addRule('mathjax', createMathRule(article));
  service.addRule('fencedCodeBlock', createFencedCodeBlockRule());
  service.addRule('pre', createPreRule());

  return { service, imageList };
}

export function convertHtmlToMarkdown(
  content: string,
  options: Options,
  article: Article
): ConversionResult {
  const { service, imageList } = createTurndownService(options, article);

  let markdown = options.frontmatter + service.turndown(content) + options.backmatter;

  // Strip non-printing special characters
  markdown = markdown.replace(
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028\u2029\ufeff\ufff9-\ufffc]/g,
    ''
  );

  return { markdown, imageList };
}
