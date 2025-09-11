
// default variables
var selectedText = null;
var imageList = null;
var mdClipsFolder = '';
var cm = null;

const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

// Initialize CodeMirror when DOM is ready
const initializeCodeMirror = () => {
    const textarea = document.getElementById("md");
    if (textarea && !cm) {
        cm = CodeMirror.fromTextArea(textarea, {
            theme: darkMode ? "xq-dark" : "xq-light",
            mode: "markdown",
            lineWrapping: true,
            lineNumbers: false,
            readOnly: false,
            viewportMargin: Infinity,
            scrollbarStyle: "native"
        });
        
        cm.on("cursorActivity", (cm) => {
            const somethingSelected = cm.somethingSelected();
            const copyText = document.getElementById("copy-text");
            
            if (somethingSelected) {
                if (copyText && copyText.textContent !== "Copy Selection") {
                    animateTextChange(copyText, "Copy Selection");
                }
            } else {
                if (copyText && copyText.textContent !== "Copy") {
                    animateTextChange(copyText, "Copy");
                }
            }
        });
        
        // Refresh CodeMirror after initialization
        setTimeout(() => {
            cm.refresh();
        }, 100);
    }
};

// Animate text change with smooth transition
const animateTextChange = (element, newText) => {
    if (!element) return;
    
    element.classList.add('changing');
    
    setTimeout(() => {
        element.textContent = newText;
        element.classList.remove('changing');
    }, 100);
};

// Update status bar
const updateStatus = (message, type = 'info') => {
    const statusText = document.getElementById('status-text');
    const statusBar = document.getElementById('status-bar');
    
    if (statusText) {
        statusText.textContent = message;
        statusText.className = type; // success, error, warning
        
        // Add pulse animation for visual feedback
        if (statusBar && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            statusBar.classList.add('pulse');
            setTimeout(() => {
                statusBar.classList.remove('pulse');
            }, 500);
        }
        
        // Auto-clear status after 3 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                statusText.textContent = 'Ready';
                statusText.className = '';
            }, 3000);
        }
    }
};

// Add basic event listeners (will be supplemented by setupEventListeners)
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("download")?.addEventListener("click", download);
    document.getElementById("copy")?.addEventListener("click", copyToClipboard);
    document.getElementById("sendToObsidian")?.addEventListener("click", sendToObsidian);
    document.getElementById("obsidianHelp")?.addEventListener("click", (e) => {
        e.stopPropagation(); // 阻止事件冒泡到按钮
        e.preventDefault();
        showObsidianHelp();
    });
    document.getElementById("closeModal")?.addEventListener("click", hideObsidianHelp);
    document.getElementById("saveObsidianSettings")?.addEventListener("click", saveObsidianSettings);
    
    // Close modal when clicking overlay
    document.getElementById("obsidianHelpModal")?.addEventListener("click", (e) => {
        if (e.target.id === "obsidianHelpModal") {
            hideObsidianHelp();
        }
    });
    
    // Load existing Obsidian settings
    loadObsidianSettings();
});

// Provide a local defaultOptions fallback in case shared script isn't loaded
const localDefaultOptions = {
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
    frontmatter: "",
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
    obsidianFolder: ""
};

// Use shared defaultOptions if present, otherwise fallback
const baseDefaults = (typeof defaultOptions !== 'undefined') ? defaultOptions : localDefaultOptions;

// Add clipSelection to the default options
const popupDefaultOptions = {
    ...baseDefaults,
    clipSelection: true
}

