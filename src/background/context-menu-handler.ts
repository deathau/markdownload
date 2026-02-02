import browser from 'webextension-polyfill';
import type { Options } from '@/shared/types';
import { getOptions, updateOption } from '@/shared/storage';
import { getArticleFromContent } from './article-handler';
import { ensureScripts, copyToClipboard } from './script-injector';
import {
  convertArticleToMarkdown,
  formatTitle,
  formatMdClipsFolder,
  formatObsidianFolder,
} from '@/lib/markdown/converter';
import { convertHtmlToMarkdown } from '@/lib/turndown';
import { generateValidFileName } from '@/lib/markdown/filename-generator';
import { downloadMarkdown } from '@/lib/download';

export async function handleContextMenuClick(
  info: browser.Menus.OnClickData,
  tab?: browser.Tabs.Tab
): Promise<void> {
  if (!tab?.id) return;

  const menuItemId = String(info.menuItemId);

  if (menuItemId.startsWith('copy-markdown')) {
    await copyMarkdownFromContext(info, tab);
  } else if (
    menuItemId === 'download-markdown-alltabs' ||
    menuItemId === 'tab-download-markdown-alltabs'
  ) {
    await downloadMarkdownForAllTabs();
  } else if (menuItemId.startsWith('download-markdown')) {
    await downloadMarkdownFromContext(info, tab);
  } else if (menuItemId.startsWith('copy-tab-as-markdown-link-all')) {
    await copyTabAsMarkdownLinkAll(tab);
  } else if (menuItemId.startsWith('copy-tab-as-markdown-link-selected')) {
    await copySelectedTabAsMarkdownLink(tab);
  } else if (menuItemId.startsWith('copy-tab-as-markdown-link')) {
    await copyTabAsMarkdownLink(tab);
  } else if (menuItemId.startsWith('toggle-') || menuItemId.startsWith('tabtoggle-')) {
    const setting = menuItemId.split('-')[1] as keyof Options;
    await toggleSetting(setting);
  }
}

export async function downloadMarkdownFromContext(
  info: browser.Menus.OnClickData | { menuItemId: string },
  tab: browser.Tabs.Tab
): Promise<void> {
  if (!tab.id) return;

  const menuItemId = String(info.menuItemId);
  const isSelection = menuItemId === 'download-markdown-selection';

  const article = await getArticleFromContent(tab.id, isSelection);
  if (!article) return;

  const title = await formatTitle(article);
  const { markdown, imageList } = await convertArticleToMarkdown(article);
  const mdClipsFolder = await formatMdClipsFolder(article);

  await downloadMarkdown(markdown, title, tab.id, imageList, mdClipsFolder);
}

export async function copyMarkdownFromContext(
  info: browser.Menus.OnClickData | { menuItemId: string },
  tab: browser.Tabs.Tab
): Promise<void> {
  if (!tab.id) return;

  await ensureScripts(tab.id);

  const menuItemId = String(info.menuItemId);
  const options = await getOptions();

  if (menuItemId === 'copy-markdown-link') {
    const linkUrl = (info as browser.Menus.OnClickData).linkUrl;
    const linkText =
      (info as browser.Menus.OnClickData).linkText ||
      (info as browser.Menus.OnClickData).selectionText ||
      '';

    const article = await getArticleFromContent(tab.id, false);
    if (!article) return;

    const { markdown } = convertHtmlToMarkdown(
      `<a href="${linkUrl}">${linkText}</a>`,
      { ...options, downloadImages: false, frontmatter: '', backmatter: '' },
      article
    );
    await copyToClipboard(tab.id, markdown);
  } else if (menuItemId === 'copy-markdown-image') {
    const srcUrl = (info as browser.Menus.OnClickData).srcUrl;
    await copyToClipboard(tab.id, `![](${srcUrl})`);
  } else if (menuItemId === 'copy-markdown-obsidian') {
    const article = await getArticleFromContent(tab.id, true);
    if (!article) return;

    const title = await formatTitle(article);
    const obsidianFolder = await formatObsidianFolder(article);
    const { markdown } = await convertArticleToMarkdown(article, false);

    await copyToClipboard(tab.id, markdown);
    await browser.tabs.update({
      url: `obsidian://advanced-uri?vault=${options.obsidianVault}&clipboard=true&mode=new&filepath=${obsidianFolder}${generateValidFileName(title)}`,
    });
  } else if (menuItemId === 'copy-markdown-obsall') {
    const article = await getArticleFromContent(tab.id, false);
    if (!article) return;

    const title = await formatTitle(article);
    const obsidianFolder = await formatObsidianFolder(article);
    const { markdown } = await convertArticleToMarkdown(article, false);

    await copyToClipboard(tab.id, markdown);
    await browser.tabs.update({
      url: `obsidian://advanced-uri?vault=${options.obsidianVault}&clipboard=true&mode=new&filepath=${obsidianFolder}${generateValidFileName(title)}`,
    });
  } else {
    const isSelection = menuItemId === 'copy-markdown-selection';
    const article = await getArticleFromContent(tab.id, isSelection);
    if (!article) return;

    const { markdown } = await convertArticleToMarkdown(article, false);
    await copyToClipboard(tab.id, markdown);
  }
}

