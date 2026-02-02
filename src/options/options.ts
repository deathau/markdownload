import browser from 'webextension-polyfill';
import type { Options } from '@/shared/types';
import { defaultOptions } from '@/shared/default-options';
import { createContextMenus } from '@/shared/context-menus';

let options: Options = { ...defaultOptions };
let keyupTimeout: ReturnType<typeof setTimeout> | null = null;

function getElement<T extends HTMLElement>(selector: string): T {
  return document.querySelector(selector) as T;
}

function getElements<T extends HTMLElement>(selector: string): NodeListOf<T> {
  return document.querySelectorAll(selector);
}

function getCheckedValue(radioObj: NodeListOf<HTMLInputElement>): string {
  if (!radioObj) return '';
  for (const radio of radioObj) {
    if (radio.checked) {
      return radio.value;
    }
  }
  return '';
}

function setCheckedValue(radioObj: NodeListOf<HTMLInputElement>, newValue: string): void {
  if (!radioObj) return;
  for (const radio of radioObj) {
    radio.checked = radio.value === newValue;
  }
}

function show(el: HTMLElement | null, visible: boolean): void {
  if (!el) return;
  const height = el.dataset.height || '0';
  el.style.height = visible ? height + 'px' : '0';
  el.style.opacity = visible ? '1' : '0';
}

function textareaInput(this: HTMLTextAreaElement): void {
  const parent = this.parentNode as HTMLElement;
  if (parent) {
    parent.dataset.value = this.value;
  }
}

async function save(): Promise<void> {
  const spinner = document.getElementById('spinner') as HTMLDivElement;
  spinner.style.display = 'block';

  try {
    await browser.storage.sync.set(options as unknown as Record<string, unknown>);

    try {
      await browser.contextMenus.update('toggle-includeTemplate', {
        checked: options.includeTemplate,
      });
    } catch {
      // Ignore
    }
    try {
      await browser.contextMenus.update('tabtoggle-includeTemplate', {
        checked: options.includeTemplate,
      });
    } catch {
      // Ignore
    }
    try {
      await browser.contextMenus.update('toggle-downloadImages', {
        checked: options.downloadImages,
      });
    } catch {
      // Ignore
    }
    try {
      await browser.contextMenus.update('tabtoggle-downloadImages', {
        checked: options.downloadImages,
      });
    } catch {
      // Ignore
    }

    getElements<HTMLElement>('.status').forEach((statusEl) => {
      statusEl.textContent = 'Options Saved';
      statusEl.classList.remove('error');
      statusEl.classList.add('success');
      statusEl.style.opacity = '1';
    });

    setTimeout(() => {
      getElements<HTMLElement>('.status').forEach((statusEl) => {
        statusEl.style.opacity = '0';
      });
    }, 5000);
  } catch (err) {
    getElements<HTMLElement>('.status').forEach((statusEl) => {
      statusEl.textContent = String(err);
      statusEl.classList.remove('success');
      statusEl.classList.add('error');
      statusEl.style.opacity = '1';
    });
  } finally {
    spinner.style.display = 'none';
  }
}

function refreshElements(): void {
  const downloadModeGroup = document.getElementById('downloadModeGroup');
  if (downloadModeGroup) {
    downloadModeGroup.querySelectorAll<HTMLElement>('.radio-container,.checkbox-container,.textbox-container').forEach((container) => {
      show(container, options.downloadMode === 'downloadsApi');
    });
  }

  show(document.getElementById('mdClipsFolder'), options.downloadMode === 'downloadsApi');
  show(document.getElementById('linkReferenceStyle'), options.linkStyle === 'referenced');
  show(document.getElementById('imageRefOptions'), !options.imageStyle.startsWith('obsidian') && options.imageStyle !== 'noImage');
  show(document.getElementById('fence'), options.codeBlockStyle === 'fenced');

  const downloadImages = options.downloadImages && options.downloadMode === 'downloadsApi';
  show(document.getElementById('imagePrefix'), downloadImages);

  const markdownEl = document.getElementById('markdown') as HTMLInputElement | null;
  const base64El = document.getElementById('base64') as HTMLInputElement | null;
  const obsidianEl = document.getElementById('obsidian') as HTMLInputElement | null;
  const obsidianNofolderEl = document.getElementById('obsidian-nofolder') as HTMLInputElement | null;

  if (markdownEl) markdownEl.disabled = !downloadImages;
  if (base64El) base64El.disabled = !downloadImages;
  if (obsidianEl) obsidianEl.disabled = !downloadImages;
  if (obsidianNofolderEl) obsidianNofolderEl.disabled = !downloadImages;
}

