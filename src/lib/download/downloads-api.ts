import browser from 'webextension-polyfill';
import type { Options } from '@/shared/types';

interface DownloadOptions {
  markdown: string;
  title: string;
  imageList: Record<string, string>;
  mdClipsFolder: string;
  options: Options;
}

function createDownloadListener(
  targetId: number,
  url: string
): (delta: browser.Downloads.OnChangedDownloadDeltaType) => void {
  const listener = (delta: browser.Downloads.OnChangedDownloadDeltaType) => {
    if (delta.id === targetId && delta.state?.current === 'complete') {
      browser.downloads.onChanged.removeListener(listener);
      URL.revokeObjectURL(url);
    }
  };
  return listener;
}

export async function downloadViaApi({
  markdown,
  title,
  imageList,
  mdClipsFolder,
  options,
}: DownloadOptions): Promise<void> {
  const url = URL.createObjectURL(
    new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  );

  const folder = mdClipsFolder.endsWith('/')
    ? mdClipsFolder
    : mdClipsFolder
      ? `${mdClipsFolder}/`
      : '';

  try {
    const id = await browser.downloads.download({
      url,
      filename: `${folder}${title}.md`,
      saveAs: options.saveAs,
    });

    browser.downloads.onChanged.addListener(createDownloadListener(id, url));

    if (options.downloadImages) {
      let destPath = folder + title.substring(0, title.lastIndexOf('/'));
      if (destPath && !destPath.endsWith('/')) {
        destPath += '/';
      }

      await Promise.all(
        Object.entries(imageList).map(async ([src, filename]) => {
          const imgId = await browser.downloads.download({
            url: src,
            filename: destPath ? destPath + filename : filename,
            saveAs: false,
          });
          browser.downloads.onChanged.addListener(createDownloadListener(imgId, src));
        })
      );
    }
  } catch (err) {
    console.error('Download failed:', err);
    throw err;
  }
}
