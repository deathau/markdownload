// MarkDownload Service Worker for Manifest V3
// Debug logging enabled
console.log('MarkDownload Service Worker starting...');

// Import all required scripts for service worker
try {
  importScripts(
    '../browser-polyfill.min.js',
    'apache-mime-types.js',
    'moment.min.js', 
    'turndown.js',
    'turndown-plugin-gfm.js',
    'Readability.js'
  );
  console.log('MarkDownload: All scripts imported successfully');
} catch (e) {
  console.error('MarkDownload: Failed to import scripts:', e);
}

// Default options (from default-options.js)
const defaultOptions = {
  headingStyle: "atx",
  hr: "___",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  fence: "```",
  emDelimiter: "_",
  strongDelimiter: "**",
  linkStyle: "inlined",
  linkReferenceStyle: "full",
  imageStyle: "markdown",
  imageRefStyle: "inlined",
  frontmatter: "---\ncreated: {date:YYYY-MM-DDTHH:mm:ss} (UTC {date:Z})\ntags: [{keywords}]\nsource: {baseURI}\nauthor: {byline}\n---\n\n# {pageTitle}\n\n> ## Excerpt\n> {excerpt}\n\n---",
  backmatter: "",
  title: "{pageTitle}",
  includeTemplate: false,
  saveAs: false,
  downloadImages: false,
  imagePrefix: '{pageTitle}/',
  mdClipsFolder: null,
  disallowedChars: '[]#^',
  downloadMode: 'downloadsApi',
  turndownEscape: true,
  contextMenus: true,
  obsidianIntegration: false,
  obsidianVault: "",
  obsidianFolder: "",
};

// Function to get options from storage
async function getOptions() {
  let options = defaultOptions;
  try {
    const result = await chrome.storage.sync.get(defaultOptions);
    options = { ...defaultOptions, ...result };
  } catch (err) {
    console.error('MarkDownload: Failed to get options:', err);
  }
  if (!chrome.downloads) options.downloadMode = 'contentLink';
  return options;
}

// Service Worker Event Listeners
chrome.runtime.onStartup.addListener(() => {
  console.log('MarkDownload: Extension startup');
  createMenus().catch(e => console.error('MarkDownload: Failed to create menus on startup:', e));
});

chrome.runtime.onInstalled.addListener((details) => {
  console.log('MarkDownload: Extension installed/updated:', details.reason);
  createMenus().catch(e => console.error('MarkDownload: Failed to create menus on install:', e));
});

// Keep service worker alive
chrome.runtime.onSuspend.addListener(() => {
  console.log('MarkDownload: Service Worker is being suspended');
});

chrome.runtime.onSuspendCanceled.addListener(() => {
  console.log('MarkDownload: Service Worker suspension cancelled');
});

// Log platform info for debugging
chrome.runtime.getPlatformInfo().then(platformInfo => {
  console.log('MarkDownload Platform Info:', platformInfo);
  
  // Try to get browser info if available
  if (chrome.runtime.getBrowserInfo) {
    chrome.runtime.getBrowserInfo().then(browserInfo => {
      console.log('MarkDownload Browser Info:', browserInfo);
    }).catch(e => console.warn('MarkDownload: Could not get browser info:', e));
  }
}).catch(e => {
  console.warn('MarkDownload: Could not get platform info:', e);
});

// Initialize TurndownService prototype
if (typeof TurndownService !== 'undefined') {
  TurndownService.prototype.defaultEscape = TurndownService.prototype.escape;
  console.log('MarkDownload: TurndownService initialized');
}

// Core helper functions
function cleanAttribute(attribute) {
  return attribute ? attribute.replace(/(\n+\s*)+/g, '\n') : '';
}

function validateUri(href, baseURI) {
  try {
    new URL(href);
  } catch {
    const baseUri = new URL(baseURI);
    if (href.startsWith('/')) {
      href = baseUri.origin + href;
    } else {
      href = baseUri.href + (baseUri.href.endsWith('/') ? '' : '') + href;
    }
  }
  return href;
}