const checkInitialSettings = options => {
    // Update includeTemplate state (supports input checkbox or legacy anchor)
    const includeTemplateEl = document.querySelector("#includeTemplate");
    if (includeTemplateEl) {
        if (includeTemplateEl.tagName === 'INPUT') {
            includeTemplateEl.checked = !!options.includeTemplate;
        } else {
            includeTemplateEl.classList.toggle('checked', !!options.includeTemplate);
        }
    }

    // Update downloadImages state (supports input checkbox or legacy anchor)
    const downloadImagesEl = document.querySelector("#downloadImages");
    if (downloadImagesEl) {
        if (downloadImagesEl.tagName === 'INPUT') {
            downloadImagesEl.checked = !!options.downloadImages;
        } else {
            downloadImagesEl.classList.toggle('checked', !!options.downloadImages);
        }
    }

    // Update toggle buttons for clip selection
    const selectedBtn = document.querySelector("#selected");
    const documentBtn = document.querySelector("#document");
    
    if (selectedBtn && documentBtn) {
        if (options.clipSelection) {
            selectedBtn.classList.add("active");
            documentBtn.classList.remove("active");
        } else {
            selectedBtn.classList.remove("active");
            documentBtn.classList.add("active");
        }
    }

    // Update heading style buttons
    const atxBtn = document.querySelector("#heading-atx");
    const setextBtn = document.querySelector("#heading-setext");
    
    if (atxBtn && setextBtn) {
        if (options.headingStyle === 'atx') {
            atxBtn.classList.add("active");
            setextBtn.classList.remove("active");
        } else {
            atxBtn.classList.remove("active");
            setextBtn.classList.add("active");
        }
    }

    // Update link style buttons
    const inlinedBtn = document.querySelector("#link-inlined");
    const referencedBtn = document.querySelector("#link-referenced");
    const stripBtn = document.querySelector("#link-strip");
    
    [inlinedBtn, referencedBtn, stripBtn].forEach(btn => {
        if (btn) btn.classList.remove("active");
    });
    
    if (options.linkStyle === 'inlined' && inlinedBtn) {
        inlinedBtn.classList.add("active");
    } else if (options.linkStyle === 'referenced' && referencedBtn) {
        referencedBtn.classList.add("active");
    } else if (options.linkStyle === 'stripLinks' && stripBtn) {
        stripBtn.classList.add("active");
    }
}

const toggleClipSelection = (options, value) => {
    options.clipSelection = (value === 'selection');
    
    const selectedBtn = document.querySelector("#selected");
    const documentBtn = document.querySelector("#document");
    
    if (selectedBtn && documentBtn) {
        if (options.clipSelection) {
            selectedBtn.classList.add("active");
            documentBtn.classList.remove("active");
        } else {
            selectedBtn.classList.remove("active");
            documentBtn.classList.add("active");
        }
    }
    
    updateStatus("Updating content selection...", "info");
    
    chrome.storage.sync.set(options).then(() => {
        // Get current tab ID and call clipSite
        chrome.tabs.query({ currentWindow: true, active: true }).then(tabs => {
            if (tabs[0]) {
                clipSite(tabs[0].id);
            }
        }).catch(error => {
            console.error('Failed to get tab ID:', error);
            updateStatus("Error updating selection", "error");
        });
    }).catch((error) => {
        console.error(error);
        updateStatus("Failed to save settings", "error");
    });
}

const toggleIncludeTemplate = options => {
    const el = document.querySelector("#includeTemplate");
    if (!el) return;
    
    if (el.tagName === 'INPUT') {
        options.includeTemplate = !!el.checked;
    } else {
        options.includeTemplate = !options.includeTemplate;
        el.classList.toggle('checked', !!options.includeTemplate);
    }
    updateStatus("Updating template settings...", "info");
    
    chrome.storage.sync.set(options).then(() => {
        chrome.contextMenus.update("toggle-includeTemplate", {
            checked: options.includeTemplate
        });
        // Get current tab ID and call clipSite
        chrome.tabs.query({ currentWindow: true, active: true }).then(tabs => {
            if (tabs[0]) {
                clipSite(tabs[0].id);
            }
        }).catch(error => {
            console.error('Failed to get tab ID:', error);
            updateStatus("Error updating content", "error");
        });
    }).catch((error) => {
        console.error(error);
        updateStatus("Failed to save settings", "error");
    });
}