export async function copyTabAsMarkdownLink(tab: browser.Tabs.Tab): Promise<void> {
  if (!tab.id) return;

  try {
    await ensureScripts(tab.id);
    const article = await getArticleFromContent(tab.id);
    if (!article) return;

    const title = await formatTitle(article);
    await copyToClipboard(tab.id, `[${title}](${article.baseURI})`);
  } catch (error) {
    console.error('Failed to copy as markdown link:', error);
  }
}

export async function copyTabAsMarkdownLinkAll(tab: browser.Tabs.Tab): Promise<void> {
  if (!tab.id) return;

  try {
    const options = await getOptions();
    const tabs = await browser.tabs.query({ currentWindow: true });

    const links: string[] = [];
    for (const t of tabs) {
      if (!t.id) continue;
      await ensureScripts(t.id);
      const article = await getArticleFromContent(t.id);
      if (!article) continue;

      const title = await formatTitle(article);
      links.push(`${options.bulletListMarker} [${title}](${article.baseURI})`);
    }

    const markdown = links.join('\n');
    await copyToClipboard(tab.id, markdown);
  } catch (error) {
    console.error('Failed to copy as markdown link:', error);
  }
}

export async function copySelectedTabAsMarkdownLink(tab: browser.Tabs.Tab): Promise<void> {
  if (!tab.id) return;

  try {
    const options = await getOptions();
    const tabs = await browser.tabs.query({ currentWindow: true, highlighted: true });

    const links: string[] = [];
    for (const t of tabs) {
      if (!t.id) continue;
      await ensureScripts(t.id);
      const article = await getArticleFromContent(t.id);
      if (!article) continue;

      const title = await formatTitle(article);
      links.push(`${options.bulletListMarker} [${title}](${article.baseURI})`);
    }

    const markdown = links.join('\n');
    await copyToClipboard(tab.id, markdown);
  } catch (error) {
    console.error('Failed to copy as markdown link:', error);
  }
}

async function toggleSetting(setting: keyof Options): Promise<void> {
  const options = await getOptions();
  const currentValue = options[setting];

  if (typeof currentValue === 'boolean') {
    const newValue = !currentValue;
    await updateOption(setting, newValue as Options[typeof setting]);

    if (setting === 'includeTemplate' || setting === 'downloadImages') {
      try {
        await browser.contextMenus.update(`toggle-${setting}`, { checked: newValue });
      } catch {
        // Ignore errors if menu doesn't exist
      }
      try {
        await browser.contextMenus.update(`tabtoggle-${setting}`, { checked: newValue });
      } catch {
        // Ignore errors if menu doesn't exist
      }
    }
  }
}

async function downloadMarkdownForAllTabs(): Promise<void> {
  const tabs = await browser.tabs.query({ currentWindow: true });

  for (const tab of tabs) {
    if (!tab.id) continue;
    await downloadMarkdownFromContext({ menuItemId: 'download-markdown-all' }, tab);
  }
}