// Helper functions for Obsidian integration
function generateValidFileName(title, disallowedChars = null) {
  if (!title) return title;
  title = title + '';
  
  var illegalRe = /[\/\?<>\\:\*\|":]/g;
  var name = title.replace(illegalRe, "").replace(new RegExp('\u00A0', 'g'), ' ')
      .replace(new RegExp(/\s+/, 'g'), ' ')
      .trim();

  if (disallowedChars) {
    for (let c of disallowedChars) {
      if (`[\\^$.|?*+()`.includes(c)) c = `\\${c}`;
      name = name.replace(new RegExp(c, 'g'), '');
    }
  }
  
  return name;
}

function textReplace(string, article, disallowedChars = null) {
  for (const key in article) {
    if (article.hasOwnProperty(key) && key != "content") {
      let s = (article[key] || '') + '';
      if (s && disallowedChars) s = generateValidFileName(s, disallowedChars);

      string = string.replace(new RegExp('{' + key + '}', 'g'), s)
        .replace(new RegExp('{' + key + ':lower}', 'g'), s.toLowerCase())
        .replace(new RegExp('{' + key + ':upper}', 'g'), s.toUpperCase())
        .replace(new RegExp('{' + key + ':kebab}', 'g'), s.replace(/ /g, '-').toLowerCase())
        .replace(new RegExp('{' + key + ':mixed-kebab}', 'g'), s.replace(/ /g, '-'))
        .replace(new RegExp('{' + key + ':snake}', 'g'), s.replace(/ /g, '_').toLowerCase())
        .replace(new RegExp('{' + key + ':mixed_snake}', 'g'), s.replace(/ /g, '_'))
        .replace(new RegExp('{' + key + ':obsidian-cal}', 'g'), s.replace(/ /g, '-').replace(/-{2,}/g, "-"))
        .replace(new RegExp('{' + key + ':camel}', 'g'), s.replace(/ ./g, (str) => str.trim().toUpperCase()).replace(/^./, (str) => str.toLowerCase()))
        .replace(new RegExp('{' + key + ':pascal}', 'g'), s.replace(/ ./g, (str) => str.trim().toUpperCase()).replace(/^./, (str) => str.toUpperCase()));
    }
  }

  // Replace date formats
  const now = new Date();
  const dateRegex = /{date:(.+?)}/g;
  const matches = string.match(dateRegex);
  if (matches && matches.forEach) {
    matches.forEach(match => {
      const format = match.substring(6, match.length - 1);
      if (typeof moment !== 'undefined') {
        const dateString = moment(now).format(format);
        string = string.replaceAll(match, dateString);
      } else {
        // Fallback if moment is not available
        string = string.replaceAll(match, now.toISOString());
      }
    });
  }

  // Replace keywords
  const keywordRegex = /{keywords:?(.*)?}/g;
  const keywordMatches = string.match(keywordRegex);
  if (keywordMatches && keywordMatches.forEach) {
    keywordMatches.forEach(match => {
      let seperator = match.substring(10, match.length - 1);
      try {
        seperator = JSON.parse(JSON.stringify(seperator).replace(/\\\\/g, '\\'));
      } catch { }
      const keywordsString = (article.keywords || []).join(seperator);
      string = string.replace(new RegExp(match.replace(/\\/g, '\\\\'), 'g'), keywordsString);
    });
  }

  // Replace anything left in curly braces
  string = string.replace(/{(.*?)}/g, '');
  return string;
}

// Image processing functions moved to content script

// Text replacement functions moved to content script

// Polyfill for replaceAll if needed
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function(str, newStr) {
    if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') {
      return this.replace(str, newStr);
    }
    return this.replace(new RegExp(str, 'g'), newStr);
  };
}