const toggleDownloadImages = options => {
    const el = document.querySelector("#downloadImages");
    if (!el) return;
    
    if (el.tagName === 'INPUT') {
        options.downloadImages = !!el.checked;
    } else {
        options.downloadImages = !options.downloadImages;
        el.classList.toggle('checked', !!options.downloadImages);
    }
    updateStatus("Updating image settings...", "info");
    
    chrome.storage.sync.set(options).then(() => {
        chrome.contextMenus.update("toggle-downloadImages", {
            checked: options.downloadImages
        });
        updateStatus("Settings saved", "success");
    }).catch((error) => {
        console.error(error);
        updateStatus("Failed to save settings", "error");
    });
}

const toggleHeadingStyle = (options, value) => {
    options.headingStyle = value;
    
    const atxBtn = document.querySelector("#heading-atx");
    const setextBtn = document.querySelector("#heading-setext");
    
    if (atxBtn && setextBtn) {
        if (value === 'atx') {
            atxBtn.classList.add("active");
            setextBtn.classList.remove("active");
        } else {
            atxBtn.classList.remove("active");
            setextBtn.classList.add("active");
        }
    }
    
    updateStatus("Updating heading style...", "info");
    
    chrome.storage.sync.set(options).then(() => {
        // Get current tab ID and re-clip to show changes
        chrome.tabs.query({ currentWindow: true, active: true }).then(tabs => {
            if (tabs[0]) {
                clipSite(tabs[0].id);
            }
        }).catch(error => {
            console.error('Failed to get tab ID:', error);
        });
        updateStatus("Heading style updated", "success");
    }).catch((error) => {
        console.error(error);
        updateStatus("Failed to save settings", "error");
    });
}

