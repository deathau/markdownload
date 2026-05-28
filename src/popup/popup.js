
// default variables
var selectedText = null;
var imageList = null;
var mdClipsFolder = '';

const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
// set up event handlers
const cm = CodeMirror.fromTextArea(document.getElementById("md"), {
    theme: darkMode ? "xq-dark" : "xq-light",
    mode: "markdown",
    lineWrapping: true
});
cm.on("cursorActivity", (cm) => {
    const somethingSelected = cm.somethingSelected();
    var a = document.getElementById("downloadSelection");

    if (somethingSelected) {
        if(a.style.display != "block") a.style.display = "block";
    }
    else {
        if(a.style.display != "none") a.style.display = "none";
    }
});
document.getElementById("download").addEventListener("click", download);
document.getElementById("downloadSelection").addEventListener("click", downloadSelection);

const defaultOptions = {
    includeTemplate: false,
    clipSelection: true,
    downloadImages: false
}

const checkInitialSettings = options => {
    if (options.includeTemplate)
        document.querySelector("#includeTemplate").classList.add("checked");

    if (options.downloadImages)
        document.querySelector("#downloadImages").classList.add("checked");

    if (options.clipSelection)
        document.querySelector("#selected").classList.add("checked");
    else
        document.querySelector("#document").classList.add("checked");
}

const toggleClipSelection = options => {
    options.clipSelection = !options.clipSelection;
    document.querySelector("#selected").classList.toggle("checked");
    document.querySelector("#document").classList.toggle("checked");
    browser.storage.sync.set(options).then(() => clipSite()).catch((error) => {
        console.error(error);
    });
}

const toggleIncludeTemplate = options => {
    options.includeTemplate = !options.includeTemplate;
    document.querySelector("#includeTemplate").classList.toggle("checked");
    browser.storage.sync.set(options).then(() => {
        browser.contextMenus.update("toggle-includeTemplate", {
            checked: options.includeTemplate
        });
        try {
            browser.contextMenus.update("tabtoggle-includeTemplate", {
                checked: options.includeTemplate
            });
        } catch { }
        return clipSite()
    }).catch((error) => {
        console.error(error);
    });
}

const toggleDownloadImages = options => {
    options.downloadImages = !options.downloadImages;
    document.querySelector("#downloadImages").classList.toggle("checked");
    browser.storage.sync.set(options).then(() => {
        browser.contextMenus.update("toggle-downloadImages", {
            checked: options.downloadImages
        });
        try {
            browser.contextMenus.update("tabtoggle-downloadImages", {
                checked: options.downloadImages
            });
        } catch { }
    }).catch((error) => {
        console.error(error);
    });
}
const showOrHideClipOption = selection => {
    if (selection) {
        document.getElementById("clipOption").style.display = "flex";
    }
    else {
        document.getElementById("clipOption").style.display = "none";
    }
}

const clipSite = id => {
    return chrome.scripting.executeScript({
        target: { tabId: id },
        func: () => getSelectionAndDom()
    }).then((results) => {
            const result = results && results[0] && results[0].result;
            if (result) {
                showOrHideClipOption(result.selection);
                let message = {
                    type: "clip",
                    dom: result.dom,
                    selection: result.selection
                }
                return browser.storage.sync.get(defaultOptions).then(options => {
                    return browser.runtime.sendMessage({
                        ...message,
                        ...options
                    });
                }).catch(err => {
                    console.error(err);
                    showError(err)
                    return browser.runtime.sendMessage({
                        ...message,
                        ...defaultOptions
                    });
                }).catch(err => {
                    console.error(err);
                    showError(err)
                });
            }
        }).catch(err => {
            console.error(err);
            showError(err)
        });
}

// inject the necessary scripts
browser.storage.sync.get(defaultOptions).then(options => {
    checkInitialSettings(options);
    
    document.getElementById("selected").addEventListener("click", (e) => {
        e.preventDefault();
        toggleClipSelection(options);
    });
    document.getElementById("document").addEventListener("click", (e) => {
        e.preventDefault();
        toggleClipSelection(options);
    });
    document.getElementById("includeTemplate").addEventListener("click", (e) => {
        e.preventDefault();
        toggleIncludeTemplate(options);
    });
    document.getElementById("downloadImages").addEventListener("click", (e) => {
        e.preventDefault();
        toggleDownloadImages(options);
    });
    
    return browser.tabs.query({
        currentWindow: true,
        active: true
    });
}).then((tabs) => {
    var id = tabs[0].id;
    var url = tabs[0].url;
    // Cannot inject scripts into chrome://, extension, or file:// pages
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
        showError('Cannot clip this page (restricted URL).');
        return;
    }
    chrome.scripting.executeScript({ target: { tabId: id }, files: ['/browser-polyfill.min.js'] })
    .then(() => {
        return chrome.scripting.executeScript({ target: { tabId: id }, files: ['/contentScript/contentScript.js'] });
    }).then(() => {
        console.info("Successfully injected MarkDownload content script");
        return clipSite(id);
    }).catch((error) => {
        console.error(error);
        showError(error);
    });
});