// Context menu creation function
async function createMenus() {
  console.log('MarkDownload: Creating context menus');
  const options = await getOptions();
  
  try {
    await chrome.contextMenus.removeAll();
  } catch (e) {
    console.warn('MarkDownload: Failed to remove existing menus:', e);
  }

  if (options.contextMenus) {
    // Page context menus
    const pageMenuItems = [
      {
        id: "download-markdown-alltabs",
        title: "Download All Tabs as Markdown",
        contexts: ["all"]
      },
      {
        id: "separator-0",
        type: "separator", 
        contexts: ["all"]
      },
      {
        id: "download-markdown-selection",
        title: "Download Selection As Markdown",
        contexts: ["selection"]
      },
      {
        id: "download-markdown-all",
        title: "Download Tab As Markdown",
        contexts: ["all"]
      },
      {
        id: "separator-1",
        type: "separator",
        contexts: ["all"]
      },
      {
        id: "copy-markdown-selection",
        title: "Copy Selection As Markdown",
        contexts: ["selection"]
      },
      {
        id: "copy-markdown-link",
        title: "Copy Link As Markdown",
        contexts: ["link"]
      },
      {
        id: "copy-markdown-image",
        title: "Copy Image As Markdown", 
        contexts: ["image"]
      },
      {
        id: "copy-markdown-all",
        title: "Copy Tab As Markdown",
        contexts: ["all"]
      },
      {
        id: "copy-tab-as-markdown-link",
        title: "Copy Tab URL as Markdown Link",
        contexts: ["all"]
      },
      {
        id: "copy-tab-as-markdown-link-all",
        title: "Copy All Tab URLs as Markdown Link List",
        contexts: ["all"]
      },
      {
        id: "copy-tab-as-markdown-link-selected",
        title: "Copy Selected Tab URLs as Markdown Link List",
        contexts: ["all"]
      }
    ];

    // Add Obsidian integration menus if enabled
    if (options.obsidianIntegration) {
      pageMenuItems.push(
        {
          id: "copy-markdown-obsidian",
          title: "Send Text selection to Obsidian",
          contexts: ["selection"]
        },
        {
          id: "copy-markdown-obsall", 
          title: "Send Tab to Obsidian",
          contexts: ["all"]
        }
      );
    }

    // Add separator and toggle options
    pageMenuItems.push(
      {
        id: "separator-2", 
        type: "separator",
        contexts: ["all"]
      },
      {
        id: "toggle-includeTemplate",
        type: "checkbox",
        title: "Include front/back template",
        contexts: ["all"],
        checked: options.includeTemplate
      },
      {
        id: "toggle-downloadImages",
        type: "checkbox", 
        title: "Download Images",
        contexts: ["all"],
        checked: options.downloadImages
      }
    );

    // Create page context menus
    for (const item of pageMenuItems) {
      try {
        await chrome.contextMenus.create(item);
        console.log('MarkDownload: Created page menu item:', item.id, '- Title:', item.title);
      } catch (e) {
        console.warn('MarkDownload: Failed to create page menu item:', item.id, e);
      }
    }
    
    console.log('MarkDownload: Context menus created successfully');
    
    // Test: List all created menus for debugging
    try {
      const result = await new Promise((resolve) => {
        chrome.contextMenus.query({}, resolve);
      });
      console.log('MarkDownload: Verified menus exist:', result?.length || 'query not supported');
    } catch (e) {
      console.log('MarkDownload: Menu verification not available');
    }
  }
}

// Main Turndown conversion function
// Turndown conversion function moved to content script

// Message handling from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('MarkDownload: Received message:', message.type, 'from tab:', sender.tab?.id, 'message.tabId:', message?.tabId);
  
  // Handle message asynchronously
  (async () => {
    try {
      await handleMessage(message, sender, sendResponse);
    } catch (error) {
      console.error('MarkDownload: Message handling error:', error);
      sendResponse({ error: error.message });
    }
  })();
  
  return true; // Indicate async response
});

// Handle messages from content scripts and popup
async function handleMessage(message, sender, sendResponse) {
  try {
    if (message.type === "clip") {
      console.log('MarkDownload: Processing clip message');
      
      // Prefer tabId from message (popup), fallback to sender.tab.id
      const tabId = message.tabId || sender.tab?.id;
      if (!tabId) {
        sendResponse({ error: 'No valid tab ID' });
        return;
      }
      console.log('MarkDownload: Using tab ID for clip:', tabId);
      
      // Use complete processing in content script (including markdown conversion)
      const result = await getCompleteMarkdownFromContent(tabId, message.clipSelection);
      
      if (!result) {
        sendResponse({ error: 'Failed to process complete article' });
        return;
      }

      // Format folder
      const mdClipsFolder = await formatMdClipsFolder(result.article);

      // Send response back (for request) and also broadcast for popup listeners
      const responsePayload = {
        type: "display.md",
        markdown: result.markdown,
        article: result.article,
        imageList: result.imageList,
        mdClipsFolder: mdClipsFolder
      };
      try { sendResponse(responsePayload); } catch {}
      try { chrome.runtime.sendMessage(responsePayload); } catch {}
    } else if (message.type === "download") {
      console.log('MarkDownload: Processing download message');
      const tabId = message.tabId || sender.tab?.id;
      await downloadMarkdown(message.markdown, message.title, tabId, message.imageList, message.mdClipsFolder);
      sendResponse({ success: true });
    } else if (message.type === "recreateMenus") {
      console.log('MarkDownload: Recreating context menus');
      await createMenus();
      sendResponse({ success: true });
    } else {
      sendResponse({ error: 'Unknown message type: ' + message.type });
    }
  } catch (error) {
    console.error('MarkDownload: Error handling message:', error);
    sendResponse({ error: error.message });
  }
}