function setCurrentChoice(result: Options): void {
  options = result;

  if (!browser.downloads) {
    options.downloadMode = 'contentLink';
    getElements<HTMLInputElement>("[name='downloadMode']").forEach((el) => {
      el.disabled = true;
    });
    const downloadModeP = document.querySelector('#downloadMode p');
    if (downloadModeP) {
      downloadModeP.textContent = 'The Downloads API is unavailable in this browser.';
    }
  }

  const downloadImages = options.downloadImages && options.downloadMode === 'downloadsApi';
  if (!downloadImages && (options.imageStyle === 'markdown' || options.imageStyle.startsWith('obsidian'))) {
    options.imageStyle = 'originalSource';
  }

  getElement<HTMLTextAreaElement>("[name='frontmatter']").value = options.frontmatter;
  textareaInput.bind(getElement<HTMLTextAreaElement>("[name='frontmatter']"))();
  getElement<HTMLTextAreaElement>("[name='backmatter']").value = options.backmatter;
  textareaInput.bind(getElement<HTMLTextAreaElement>("[name='backmatter']"))();
  getElement<HTMLInputElement>("[name='title']").value = options.title;
  getElement<HTMLInputElement>("[name='disallowedChars']").value = options.disallowedChars || '';
  getElement<HTMLInputElement>("[name='includeTemplate']").checked = options.includeTemplate;
  getElement<HTMLInputElement>("[name='saveAs']").checked = options.saveAs;
  getElement<HTMLInputElement>("[name='downloadImages']").checked = options.downloadImages;
  getElement<HTMLInputElement>("[name='imagePrefix']").value = options.imagePrefix;
  getElement<HTMLInputElement>("[name='mdClipsFolder']").value = options.mdClipsFolder || '';
  getElement<HTMLInputElement>("[name='turndownEscape']").checked = options.turndownEscape;
  getElement<HTMLInputElement>("[name='contextMenus']").checked = options.contextMenus;
  getElement<HTMLInputElement>("[name='obsidianIntegration']").checked = options.obsidianIntegration;
  getElement<HTMLInputElement>("[name='obsidianVault']").value = options.obsidianVault;
  getElement<HTMLInputElement>("[name='obsidianFolder']").value = options.obsidianFolder;

  setCheckedValue(getElements("[name='headingStyle']"), options.headingStyle);
  setCheckedValue(getElements("[name='hr']"), options.hr);
  setCheckedValue(getElements("[name='bulletListMarker']"), options.bulletListMarker);
  setCheckedValue(getElements("[name='codeBlockStyle']"), options.codeBlockStyle);
  setCheckedValue(getElements("[name='fence']"), options.fence);
  setCheckedValue(getElements("[name='emDelimiter']"), options.emDelimiter);
  setCheckedValue(getElements("[name='strongDelimiter']"), options.strongDelimiter);
  setCheckedValue(getElements("[name='linkStyle']"), options.linkStyle);
  setCheckedValue(getElements("[name='linkReferenceStyle']"), options.linkReferenceStyle);
  setCheckedValue(getElements("[name='imageStyle']"), options.imageStyle);
  setCheckedValue(getElements("[name='imageRefStyle']"), options.imageRefStyle);
  setCheckedValue(getElements("[name='downloadMode']"), options.downloadMode);

  refreshElements();
}

async function restoreOptions(): Promise<void> {
  try {
    const result = await browser.storage.sync.get(defaultOptions as unknown as Record<string, unknown>);
    setCurrentChoice(result as unknown as Options);
  } catch (error) {
    console.error(error);
  }
}

function inputChange(e: Event): void {
  const target = e.target as HTMLInputElement;
  const key = target.name;
  let value: string | boolean = target.value;

  if (key === 'import-file') {
    const files = (target as HTMLInputElement).files;
    if (files && files[0]) {
      const fr = new FileReader();
      fr.onload = (ev) => {
        const lines = ev.target?.result as string;
        options = JSON.parse(lines);
        setCurrentChoice(options);
        browser.contextMenus.removeAll().then(() => createContextMenus());
        save();
        refreshElements();
      };
      fr.readAsText(files[0]);
    }
  } else {
    if (target.type === 'checkbox') {
      value = target.checked;
    }
    (options as unknown as Record<string, unknown>)[key] = value;

    if (key === 'contextMenus') {
      if (value) {
        createContextMenus();
      } else {
        browser.contextMenus.removeAll();
      }
    }

    save();
    refreshElements();
  }
}

function inputKeyup(e: Event): void {
  if (keyupTimeout) clearTimeout(keyupTimeout);
  keyupTimeout = setTimeout(inputChange, 500, e);
}

function buttonClick(e: Event): void {
  const target = e.target as HTMLButtonElement;

  if (target.id === 'import') {
    document.getElementById('import-file')?.click();
  } else if (target.id === 'export') {
    const json = JSON.stringify(options, null, 2);
    const blob = new Blob([json], { type: 'text/json' });
    const url = URL.createObjectURL(blob);
    const d = new Date();
    const datestring = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    browser.downloads.download({
      url,
      saveAs: true,
      filename: `MarkDownload-export-${datestring}.json`,
    });
  }
}

function loaded(): void {
  getElements<HTMLElement>('.radio-container,.checkbox-container,.textbox-container,.button-container').forEach((container) => {
    container.dataset.height = String(container.clientHeight);
  });

  restoreOptions();

  getElements<HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement>('input,textarea,button').forEach((input) => {
    if (input.tagName === 'TEXTAREA' || input.type === 'text') {
      input.addEventListener('keyup', inputKeyup);
    } else if (input.tagName === 'BUTTON') {
      input.addEventListener('click', buttonClick);
    } else {
      input.addEventListener('change', inputChange);
    }
  });
}

document.addEventListener('DOMContentLoaded', loaded);

getElements('.status').forEach((el) => {
  el.addEventListener('click', function (this: HTMLElement) {
    this.style.opacity = '0';
  });
});

getElements<HTMLTextAreaElement>('.input-sizer > textarea').forEach((el) => {
  el.addEventListener('input', textareaInput);
});