// listen for notifications from the background page
browser.runtime.onMessage.addListener(notify);

//function to send the download message to the background page
function sendDownloadMessage(text) {
    if (text != null) {

        return browser.tabs.query({
            currentWindow: true,
            active: true
        }).then(tabs => {
            var message = {
                type: "download",
                markdown: text,
                title: document.getElementById("title").value,
                tab: tabs[0],
                imageList: imageList,
                mdClipsFolder: mdClipsFolder
            };
            return browser.runtime.sendMessage(message);
        });
    }
}

// event handler for download button
async function download(e) {
    e.preventDefault();
    await sendDownloadMessage(cm.getValue());
    window.close();
}

// event handler for download selected button
async function downloadSelection(e) {
    e.preventDefault();
    if (cm.somethingSelected()) {
        await sendDownloadMessage(cm.getSelection());
    }
}

//function that handles messages from the injected script into the site
function notify(message) {
    // message for displaying markdown
    if (message.type == "display.md") {

        // set the values from the message
        //document.getElementById("md").value = message.markdown;
        cm.setValue(message.markdown);
        document.getElementById("title").value = message.article.title;
        imageList = message.imageList;
        mdClipsFolder = message.mdClipsFolder;
        
        // show the hidden elements
        document.getElementById("container").style.display = 'flex';
        document.getElementById("spinner").style.display = 'none';
         // focus the download button
        document.getElementById("download").focus();
        cm.refresh();
    }
}

function showError(err) {
    // show the hidden elements
    document.getElementById("container").style.display = 'flex';
    document.getElementById("spinner").style.display = 'none';
    cm.setValue(`Error clipping the page\n\n${err}`)
}


// ── Page Saver extras ────────────────────────────────────────────────────────

const psStatus = document.getElementById('ps-status');
function psSetStatus(msg) { psStatus.textContent = msg; }

function psSend(type, extra = {}) {
  return browser.runtime.sendMessage({ type, ...extra });
}

document.getElementById('ps-open-links').addEventListener('click', async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  psSend('ps-open-links', { tabId: tab.id });
  psSetStatus('Opening links...');
});

document.getElementById('ps-crawl-domain').addEventListener('click', async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  psSend('ps-crawl-domain', { tabId: tab.id, url: tab.url });
  psSetStatus('Crawling domain: ' + new URL(tab.url).hostname + ' …');
});

document.getElementById('ps-stop-crawl').addEventListener('click', () => {
  psSend('ps-stop-crawl');
  psSetStatus('Crawl stopped.');
});

document.getElementById('ps-html-one').addEventListener('click', async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  psSetStatus('Saving HTML...');
  await psSend('ps-save-html', { tabs: [tab] });
  psSetStatus('Done.');
});

document.getElementById('ps-png-one').addEventListener('click', async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  psSetStatus('Saving screenshot...');
  psSend('ps-save-png', { tabs: [tab] });
  psSetStatus('Done.');
});

document.getElementById('ps-pdf-one').addEventListener('click', async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  psSetStatus('Saving PDF...');
  psSend('ps-save-pdf', { tabs: [tab] });
  psSetStatus('Done — check Downloads/page-saver/');
});

document.getElementById('ps-md-all').addEventListener('click', async () => {
  const tabs = await browser.tabs.query({ currentWindow: true });
  psSetStatus(`Saving ${tabs.length} tabs as Markdown...`);
  psSend('ps-save-md-all', { tabs });
  psSetStatus('Running in background...');
});

document.getElementById('ps-html-all').addEventListener('click', async () => {
  const tabs = await browser.tabs.query({ currentWindow: true });
  psSetStatus(`Saving ${tabs.length} tabs as HTML...`);
  psSend('ps-save-html', { tabs });
  psSetStatus('Running in background...');
});

document.getElementById('ps-png-all').addEventListener('click', async () => {
  const tabs = await browser.tabs.query({ currentWindow: true });
  psSend('ps-save-png', { tabs });
  psSetStatus('Screenshots running in background...');
});

document.getElementById('ps-pdf-all').addEventListener('click', async () => {
  const tabs = await browser.tabs.query({ currentWindow: true });
  psSend('ps-save-pdf', { tabs });
  psSetStatus('PDF export running in background...');
});

document.getElementById('ps-show-logs').addEventListener('click', async () => {
  const { _debugLog = [] } = await browser.storage.local.get('_debugLog');
  const text = _debugLog.length ? _debugLog.join('\n') : '(no logs yet)';
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  await browser.downloads.download({ url, filename: 'markdownload-debug.txt', saveAs: false });
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  psSetStatus('Log saved to downloads.');
});