// Context menu click handlers  
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('MarkDownload: Context menu clicked:', info.menuItemId, 'on tab:', tab.id);
  console.log('MarkDownload: Full info object:', info);
  console.log('MarkDownload: Tab object:', tab);
  
  try {
    if (info.menuItemId === "copy-markdown-obsidian" || info.menuItemId === "copy-markdown-obsall") {
      console.log('MarkDownload: Routing to sendToObsidian');
      await sendToObsidian(info, tab);
    } else if (info.menuItemId.startsWith("copy-markdown")) {
      console.log('MarkDownload: Routing to copyMarkdownFromContext');
      await copyMarkdownFromContext(info, tab);
    } else if (info.menuItemId === "download-markdown-alltabs") {
      console.log('MarkDownload: Routing to downloadMarkdownForAllTabs');
      await downloadMarkdownForAllTabs(info);
    } else if (info.menuItemId.startsWith("download-markdown")) {
      console.log('MarkDownload: Routing to downloadMarkdownFromContext');
      await downloadMarkdownFromContext(info, tab);
    } else if (info.menuItemId.startsWith("copy-tab-as-markdown-link")) {
      console.log('MarkDownload: Routing to copyTabAsMarkdownLink');
      await copyTabAsMarkdownLink(tab);
    } else if (info.menuItemId.startsWith("toggle-")) {
      console.log('MarkDownload: Routing to toggleSetting');
      await toggleSetting(info.menuItemId.split('-')[1]);
    } else {
      console.warn('MarkDownload: Unhandled menu item:', info.menuItemId);
    }
    console.log('MarkDownload: Context menu action completed for:', info.menuItemId);
  } catch (error) {
    console.error('MarkDownload: Context menu action failed:', info.menuItemId, error);
  }
});

// Command handlers
chrome.commands.onCommand.addListener((command) => {
  console.log('MarkDownload: Command executed:', command);
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    
    if (command === "download_tab_as_markdown") {
      downloadMarkdownFromContext({ menuItemId: "download-markdown-all" }, tab);
    } else if (command === "copy_tab_as_markdown") {
      copyMarkdownFromContext({ menuItemId: "copy-markdown-all" }, tab);
    } else if (command === "copy_selection_as_markdown") {
      copyMarkdownFromContext({ menuItemId: "copy-markdown-selection" }, tab);
    } else if (command === "copy_tab_as_markdown_link") {
      copyTabAsMarkdownLink(tab);
    } else if (command === "copy_selection_to_obsidian") {
      sendToObsidian({ menuItemId: "copy-markdown-obsidian" }, tab);
    } else if (command === "copy_tab_to_obsidian") {
      sendToObsidian({ menuItemId: "copy-markdown-obsall" }, tab);
    }
  });
});

// Helper function to execute scripts in tabs (Manifest V3 compatible)
async function executeScript(tabId, func, args = []) {
  try {
    const result = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: func,
      args: args
    });
    return result[0]?.result;
  } catch (error) {
    console.error('MarkDownload: Failed to execute script:', error);
    throw error;
  }
}

// Helper function to inject content script if needed
async function ensureContentScript(tabId) {
  try {
    const result = await executeScript(tabId, () => {
      return typeof getSelectionAndDom === 'function';
    });
    
    if (!result) {
      console.log('MarkDownload: Injecting content script into tab:', tabId);
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['browser-polyfill.min.js', 'contentScript/contentScript.js']
      });
    }
  } catch (error) {
    console.error('MarkDownload: Failed to ensure content script:', error);
    throw error;
  }
}

// Function to get complete article and markdown from content script
async function getCompleteMarkdownFromContent(tabId, selection = false) {
  try {
    console.log('MarkDownload: Getting complete markdown from tab:', tabId, 'selection:', selection);
    await ensureContentScript(tabId);
    
    // Get options from storage
    const options = await getOptions();
    
    // Get DOM content
    const result = await executeScript(tabId, () => {
      return getSelectionAndDom();
    });
    
    if (!result || !result.dom) {
      console.error('MarkDownload: No DOM content received');
      return null;
    }
    
    // Process complete article in content script (including markdown conversion)
    const completeResult = await executeScript(tabId, (domString, options, selection) => {
      return processCompleteArticle(domString, options, selection);
    }, [result.dom, options, selection]);
    
    if (!completeResult) {
      console.error('MarkDownload: Failed to process complete article');
      return null;
    }
    
    console.log('MarkDownload: Complete markdown processed successfully, title:', completeResult.title, 'markdown length:', completeResult.markdown.length);
    return completeResult;
  } catch (error) {
    console.error('MarkDownload: Failed to get complete markdown from content:', error);
    return null;
  }
}

