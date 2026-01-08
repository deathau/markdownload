// Popup Script for MarkDownload - Manifest V3

// Default variables
var selectedText = null;
var imageList = null;
var mdClipsFolder = '';

const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

// Set up CodeMirror editor
const cm = CodeMirror.fromTextArea(document.getElementById("md"), {
  theme: darkMode ? "xq-dark" : "xq-light",
  mode: "markdown",
  lineWrapping: true
});

cm.on("cursorActivity", (cm) => {
  const somethingSelected = cm.somethingSelected();
  var a = document.getElementById("downloadSelection");

  if (somethingSelected) {
    if (a.style.display != "block") a.style.display = "block";
  }
  else {
    if (a.style.display != "none") a.style.display = "none";
  }
});

document.getElementById("download").addEventListener("click", download);
document.getElementById("downloadSelection").addEventListener("click", downloadSelection);

const defaultOptions = {
  includeTemplate: false,
  clipSelection: true,
  downloadImages: false
};

const checkInitialSettings = options => {
  if (options.includeTemplate)
    document.querySelector("#includeTemplate").classList.add("checked");

  if (options.downloadImages)
    document.querySelector("#downloadImages").classList.add("checked");

  if (options.clipSelection)
    document.querySelector("#selected").classList.add("checked");
  else
    document.querySelector("#document").classList.add("checked");
};

const toggleClipSelection = options => {
  options.clipSelection = !options.clipSelection;
  document.querySelector("#selected").classList.toggle("checked");
  document.querySelector("#document").classList.toggle("checked");
  chrome.storage.sync.set(options).then(() => clipSite()).catch((error) => {
    console.error(error);
  });
};

const toggleIncludeTemplate = options => {
  options.includeTemplate = !options.includeTemplate;
  document.querySelector("#includeTemplate").classList.toggle("checked");
  chrome.storage.sync.set(options).then(() => {
    try {
      chrome.contextMenus.update("toggle-includeTemplate", {
        checked: options.includeTemplate
      });
    } catch (e) { /* menu might not exist */ }
    try {
      chrome.contextMenus.update("tabtoggle-includeTemplate", {
        checked: options.includeTemplate
      });
    } catch (e) { /* menu might not exist */ }
    return clipSite();
  }).catch((error) => {
    console.error(error);
  });
};

const toggleDownloadImages = options => {
  options.downloadImages = !options.downloadImages;
  document.querySelector("#downloadImages").classList.toggle("checked");
  chrome.storage.sync.set(options).then(() => {
    try {
      chrome.contextMenus.update("toggle-downloadImages", {
        checked: options.downloadImages
      });
    } catch (e) { /* menu might not exist */ }
    try {
      chrome.contextMenus.update("tabtoggle-downloadImages", {
        checked: options.downloadImages
      });
    } catch (e) { /* menu might not exist */ }
  }).catch((error) => {
    console.error(error);
  });
};

const showOrHideClipOption = selection => {
  if (selection) {
    document.getElementById("clipOption").style.display = "flex";
  }
  else {
    document.getElementById("clipOption").style.display = "none";
  }
};

const clipSite = async (id) => {
  try {
    // Get the current tab if id is not provided
    if (!id) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      id = tab.id;
    }

    // Send message to content script to get selection and DOM
    const result = await chrome.tabs.sendMessage(id, { type: "getSelectionAndDom" });

    if (result && result.dom) {
      showOrHideClipOption(result.selection);

      const options = await chrome.storage.sync.get(defaultOptions);

      const message = {
        type: "clip",
        dom: result.dom,
        selection: result.selection,
        ...options
      };

      // Send to background service worker
      const response = await chrome.runtime.sendMessage(message);

      if (response && response.type === "display.md") {
        notify(response);
      }
    }
  } catch (err) {
    console.error(err);
    showError(err);
  }
};

// Initialize the popup
async function init() {
  try {
    const options = await chrome.storage.sync.get(defaultOptions);
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

    // Get the current tab and clip the site
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.info("Clipping site from tab:", tab.id);
    await clipSite(tab.id);
  } catch (error) {
    console.error(error);
    showError(error);
  }
}

// Start initialization
init();

// Listen for notifications from the background service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "display.md") {
    notify(message);
  }
  sendResponse({ received: true });
  return true;
});

// Function to send the download message to the background service worker
async function sendDownloadMessage(text) {
  if (text != null) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const message = {
        type: "download",
        markdown: text,
        title: document.getElementById("title").value,
        tab: tab,
        imageList: imageList,
        mdClipsFolder: mdClipsFolder
      };
      return chrome.runtime.sendMessage(message);
    } catch (err) {
      console.error(err);
      showError(err);
    }
  }
}

// Event handler for download button
async function download(e) {
  e.preventDefault();
  await sendDownloadMessage(cm.getValue());
  window.close();
}

// Event handler for download selected button
async function downloadSelection(e) {
  e.preventDefault();
  if (cm.somethingSelected()) {
    await sendDownloadMessage(cm.getSelection());
  }
}

// Function that handles messages from the service worker
function notify(message) {
  if (message.type == "display.md") {
    cm.setValue(message.markdown);
    document.getElementById("title").value = message.article.title;
    imageList = message.imageList;
    mdClipsFolder = message.mdClipsFolder;

    // Show the hidden elements
    document.getElementById("container").style.display = 'flex';
    document.getElementById("spinner").style.display = 'none';
    // Focus the download button
    document.getElementById("download").focus();
    cm.refresh();
  }
}

function showError(err) {
  // Show the hidden elements
  document.getElementById("container").style.display = 'flex';
  document.getElementById("spinner").style.display = 'none';
  cm.setValue(`Error clipping the page\n\n${err}`);
}
