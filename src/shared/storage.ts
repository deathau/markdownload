import browser from 'webextension-polyfill';
import type { Options } from './types';
import { defaultOptions } from './default-options';

export async function getOptions(): Promise<Options> {
  try {
    const stored = await browser.storage.sync.get(defaultOptions as unknown as Record<string, unknown>);
    const options = { ...defaultOptions, ...stored } as Options;

    if (!browser.downloads) {
      options.downloadMode = 'contentLink';
    }

    return options;
  } catch (err) {
    console.error('Failed to get options:', err);
    return { ...defaultOptions };
  }
}

export async function setOptions(options: Partial<Options>): Promise<void> {
  await browser.storage.sync.set(options);
}

export async function updateOption<K extends keyof Options>(
  key: K,
  value: Options[K]
): Promise<void> {
  await browser.storage.sync.set({ [key]: value });
}