// Note: DOM processing has been moved to content script to avoid Service Worker limitations

// DOM-dependent functions have been moved to content script

async function formatMdClipsFolder(article) {
  let options = await getOptions();
  let mdClipsFolder = '';
  if (options.mdClipsFolder && options.downloadMode == 'downloadsApi') {
    mdClipsFolder = textReplace(options.mdClipsFolder, article, options.disallowedChars);
    mdClipsFolder = mdClipsFolder.split('/').map(s => generateValidFileName(s, options.disallowedChars)).join('/');
    if (!mdClipsFolder.endsWith('/')) mdClipsFolder += '/';
  }
  return mdClipsFolder;
}

// Download function
async function downloadMarkdown(markdown, title, tabId, imageList = {}, mdClipsFolder = '') {
  console.log('MarkDownload: Starting download process');
  console.log('MarkDownload: Download params - title:', title, 'tabId:', tabId, 'imageList keys:', Object.keys(imageList).length, 'mdClipsFolder:', mdClipsFolder);
  
  const options = await getOptions();
  console.log('MarkDownload: Options - downloadMode:', options.downloadMode, 'downloadImages:', options.downloadImages, 'saveAs:', options.saveAs);
  
  if (options.downloadMode == 'downloadsApi' && chrome.downloads) {
    console.log('MarkDownload: Using downloads API');
    // Use data URL directly; createObjectURL is not available in MV3 service worker
    const dataUrl = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(markdown);
    console.log('MarkDownload: Data URL length:', dataUrl.length);

    try {
      if (mdClipsFolder && !mdClipsFolder.endsWith('/')) mdClipsFolder += '/';
      const filename = mdClipsFolder + title + ".md";
      console.log('MarkDownload: Downloading file:', filename);
      
      const id = await chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: options.saveAs
      });
      console.log('MarkDownload: Download started with ID:', id);

      // Download images (if enabled)
      if (options.downloadImages && Object.keys(imageList).length > 0) {
        console.log('MarkDownload: Downloading images:', Object.keys(imageList).length);
        // Get the relative path of the markdown file (if any) for image path
        let destPath = mdClipsFolder + title.substring(0, title.lastIndexOf('/'));
        if(destPath && !destPath.endsWith('/')) destPath += '/';
        
        Object.entries(imageList).forEach(async ([src, filename]) => {
          try {
            // Start the download of the image
            const imgId = await chrome.downloads.download({
              url: src,
              // Set a destination path (relative to md file)
              filename: destPath ? destPath + filename : filename,
              saveAs: false
            });
            console.log('MarkDownload: Image download started:', filename);
          } catch (imgErr) {
            console.error('MarkDownload: Image download failed:', src, imgErr);
          }
        });
      }
    } catch (err) {
      console.error("MarkDownload: Download failed", err);
      console.error("MarkDownload: Error details:", err.message, err.stack);
    }
  } else {
    console.log('MarkDownload: Using content link fallback method');
    // Fallback to content link method
    try {
      await ensureContentScript(tabId);
      const filename = mdClipsFolder + generateValidFileName(title, options.disallowedChars) + ".md";
      console.log('MarkDownload: Fallback filename:', filename);
      
      const base64Data = btoa(encodeURIComponent(markdown).replace(/%([0-9A-F]{2})/g, function (match, p1) {
        return String.fromCharCode('0x' + p1);
      }));
      
      await executeScript(tabId, (filename, data) => {
        const link = document.createElement('a');
        link.download = filename;
        link.href = `data:text/markdown;base64,${data}`;
        link.click();
      }, [filename, base64Data]);
      console.log('MarkDownload: Fallback download completed');
    } catch (error) {
      console.error("MarkDownload: Content link download failed:", error);
      console.error("MarkDownload: Fallback error details:", error.message, error.stack);
    }
  }
}

