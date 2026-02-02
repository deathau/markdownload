import browser from 'webextension-polyfill';
import type { Options } from '@/shared/types';
import { generateValidFileName } from '@/lib/markdown/filename-generator';

function base64EncodeUnicode(str: string): string {
  const utf8Bytes = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_match, p1) =>
    String.fromCharCode(parseInt('0x' + p1, 16))
  );
  return btoa(utf8Bytes);
}

export async function downloadViaContentLink(
  tabId: number,
  markdown: string,
  title: string,
  mdClipsFolder: string,
  options: Options
): Promise<void> {
  const filename = `${mdClipsFolder}${generateValidFileName(title, options.disallowedChars)}.md`;
  const encodedMarkdown = base64EncodeUnicode(markdown);

  await browser.scripting.executeScript({
    target: { tabId },
    func: (fn: string, md: string) => {
      const datauri = `data:text/markdown;base64,${md}`;
      const link = document.createElement('a');
      link.download = fn;
      link.href = datauri;
      link.click();
    },
    args: [filename, encodedMarkdown],
  });
}
