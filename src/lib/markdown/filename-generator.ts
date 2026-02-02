import type { Options } from '@/shared/types';

const ILLEGAL_CHARS_REGEX = /[/\\?<>:*|"]/g;
const NON_BREAKING_SPACE = /\u00A0/g;
const WHITESPACE = /\s+/g;

export function generateValidFileName(
  title: string | undefined,
  disallowedChars?: string | null
): string {
  if (!title) return '';

  let name = String(title)
    .replace(ILLEGAL_CHARS_REGEX, '')
    .replace(NON_BREAKING_SPACE, ' ')
    .replace(WHITESPACE, ' ')
    .trim();

  if (disallowedChars) {
    for (const c of disallowedChars) {
      const escapedChar = `[\\^$.|?*+()`.includes(c) ? `\\${c}` : c;
      name = name.replace(new RegExp(escapedChar, 'g'), '');
    }
  }

  return name;
}

export function getImageFilename(
  src: string,
  options: Options,
  prependFilePath = true
): string {
  const slashPos = src.lastIndexOf('/');
  const queryPos = src.indexOf('?');
  let filename = src.substring(slashPos + 1, queryPos > 0 ? queryPos : src.length);

  let imagePrefix = options.imagePrefix || '';

  if (prependFilePath && options.title.includes('/')) {
    imagePrefix =
      options.title.substring(0, options.title.lastIndexOf('/') + 1) + imagePrefix;
  } else if (prependFilePath) {
    imagePrefix = options.title + (imagePrefix.startsWith('/') ? '' : '/') + imagePrefix;
  }

  if (filename.includes(';base64,')) {
    filename = 'image.' + filename.substring(0, filename.indexOf(';'));
  }

  const extension = filename.substring(filename.lastIndexOf('.'));
  if (extension === filename) {
    filename = filename + '.idunno';
  }

  filename = generateValidFileName(filename, options.disallowedChars);

  return imagePrefix + filename;
}