// Context menu action handlers
async function downloadMarkdownFromContext(info, tab) {
  try {
    console.log('MarkDownload: Download from context menu');
    
    // Get complete markdown result from content script
    const result = await getCompleteMarkdownFromContent(tab.id, info.menuItemId === "download-markdown-selection");
    if (!result) {
      console.error('MarkDownload: Failed to get complete markdown result');
      return;
    }
    
    const mdClipsFolder = await formatMdClipsFolder(result.article);
    
    await downloadMarkdown(result.markdown, result.title, tab.id, result.imageList, mdClipsFolder);
  } catch (error) {
    console.error('MarkDownload: Download from context failed:', error);
  }
}

async function copyMarkdownFromContext(info, tab) {
  try {
    console.log('MarkDownload: Copy from context menu, menuItemId:', info.menuItemId);
    await ensureContentScript(tab.id);

    if (info.menuItemId === "copy-markdown-link") {
      console.log('MarkDownload: Processing link copy');
      const options = await getOptions();
      options.frontmatter = options.backmatter = '';
      const article = await getArticleFromContent(tab.id, false);
      if (!article) {
        console.error('MarkDownload: Failed to get article for link');
        return;
      }
      const { markdown } = turndown(`<a href="${info.linkUrl}">${info.linkText || info.selectionText}</a>`, { ...options, downloadImages: false }, article);
      console.log('MarkDownload: Link markdown generated, length:', markdown.length);
      
      await executeScript(tab.id, (text) => {
        console.log('MarkDownload: Copying link to clipboard, length:', text.length);
        navigator.clipboard.writeText(text).then(() => {
          console.log('MarkDownload: Link copied to clipboard successfully');
        }).catch(err => {
          console.error('MarkDownload: Failed to copy link to clipboard:', err);
        });
      }, [markdown]);
    } else if (info.menuItemId === "copy-markdown-image") {
      console.log('MarkDownload: Processing image copy');
      await executeScript(tab.id, (url) => {
        console.log('MarkDownload: Copying image to clipboard:', url);
        navigator.clipboard.writeText(`![](${url})`).then(() => {
          console.log('MarkDownload: Image copied to clipboard successfully');
        }).catch(err => {
          console.error('MarkDownload: Failed to copy image to clipboard:', err);
        });
      }, [info.srcUrl]);
    } else {
      console.log('MarkDownload: Processing general copy, selection:', info.menuItemId === "copy-markdown-selection");
      
      // Get complete markdown result (including conversion) from content script
      const result = await getCompleteMarkdownFromContent(tab.id, info.menuItemId === "copy-markdown-selection");
      if (!result) {
        console.error('MarkDownload: Failed to get complete markdown result');
        return;
      }
      
      console.log('MarkDownload: Complete result retrieved, title:', result.title, 'markdown length:', result.markdown?.length || 0);
      
      if (!result.markdown) {
        console.error('MarkDownload: No markdown content received');
        return;
      }
      
      // Copy to clipboard via content script
      await executeScript(tab.id, (markdown) => {
        console.log('MarkDownload ContentScript: Copying markdown to clipboard, length:', markdown?.length);
        
        if (!markdown) {
          console.error('MarkDownload ContentScript: No markdown content to copy');
          return false;
        }
        
        return copyToClipboard(markdown);
      }, [result.markdown]);
      
      console.log('MarkDownload: Copy operation completed');
    }
  } catch (error) {
    console.error('MarkDownload: Copy from context failed:', error);
  }
}

async function copyTabAsMarkdownLink(tab) {
  try {
    console.log('MarkDownload: Copy tab as markdown link');
    const result = await getCompleteMarkdownFromContent(tab.id, false);
    if (!result) {
      console.error('MarkDownload: Failed to get article for link');
      return;
    }
    
    await executeScript(tab.id, (title, url) => {
      const linkMarkdown = `[${title}](${url})`;
      console.log('MarkDownload ContentScript: Copying link to clipboard:', linkMarkdown);
      return copyToClipboard(linkMarkdown);
    }, [result.title, result.article.baseURI]);
  } catch (error) {
    console.error('MarkDownload: Copy tab link failed:', error);
  }
}

async function downloadMarkdownForAllTabs(info) {
  try {
    console.log('MarkDownload: Download all tabs as markdown');
    const tabs = await chrome.tabs.query({ currentWindow: true });
    
    for (const tab of tabs) {
      try {
        await downloadMarkdownFromContext(info, tab);
      } catch (e) {
        console.warn('MarkDownload: Failed to download tab:', tab.id, e);
      }
    }
  } catch (error) {
    console.error('MarkDownload: Download all tabs failed:', error);
  }
}

