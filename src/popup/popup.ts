import browser from 'webextension-polyfill';
import type { Article, DisplayMessage } from '@/shared/types';
import { defaultOptions } from '@/shared/default-options';

let imageList: Record<string, string> = {};
let mdClipsFolder = '';

const titleInput = document.getElementById('title') as HTMLInputElement;
const mdTextarea = document.getElementById('md') as HTMLTextAreaElement;
const container = document.getElementById('container') as HTMLDivElement;
const spinner = document.getElementById('spinner') as HTMLDivElement;
const downloadBtn = document.getElementById('download') as HTMLAnchorElement;
const downloadSelectionBtn = document.getElementById('downloadSelection') as HTMLAnchorElement;
const clipOption = document.getElementById('clipOption') as HTMLDivElement;
const selectedBtn = document.getElementById('selected') as HTMLAnchorElement;
const documentBtn = document.getElementById('document') as HTMLAnchorElement;
const includeTemplateBtn = document.getElementById('includeTemplate') as HTMLAnchorElement;
const downloadImagesBtn = document.getElementById('downloadImages') as HTMLAnchorElement;

interface PopupOptions {
  includeTemplate: boolean;
  clipSelection: boolean;
  downloadImages: boolean;
}

const localOptions: PopupOptions = {
  includeTemplate: false,
  clipSelection: true,
  downloadImages: false,
};

function checkInitialSettings(options: PopupOptions): void {
  if (options.includeTemplate) {
    includeTemplateBtn.classList.add('checked');
  }

  if (options.downloadImages) {
    downloadImagesBtn.classList.add('checked');
  }

  if (options.clipSelection) {
    selectedBtn.classList.add('checked');
  } else {
    documentBtn.classList.add('checked');
  }
}

function showOrHideClipOption(selection: string): void {
  clipOption.style.display = selection ? 'flex' : 'none';
}

function showError(err: unknown): void {
  container.style.display = 'flex';
  spinner.style.display = 'none';
  mdTextarea.value = `Error clipping the page\n\n${err}`;
}

async function clipSite(tabId: number): Promise<void> {
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      func: () => {
        const win = window as unknown as { getSelectionAndDom?: () => { selection: string; dom: string } };
        if (typeof win.getSelectionAndDom === 'function') {
          return win.getSelectionAndDom();
        }
        return null;
      },
    });

    if (results && results[0]?.result) {
      const result = results[0].result as { selection: string; dom: string };
      const { selection, dom } = result;
      showOrHideClipOption(selection);

      const options = await browser.storage.sync.get(defaultOptions as unknown as Record<string, unknown>);

      await browser.runtime.sendMessage({
        type: 'clip',
        dom,
        selection,
        clipSelection: localOptions.clipSelection,
        includeTemplate: options.includeTemplate,
        downloadImages: options.downloadImages,
      });
    }
  } catch (err) {
    console.error(err);
    showError(err);
  }
}

function toggleClipSelection(): void {
  localOptions.clipSelection = !localOptions.clipSelection;
  selectedBtn.classList.toggle('checked');
  documentBtn.classList.toggle('checked');

  browser.storage.sync.set({ clipSelection: localOptions.clipSelection }).then(async () => {
    const [tab] = await browser.tabs.query({ currentWindow: true, active: true });
    if (tab?.id) {
      await clipSite(tab.id);
    }
  });
}

function toggleIncludeTemplate(): void {
  localOptions.includeTemplate = !localOptions.includeTemplate;
  includeTemplateBtn.classList.toggle('checked');

  browser.storage.sync.set({ includeTemplate: localOptions.includeTemplate }).then(async () => {
    try {
      await browser.contextMenus.update('toggle-includeTemplate', {
        checked: localOptions.includeTemplate,
      });
    } catch {
      // Ignore
    }
    try {
      await browser.contextMenus.update('tabtoggle-includeTemplate', {
        checked: localOptions.includeTemplate,
      });
    } catch {
      // Ignore
    }

    const [tab] = await browser.tabs.query({ currentWindow: true, active: true });
    if (tab?.id) {
      await clipSite(tab.id);
    }
  });
}

function toggleDownloadImages(): void {
  localOptions.downloadImages = !localOptions.downloadImages;
  downloadImagesBtn.classList.toggle('checked');

  browser.storage.sync.set({ downloadImages: localOptions.downloadImages }).then(async () => {
    try {
      await browser.contextMenus.update('toggle-downloadImages', {
        checked: localOptions.downloadImages,
      });
    } catch {
      // Ignore
    }
    try {
      await browser.contextMenus.update('tabtoggle-downloadImages', {
        checked: localOptions.downloadImages,
      });
    } catch {
      // Ignore
    }
  });
}

async function sendDownloadMessage(text: string): Promise<void> {
  const [tab] = await browser.tabs.query({ currentWindow: true, active: true });

  await browser.runtime.sendMessage({
    type: 'download',
    markdown: text,
    title: titleInput.value,
    tab,
    imageList,
    mdClipsFolder,
  });
}

async function download(e: Event): Promise<void> {
  e.preventDefault();
  await sendDownloadMessage(mdTextarea.value);
  window.close();
}

async function downloadSelection(e: Event): Promise<void> {
  e.preventDefault();
  const start = mdTextarea.selectionStart;
  const end = mdTextarea.selectionEnd;
  if (start !== end) {
    await sendDownloadMessage(mdTextarea.value.substring(start, end));
  }
}

function handleMessage(message: DisplayMessage): void {
  if (message.type === 'display.md') {
    mdTextarea.value = message.markdown;
    titleInput.value = (message.article as Article).title;
    imageList = message.imageList;
    mdClipsFolder = message.mdClipsFolder;

    container.style.display = 'flex';
    spinner.style.display = 'none';
    downloadBtn.focus();
  }
}

// Initialize
async function init(): Promise<void> {
  const options = await browser.storage.sync.get(defaultOptions as unknown as Record<string, unknown>);
  localOptions.includeTemplate = options.includeTemplate as boolean;
  localOptions.clipSelection = options.clipSelection as boolean;
  localOptions.downloadImages = options.downloadImages as boolean;

  checkInitialSettings(localOptions);

  selectedBtn.addEventListener('click', (e) => {
    e.preventDefault();
    toggleClipSelection();
  });

  documentBtn.addEventListener('click', (e) => {
    e.preventDefault();
    toggleClipSelection();
  });

  includeTemplateBtn.addEventListener('click', (e) => {
    e.preventDefault();
    toggleIncludeTemplate();
  });

  downloadImagesBtn.addEventListener('click', (e) => {
    e.preventDefault();
    toggleDownloadImages();
  });

  downloadBtn.addEventListener('click', download);
  downloadSelectionBtn.addEventListener('click', downloadSelection);

  // Track selection in textarea
  mdTextarea.addEventListener('select', () => {
    const hasSelection = mdTextarea.selectionStart !== mdTextarea.selectionEnd;
    downloadSelectionBtn.style.display = hasSelection ? 'block' : 'none';
  });

  // Listen for messages
  browser.runtime.onMessage.addListener((message: unknown) => {
    handleMessage(message as DisplayMessage);
  });

  // Inject content script and start clipping
  const [tab] = await browser.tabs.query({ currentWindow: true, active: true });
  if (tab?.id) {
    try {
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['/content-scripts/content-script.js'],
      });
      console.info('Successfully injected MarkDownload content script');
      await clipSite(tab.id);
    } catch (error) {
      console.error(error);
      showError(error);
    }
  }
}

init().catch(console.error);
