// create the context menus
async function createMenus() {
  const options = await getOptions();

  chrome.contextMenus.removeAll();

  if (options.contextMenus) {

    // tab menu (chrome does not support this)
    try {
      chrome.contextMenus.create({
        id: "download-markdown-tab",
        title: "Download Tab as Markdown",
        contexts: ["tab"]
      }, () => { });

      chrome.contextMenus.create({
        id: "tab-download-markdown-alltabs",
        title: "Download All Tabs as Markdown",
        contexts: ["tab"]
      }, () => { });

      chrome.contextMenus.create({
        id: "copy-tab-as-markdown-link-tab",
        title: "Copy Tab URL as Markdown Link",
        contexts: ["tab"]
      }, () => { });

      chrome.contextMenus.create({
        id: "copy-tab-as-markdown-link-all-tab",
        title: "Copy All Tab URLs as Markdown Link List",
        contexts: ["tab"]
      }, () => { });

      chrome.contextMenus.create({
        id: "copy-tab-as-markdown-link-selected-tab",
        title: "Copy Selected Tab URLs as Markdown Link List",
        contexts: ["tab"]
      }, () => { });

      chrome.contextMenus.create({
        id: "tab-separator-1",
        type: "separator",
        contexts: ["tab"]
      }, () => { });

      chrome.contextMenus.create({
        id: "tabtoggle-includeTemplate",
        type: "checkbox",
        title: "Include front/back template",
        contexts: ["tab"],
        checked: options.includeTemplate
      }, () => { });

      chrome.contextMenus.create({
        id: "tabtoggle-downloadImages",
        type: "checkbox",
        title: "Download Images",
        contexts: ["tab"],
        checked: options.downloadImages
      }, () => { });
    } catch {

    }
    // add the download all tabs option to the page context menu as well
    chrome.contextMenus.create({
      id: "download-markdown-alltabs",
      title: "Download All Tabs as Markdown",
      contexts: ["all"]
    }, () => { });
    chrome.contextMenus.create({
      id: "separator-0",
      type: "separator",
      contexts: ["all"]
    }, () => { });

    // download actions
    chrome.contextMenus.create({
      id: "download-markdown-selection",
      title: "Download Selection As Markdown",
      contexts: ["selection"]
    }, () => { });
    chrome.contextMenus.create({
      id: "download-markdown-all",
      title: "Download Tab As Markdown",
      contexts: ["all"]
    }, () => { });

    chrome.contextMenus.create({
      id: "separator-1",
      type: "separator",
      contexts: ["all"]
    }, () => { });

    // copy to clipboard actions
    chrome.contextMenus.create({
      id: "copy-markdown-selection",
      title: "Copy Selection As Markdown",
      contexts: ["selection"]
    }, () => { });
    chrome.contextMenus.create({
      id: "copy-markdown-link",
      title: "Copy Link As Markdown",
      contexts: ["link"]
    }, () => { });
    chrome.contextMenus.create({
      id: "copy-markdown-image",
      title: "Copy Image As Markdown",
      contexts: ["image"]
    }, () => { });
    chrome.contextMenus.create({
      id: "copy-markdown-all",
      title: "Copy Tab As Markdown",
      contexts: ["all"]
    }, () => { });
    chrome.contextMenus.create({
      id: "copy-tab-as-markdown-link",
      title: "Copy Tab URL as Markdown Link",
      contexts: ["all"]
    }, () => { });
    chrome.contextMenus.create({
      id: "copy-tab-as-markdown-link-all",
      title: "Copy All Tab URLs as Markdown Link List",
      contexts: ["all"]
    }, () => { });
    chrome.contextMenus.create({
      id: "copy-tab-as-markdown-link-selected",
      title: "Copy Selected Tab URLs as Markdown Link List",
      contexts: ["all"]
    }, () => { });
  
    chrome.contextMenus.create({
      id: "separator-2",
      type: "separator",
      contexts: ["all"]
    }, () => { });

    if(options.obsidianIntegration){
      // copy to clipboard actions
      chrome.contextMenus.create({
        id: "copy-markdown-obsidian",
        title: "Send Text selection to Obsidian",
        contexts: ["selection"]
      }, () => { });
      chrome.contextMenus.create({
        id: "copy-markdown-obsall",
        title: "Send Tab to Obsidian",
        contexts: ["all"]
      }, () => { });
    }
    chrome.contextMenus.create({
      id: "separator-3",
      type: "separator",
      contexts: ["all"]
    }, () => { });

    // options
    chrome.contextMenus.create({
      id: "toggle-includeTemplate",
      type: "checkbox",
      title: "Include front/back template",
      contexts: ["all"],
      checked: options.includeTemplate
    }, () => { });

    chrome.contextMenus.create({
      id: "toggle-downloadImages",
      type: "checkbox",
      title: "Download Images",
      contexts: ["all"],
      checked: options.downloadImages
    }, () => { });
  }
}