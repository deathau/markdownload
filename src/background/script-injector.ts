import browser from 'webextension-polyfill';
import type { SelectionAndDom } from '@/shared/types';

export async function ensureScripts(tabId: number): Promise<void> {
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      func: () => typeof (window as unknown as { getSelectionAndDom?: () => void }).getSelectionAndDom === 'function',
    });

    if (!results || !results[0]?.result) {
      await browser.scripting.executeScript({
        target: { tabId },
        files: ['/content-scripts/content-script.js'],
      });
    }
  } catch (error) {
    console.error('Failed to inject content script:', error);
    throw error;
  }
}

export async function getSelectionAndDomFromTab(tabId: number): Promise<SelectionAndDom | null> {
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      func: () => {
        const win = window as unknown as { getSelectionAndDom?: () => SelectionAndDom };
        if (typeof win.getSelectionAndDom === 'function') {
          return win.getSelectionAndDom();
        }
        return null;
      },
    });

    if (results && results[0]?.result) {
      return results[0].result as SelectionAndDom;
    }
    return null;
  } catch (error) {
    console.error('Failed to get selection and DOM:', error);
    return null;
  }
}

export async function copyToClipboard(tabId: number, text: string): Promise<void> {
  await browser.scripting.executeScript({
    target: { tabId },
    func: (textToCopy: string) => navigator.clipboard.writeText(textToCopy),
    args: [text],
  });
}