// Settings toggle
async function toggleSetting(setting, options = null) {
  if (options == null) {
    options = await getOptions();
  }
  
  options[setting] = !options[setting];
  await chrome.storage.sync.set(options);
  
  if (setting === "includeTemplate") {
    chrome.contextMenus.update("toggle-includeTemplate", {
      checked: options.includeTemplate
    });
  }
  
  if (setting === "downloadImages") {
    chrome.contextMenus.update("toggle-downloadImages", {
      checked: options.downloadImages
    });
  }
}

// Obsidian integration function (using clipboard method like original)
async function sendToObsidian(info, tab) {
  try {
    console.log('MarkDownload: Sending to Obsidian, menuItemId:', info.menuItemId);
    
    // Get complete markdown result from content script
    const result = await getCompleteMarkdownFromContent(tab.id, info.menuItemId === "copy-markdown-obsidian");
    if (!result) {
      console.error('MarkDownload: Failed to get complete markdown result for Obsidian');
      return;
    }
    
    console.log('MarkDownload: Obsidian result retrieved, title:', result.title, 'markdown length:', result.markdown?.length || 0);
    
    if (!result.markdown) {
      console.error('MarkDownload: No markdown content received for Obsidian');
      return;
    }
    
    // Get Obsidian options
    const options = await getOptions();
    if (!options.obsidianIntegration) {
      console.error('MarkDownload: Obsidian integration not enabled');
      return;
    }
    
    // Step 1: Copy markdown to clipboard (like original implementation)
    console.log('MarkDownload: Copying markdown to clipboard for Obsidian');
    await executeScript(tab.id, (markdown) => {
      console.log('MarkDownload ContentScript: Copying markdown to clipboard for Obsidian');
      return copyToClipboard(markdown);
    }, [result.markdown]);
    
    // Step 2: Prepare Obsidian URI using clipboard method
    const vault = options.obsidianVault || '';
    const folder = options.obsidianFolder || '';
    
    // Format folder like original implementation
    let obsidianFolder = '';
    if (folder) {
      // Use text replacement and filename generation like original
      obsidianFolder = result.article ? 
        textReplace(folder, result.article, options.disallowedChars) : folder;
      obsidianFolder = obsidianFolder.split('/').map(s => generateValidFileName(s, options.disallowedChars)).join('/');
      if (!obsidianFolder.endsWith('/')) obsidianFolder += '/';
    }
    
    // Generate filename like original
    const filename = generateValidFileName(result.title, options.disallowedChars);
    const filepath = obsidianFolder + filename;
    
    // Create Obsidian URI using clipboard method (like original)
    const obsidianUri = 'obsidian://advanced-uri?' + 
      'vault=' + encodeURIComponent(vault) +
      '&clipboard=true' +
      '&mode=new' +
      '&filepath=' + encodeURIComponent(filepath);
    
    console.log('MarkDownload: Opening Obsidian URI (clipboard method):', obsidianUri);
    
    // Try to open Obsidian URI directly
    try {
      // Method 1: Try to update current tab (most direct)
      await chrome.tabs.update(tab.id, { url: obsidianUri });
      console.log('MarkDownload: Obsidian URI opened successfully via tab update');
    } catch (error) {
      console.log('MarkDownload: Tab update failed, trying alternative method:', error);
      
      // Method 2: Fallback to creating new tab
      try {
        await chrome.tabs.create({ url: obsidianUri });
        console.log('MarkDownload: Obsidian URI opened successfully via new tab');
      } catch (error2) {
        console.error('MarkDownload: All methods failed:', error2);
        
        // Method 3: Final fallback - show notification with manual instructions
        await executeScript(tab.id, (uri) => {
          alert('MarkDownload: Content copied to clipboard!\n\nTo open in Obsidian:\n1. Open Obsidian\n2. Create new note\n3. Paste content (Ctrl+V)\n\nOr click OK to try opening Obsidian URI again.');
          window.open(uri, '_blank');
        }, [obsidianUri]);
      }
    }
    
    console.log('MarkDownload: Obsidian operation completed');
  } catch (error) {
    console.error('MarkDownload: Send to Obsidian failed:', error);
  }
}

console.log('MarkDownload Service Worker fully loaded and ready');
