import browser from 'webextension-polyfill';
import type { Message } from '@/shared/types';
import { handleMessage } from '@/background/message-handler';
import { handleCommand } from '@/background/commands-handler';
import { handleContextMenuClick } from '@/background/context-menu-handler';
import { createContextMenus } from '@/shared/context-menus';

// Log platform info on startup
browser.runtime.getPlatformInfo().then(async (platformInfo) => {
  try {
    const browserInfo = browser.runtime.getBrowserInfo
      ? await browser.runtime.getBrowserInfo()
      : { name: 'Unknown', version: 'Unknown' };
    console.info('Platform:', platformInfo, 'Browser:', browserInfo);
  } catch {
    console.info('Platform:', platformInfo);
  }
});

// Initialize context menus on install
browser.runtime.onInstalled.addListener(() => {
  createContextMenus().catch(console.error);
});

// Also create menus on startup (service worker can be terminated)
browser.runtime.onStartup.addListener(() => {
  createContextMenus().catch(console.error);
});

// Message listener
browser.runtime.onMessage.addListener((message: unknown, sender: browser.Runtime.MessageSender) => {
  handleMessage(message as Message, sender).catch(console.error);
  return true;
});

// Command listener
browser.commands.onCommand.addListener((command) => {
  handleCommand(command).catch(console.error);
});

// Context menu listener
browser.contextMenus.onClicked.addListener((info, tab) => {
  handleContextMenuClick(info, tab).catch(console.error);
});

// Storage change listener for syncing menu states
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync') return;

  if (changes.contextMenus) {
    if (changes.contextMenus.newValue) {
      createContextMenus().catch(console.error);
    } else {
      browser.contextMenus.removeAll().catch(console.error);
    }
  }
});