const toggleLinkStyle = (options, value) => {
    options.linkStyle = value;
    
    const inlinedBtn = document.querySelector("#link-inlined");
    const referencedBtn = document.querySelector("#link-referenced");
    const stripBtn = document.querySelector("#link-strip");
    
    [inlinedBtn, referencedBtn, stripBtn].forEach(btn => {
        if (btn) btn.classList.remove("active");
    });
    
    if (value === 'inlined' && inlinedBtn) {
        inlinedBtn.classList.add("active");
    } else if (value === 'referenced' && referencedBtn) {
        referencedBtn.classList.add("active");
    } else if (value === 'stripLinks' && stripBtn) {
        stripBtn.classList.add("active");
    }
    
    updateStatus("Updating link style...", "info");
    
    chrome.storage.sync.set(options).then(() => {
        // Get current tab ID and re-clip to show changes
        chrome.tabs.query({ currentWindow: true, active: true }).then(tabs => {
            if (tabs[0]) {
                clipSite(tabs[0].id);
            }
        }).catch(error => {
            console.error('Failed to get tab ID:', error);
        });
        updateStatus("Link style updated", "success");
    }).catch((error) => {
        console.error(error);
        updateStatus("Failed to save settings", "error");
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
        func: () => {
            return getSelectionAndDom();
        }
    }).then((result) => {
        if (result && result[0] && result[0].result) {
            showOrHideClipOption(result[0].result.selection);
            let message = {
                type: "clip",
                dom: result[0].result.dom,
                selection: result[0].result.selection,
                tabId: id
            }
            return chrome.storage.sync.get(popupDefaultOptions).then(options => {
                chrome.runtime.sendMessage({
                    ...message,
                    ...options
                });
            }).catch(err => {
                console.error(err);
                showError(err)
                return chrome.runtime.sendMessage({
                    ...message,
                    ...popupDefaultOptions
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

// Initialize popup
const initializePopup = () => {
    updateStatus("Loading settings...", "info");
    
    chrome.storage.sync.get(popupDefaultOptions).then(options => {
        checkInitialSettings(options);
        setupEventListeners(options);
        
        return chrome.tabs.query({
            currentWindow: true,
            active: true
        });
    }).then((tabs) => {
        if (tabs && tabs[0]) {
            const id = tabs[0].id;
            const url = tabs[0].url;
            
            updateStatus("Processing page...", "info");
            console.info("MarkDownload popup: Content script should be available");
            return clipSite(id);
        } else {
            throw new Error("No active tab found");
        }
    }).catch((error) => {
        console.error(error);
        showError(error);
    });
};

// Setup event listeners
const setupEventListeners = (options) => {
    // Toggle buttons for clip selection
    const selectedBtn = document.getElementById("selected");
    const documentBtn = document.getElementById("document");
    
    if (selectedBtn) {
        selectedBtn.addEventListener("click", (e) => {
            e.preventDefault();
            toggleClipSelection(options, 'selection');
        });
    }
    
    if (documentBtn) {
        documentBtn.addEventListener("click", (e) => {
            e.preventDefault();
            toggleClipSelection(options, 'document');
        });
    }
    
    // Heading style buttons
    const headingAtxBtn = document.getElementById("heading-atx");
    const headingSetextBtn = document.getElementById("heading-setext");
    
    if (headingAtxBtn) {
        headingAtxBtn.addEventListener("click", (e) => {
            e.preventDefault();
            toggleHeadingStyle(options, 'atx');
        });
    }
    
    if (headingSetextBtn) {
        headingSetextBtn.addEventListener("click", (e) => {
            e.preventDefault();
            toggleHeadingStyle(options, 'setext');
        });
    }
    
    // Link style buttons
    const linkInlinedBtn = document.getElementById("link-inlined");
    const linkReferencedBtn = document.getElementById("link-referenced");
    const linkStripBtn = document.getElementById("link-strip");
    
    if (linkInlinedBtn) {
        linkInlinedBtn.addEventListener("click", (e) => {
            e.preventDefault();
            toggleLinkStyle(options, 'inlined');
        });
    }
    
    if (linkReferencedBtn) {
        linkReferencedBtn.addEventListener("click", (e) => {
            e.preventDefault();
            toggleLinkStyle(options, 'referenced');
        });
    }
    
    if (linkStripBtn) {
        linkStripBtn.addEventListener("click", (e) => {
            e.preventDefault();
            toggleLinkStyle(options, 'stripLinks');
        });
    }
    
    // Checkbox event listeners
    const includeTemplateEl = document.getElementById("includeTemplate");
    if (includeTemplateEl) {
        const evt = (includeTemplateEl.tagName === 'INPUT') ? 'change' : 'click';
        includeTemplateEl.addEventListener(evt, (e) => {
            e.preventDefault();
            toggleIncludeTemplate(options);
        });
    }
    
    const downloadImagesEl = document.getElementById("downloadImages");
    if (downloadImagesEl) {
        const evt2 = (downloadImagesEl.tagName === 'INPUT') ? 'change' : 'click';
        downloadImagesEl.addEventListener(evt2, (e) => {
            e.preventDefault();
            toggleDownloadImages(options);
        });
    }
};

// Call initialization when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeCodeMirror();
    initializePopup();
});

// listen for notifications from the background page
chrome.runtime.onMessage.addListener(notify);

//function to send the download message to the background page
function sendDownloadMessage(text) {
    if (text != null) {
        return chrome.tabs.query({
            currentWindow: true,
            active: true
        }).then(tabs => {
            const activeTab = tabs[0];
            var message = {
                type: "download",
                markdown: text,
                title: document.getElementById("title").value,
                tabId: activeTab?.id,
                imageList: imageList,
                mdClipsFolder: mdClipsFolder
            };
            return chrome.runtime.sendMessage(message);
        });
    }
}

// event handler for download button
async function download(e) {
    e.preventDefault();
    await sendDownloadMessage(cm.getValue());
    window.close();
}


// Obsidian Help Modal Functions
function showObsidianHelp() {
    const modal = document.getElementById("obsidianHelpModal");
    if (modal) {
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
    }
}

function hideObsidianHelp() {
    const modal = document.getElementById("obsidianHelpModal");
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "";
    }
}

async function loadObsidianSettings() {
    try {
        const result = await chrome.storage.sync.get(['obsidianVault', 'obsidianFolder']);
        const vaultInput = document.getElementById("vaultName");
        const folderInput = document.getElementById("folderPath");
        
        if (vaultInput && result.obsidianVault) {
            vaultInput.value = result.obsidianVault;
        }
        if (folderInput && result.obsidianFolder) {
            folderInput.value = result.obsidianFolder;
        }
    } catch (error) {
        console.log("Could not load Obsidian settings:", error);
    }
}

async function saveObsidianSettings() {
    const vaultInput = document.getElementById("vaultName");
    const folderInput = document.getElementById("folderPath");
    
    if (!vaultInput) return;
    
    const vaultName = vaultInput.value.trim();
    const folderPath = folderInput.value.trim();
    
    if (!vaultName) {
        updateStatus("Please enter a vault name", "warning");
        return;
    }
    
    try {
        await chrome.storage.sync.set({
            obsidianVault: vaultName,
            obsidianFolder: folderPath,
            obsidianIntegration: true
        });
        
        updateStatus("Obsidian settings saved!", "success");
        
        // Close modal after a short delay
        setTimeout(() => {
            hideObsidianHelp();
        }, 1000);
        
    } catch (error) {
        console.error("Error saving Obsidian settings:", error);
        updateStatus("Failed to save settings", "error");
    }
}

// event handler for copy button
async function copyToClipboard(e) {
    e.preventDefault();
    if (!cm) {
        updateStatus("Editor not initialized", "error");
        return;
    }
    
    try {
        // Check if there's a selection, if so copy selection, otherwise copy all
        const hasSelection = cm.somethingSelected();
        const textToCopy = hasSelection ? cm.getSelection() : cm.getValue();
        
        if (!textToCopy.trim()) {
            updateStatus("No content to copy", "warning");
            return;
        }
        
        await navigator.clipboard.writeText(textToCopy);
        
        // Show feedback to user
        const copyButton = document.getElementById("copy");
        const originalHTML = copyButton.innerHTML;
        const feedbackText = hasSelection ? "Selection Copied!" : "Copied!";
        
        copyButton.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.76L18.88,4.88L21.71,7.71L9,20.42Z"/>
            </svg>
            ${feedbackText}
        `;
        copyButton.classList.add("success");
        updateStatus("Content copied to clipboard", "success");
        
        // Reset button after 2 seconds
        setTimeout(() => {
            copyButton.innerHTML = originalHTML;
            copyButton.classList.remove("success");
        }, 2000);
        
    } catch (error) {
        console.error('Failed to copy text: ', error);
        
        // Show error feedback
        const copyButton = document.getElementById("copy");
        const originalHTML = copyButton.innerHTML;
        
        copyButton.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2L13.09,8.26L22,9L13.09,9.74L12,16L10.91,9.74L2,9L10.91,8.26L12,2Z"/>
            </svg>
            Failed
        `;
        copyButton.classList.add("error");
        updateStatus("Failed to copy content", "error");
        
        setTimeout(() => {
            copyButton.innerHTML = originalHTML;
            copyButton.classList.remove("error");
        }, 2000);
    }
}

//function that handles messages from the injected script into the site
function notify(message) {
    // message for displaying markdown
    if (message.type == "display.md") {
        if (!cm) {
            // Initialize CodeMirror if not already done
            initializeCodeMirror();
        }
        
        if (cm && message.markdown) {
            // set the values from the message
            cm.setValue(message.markdown);
            setTimeout(() => cm.refresh(), 50);
            
            // Set the title
            const titleInput = document.getElementById("title");
            if (titleInput && message.article && message.article.title) {
                titleInput.value = message.article.title;
            }
            
            imageList = message.imageList;
            mdClipsFolder = message.mdClipsFolder;
            
            // show the main container and hide spinner
            const container = document.getElementById("container");
            const spinner = document.getElementById("spinner");
            
            if (container) {
                container.style.display = 'flex';
                container.classList.add('fade-in');
            }
            if (spinner) {
                spinner.style.display = 'none';
            }
            
            // focus the download button and refresh CodeMirror
            const downloadBtn = document.getElementById("download");
            if (downloadBtn) {
                downloadBtn.focus();
            }
            
            if (cm) {
                setTimeout(() => cm.refresh(), 100);
            }
            
            updateStatus("Page processed successfully", "success");
        }
    }
}

function showError(err) {
    console.error("MarkDownload Error:", err);
    
    // show the main container and hide spinner
    const container = document.getElementById("container");
    const spinner = document.getElementById("spinner");
    
    if (container) {
        container.style.display = 'flex';
        container.classList.add('fade-in');
    }
    if (spinner) {
        spinner.style.display = 'none';
    }
    
    // Initialize CodeMirror if not already done
    if (!cm) {
        initializeCodeMirror();
    }
    
    // Show error message in editor
    if (cm) {
        const errorMessage = `# Error Processing Page\n\n**Error Details:**\n\`\`\`\n${err}\n\`\`\`\n\n**Troubleshooting:**\n- Try refreshing the page and clipping again\n- Check if the page has finished loading\n- Some pages may not be supported\n- Check browser console for more details`;
        cm.setValue(errorMessage);
        setTimeout(() => cm.refresh(), 100);
    }
    
    updateStatus(`Error: ${err}`, "error");
}

// event handler for send to Obsidian button
async function sendToObsidian(e) {
    e.preventDefault();
    if (!cm) {
        updateStatus("Editor not initialized", "error");
        return;
    }
    try {
        const markdownContent = cm.getValue();
        if (!markdownContent.trim()) {
            updateStatus("No content to send", "warning");
            return;
        }

        updateStatus("Sending to Obsidian...", "info");

        const tabs = await chrome.tabs.query({ currentWindow: true, active: true });
        const options = await chrome.storage.sync.get(popupDefaultOptions);
        if (!options.obsidianIntegration) {
            updateStatus("Obsidian integration not enabled. Enable it in Options.", "error");
            return;
        }
        if (!tabs[0]) {
            updateStatus("No active tab found", "error");
            return;
        }

        const titleInput = document.getElementById("title");
        const title = titleInput ? titleInput.value.trim() : "Untitled";

        const response = await chrome.runtime.sendMessage({
            type: "sendToObsidian",
            markdown: markdownContent,
            title: title,
            tabId: tabs[0].id,
            options: options
        });

        if (response && response.success) {
            updateStatus("Successfully sent to Obsidian!", "success");
            const obsidianButton = document.getElementById("sendToObsidian");
            const originalHTML = obsidianButton.innerHTML;
            obsidianButton.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.76L18.88,4.88L21.71,7.71L9,20.42Z"/>
                </svg>
                Sent!
            `;
            obsidianButton.classList.add("success");
            setTimeout(() => {
                obsidianButton.innerHTML = originalHTML;
                obsidianButton.classList.remove("success");
            }, 3000);
        } else {
            throw new Error(response?.error || "Failed to send to Obsidian");
        }
    } catch (error) {
        console.error('Failed to send to Obsidian: ', error);
        updateStatus(`Failed to send to Obsidian: ${error.message}`, "error");
        const obsidianButton = document.getElementById("sendToObsidian");
        const originalHTML = obsidianButton.innerHTML;
        obsidianButton.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2L13.09,8.26L22,9L13.09,9.74L12,16L10.91,9.74L2,9L10.91,8.26L12,2Z"/>
            </svg>
            Failed
        `;
        obsidianButton.classList.add("error");
        setTimeout(() => {
            obsidianButton.innerHTML = originalHTML;
            obsidianButton.classList.remove("error");
        }, 3000);
    }
}

