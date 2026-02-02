import type { Article, Options, ConversionResult } from '@/shared/types';
import { getOptions } from '@/shared/storage';
import { textReplace } from './text-replace';
import { generateValidFileName } from './filename-generator';
import { convertHtmlToMarkdown } from '@/lib/turndown';
import { preDownloadImages } from '@/lib/download/image-downloader';

export async function convertArticleToMarkdown(
  article: Article,
  downloadImages: boolean | null = null
): Promise<ConversionResult> {
  const options = await getOptions();

  if (downloadImages !== null) {
    options.downloadImages = downloadImages;
  }

  if (options.includeTemplate) {
    options.frontmatter = textReplace(options.frontmatter, article) + '\n';
    options.backmatter = '\n' + textReplace(options.backmatter, article);
  } else {
    options.frontmatter = '';
    options.backmatter = '';
  }

  options.imagePrefix = textReplace(options.imagePrefix, article, options.disallowedChars)
    .split('/')
    .map((s) => generateValidFileName(s, options.disallowedChars))
    .join('/');

  let result = convertHtmlToMarkdown(article.content, options, article);

  if (options.downloadImages && options.downloadMode === 'downloadsApi') {
    result = await preDownloadImages(result.imageList, result.markdown, options);
  }

  return result;
}

export async function formatTitle(article: Article): Promise<string> {
  const options = await getOptions();

  let title = textReplace(options.title, article, options.disallowedChars + '/');
  title = title
    .split('/')
    .map((s) => generateValidFileName(s, options.disallowedChars))
    .join('/');

  return title;
}

export async function formatMdClipsFolder(article: Article): Promise<string> {
  const options = await getOptions();

  let mdClipsFolder = '';
  if (options.mdClipsFolder && options.downloadMode === 'downloadsApi') {
    mdClipsFolder = textReplace(options.mdClipsFolder, article, options.disallowedChars);
    mdClipsFolder = mdClipsFolder
      .split('/')
      .map((s) => generateValidFileName(s, options.disallowedChars))
      .join('/');
    if (!mdClipsFolder.endsWith('/')) {
      mdClipsFolder += '/';
    }
  }

  return mdClipsFolder;
}

export async function formatObsidianFolder(article: Article): Promise<string> {
  const options = await getOptions();

  let obsidianFolder = '';
  if (options.obsidianFolder) {
    obsidianFolder = textReplace(options.obsidianFolder, article, options.disallowedChars);
    obsidianFolder = obsidianFolder
      .split('/')
      .map((s) => generateValidFileName(s, options.disallowedChars))
      .join('/');
    if (!obsidianFolder.endsWith('/')) {
      obsidianFolder += '/';
    }
  }

  return obsidianFolder;
}
