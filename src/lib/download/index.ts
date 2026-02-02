import browser from 'webextension-polyfill';
import { getOptions } from '@/shared/storage';
import { downloadViaApi } from './downloads-api';
import { downloadViaContentLink } from './content-link';

export async function downloadMarkdown(
  markdown: string,
  title: string,
  tabId: number,
  imageList: Record<string, string> = {},
  mdClipsFolder = ''
): Promise<void> {
  const options = await getOptions();

  if (options.downloadMode === 'downloadsApi' && browser.downloads) {
    await downloadViaApi({
      markdown,
      title,
      imageList,
      mdClipsFolder,
      options,
    });
  } else {
    await downloadViaContentLink(tabId, markdown, title, mdClipsFolder, options);
  }
}

export { downloadViaApi } from './downloads-api';
export { downloadViaContentLink } from './content-link';
export { preDownloadImages } from './image-downloader';
