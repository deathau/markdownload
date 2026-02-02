import dayjs from 'dayjs';
import type { Article } from '@/shared/types';
import { generateValidFileName } from './filename-generator';

type TransformFn = (s: string) => string;

const transforms: Record<string, TransformFn> = {
  lower: (s) => s.toLowerCase(),
  upper: (s) => s.toUpperCase(),
  kebab: (s) => s.replace(/ /g, '-').toLowerCase(),
  'mixed-kebab': (s) => s.replace(/ /g, '-'),
  snake: (s) => s.replace(/ /g, '_').toLowerCase(),
  mixed_snake: (s) => s.replace(/ /g, '_'),
  'obsidian-cal': (s) => s.replace(/ /g, '-').replace(/-{2,}/g, '-'),
  camel: (s) =>
    s
      .replace(/ ./g, (str) => str.trim().toUpperCase())
      .replace(/^./, (str) => str.toLowerCase()),
  pascal: (s) =>
    s
      .replace(/ ./g, (str) => str.trim().toUpperCase())
      .replace(/^./, (str) => str.toUpperCase()),
};

export function textReplace(
  template: string,
  article: Article,
  disallowedChars?: string | null
): string {
  let result = template;

  for (const key in article) {
    if (Object.prototype.hasOwnProperty.call(article, key) && key !== 'content') {
      let value = String(article[key] ?? '');
      if (value && disallowedChars) {
        value = generateValidFileName(value, disallowedChars);
      }

      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);

      for (const [suffix, transform] of Object.entries(transforms)) {
        result = result.replace(new RegExp(`\\{${key}:${suffix}\\}`, 'g'), transform(value));
      }
    }
  }

  const now = new Date();
  const dateRegex = /\{date:(.+?)\}/g;
  const dateMatches = result.match(dateRegex);
  if (dateMatches) {
    for (const match of dateMatches) {
      const format = match.substring(6, match.length - 1);
      const dateString = dayjs(now).format(format);
      result = result.replaceAll(match, dateString);
    }
  }

  const keywordRegex = /\{keywords:?(.*?)?\}/g;
  const keywordMatches = result.match(keywordRegex);
  if (keywordMatches) {
    for (const match of keywordMatches) {
      let separator = match.substring(10, match.length - 1);
      try {
        separator = JSON.parse(JSON.stringify(separator).replace(/\\\\/g, '\\'));
      } catch {
        // Keep original separator
      }
      const keywordsString = (article.keywords || []).join(separator || ',');
      result = result.replace(new RegExp(match.replace(/\\/g, '\\\\'), 'g'), keywordsString);
    }
  }

  result = result.replace(/\{(.*?)\}/g, '');

  return result;
}
