import browser from 'webextension-polyfill';
import {
  downloadMarkdownFromContext,
  copyMarkdownFromContext,
  copyTabAsMarkdownLink,
  copySelectedTabAsMarkdownLink,
} from './context-menu-handler';

const COMMAND_HANDLERS: Record<
  string,
  (tab: browser.Tabs.Tab) => Promise<void>
> = {
  download_tab_as_markdown: async (tab) => {
    await downloadMarkdownFromContext({ menuItemId: 'download-markdown-all' }, tab);
  },
  copy_tab_as_markdown: async (tab) => {
    await copyMarkdownFromContext({ menuItemId: 'copy-markdown-all' }, tab);
  },
  copy_selection_as_markdown: async (tab) => {
    await copyMarkdownFromContext({ menuItemId: 'copy-markdown-selection' }, tab);
  },
  copy_tab_as_markdown_link: async (tab) => {
    await copyTabAsMarkdownLink(tab);
  },
  copy_selected_tab_as_markdown_link: async (tab) => {
    await copySelectedTabAsMarkdownLink(tab);
  },
  copy_selection_to_obsidian: async (tab) => {
    await copyMarkdownFromContext({ menuItemId: 'copy-markdown-obsidian' }, tab);
  },
  copy_tab_to_obsidian: async (tab) => {
    await copyMarkdownFromContext({ menuItemId: 'copy-markdown-obsall' }, tab);
  },
};

export async function handleCommand(command: string): Promise<void> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

  const handler = COMMAND_HANDLERS[command];
  if (handler && tab) {
    await handler(tab);
  }
}
