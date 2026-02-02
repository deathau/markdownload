import browser from 'webextension-polyfill';
import type { Message, ClipMessage, DownloadMessage } from '@/shared/types';
import { getOptions } from '@/shared/storage';
import { parseArticleFromDom } from '@/lib/readability/article-parser';
import { convertArticleToMarkdown, formatTitle, formatMdClipsFolder } from '@/lib/markdown/converter';
import { downloadMarkdown } from '@/lib/download';

export async function handleMessage(
  message: Message,
  _sender: browser.Runtime.MessageSender
): Promise<void> {
  if (message.type === 'clip') {
    await handleClipMessage(message as ClipMessage);
  } else if (message.type === 'download') {
    await handleDownloadMessage(message as DownloadMessage);
  }
}

async function handleClipMessage(message: ClipMessage): Promise<void> {
  const options = await getOptions();

  if (message.includeTemplate !== undefined) {
    options.includeTemplate = message.includeTemplate;
  }
  if (message.downloadImages !== undefined) {
    options.downloadImages = message.downloadImages;
  }

  const article = parseArticleFromDom(message.dom);

  if (message.selection && message.clipSelection) {
    article.content = message.selection;
  }

  const { markdown, imageList } = await convertArticleToMarkdown(
    article,
    options.downloadImages
  );

  article.title = await formatTitle(article);

  const mdClipsFolder = await formatMdClipsFolder(article);

  await browser.runtime.sendMessage({
    type: 'display.md',
    markdown,
    article,
    imageList,
    mdClipsFolder,
  });
}

async function handleDownloadMessage(message: DownloadMessage): Promise<void> {
  await downloadMarkdown(
    message.markdown,
    message.title,
    message.tab.id!,
    message.imageList,
    message.mdClipsFolder
  );
}
