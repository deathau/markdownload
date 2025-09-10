function notifyExtension() {
    // send a message that the content should be clipped
    console.log('MarkDownload ContentScript: Notifying extension');
    const content = getHTMLOfDocument();
    console.log('MarkDownload ContentScript: DOM content length:', content.length);
    
    if (typeof browser === 'undefined' && typeof chrome !== 'undefined') {
        window.browser = chrome;
    }
    
    browser.runtime.sendMessage({ 
        type: "clip", 
        dom: content
    }).then(response => {
        console.log('MarkDownload ContentScript: Response received:', response);
    }).catch(error => {
        console.error('MarkDownload ContentScript: Error sending message:', error);
    });
}

// 初始化 TurndownService
if (typeof TurndownService !== 'undefined') {
    TurndownService.prototype.defaultEscape = TurndownService.prototype.escape;
    console.log('MarkDownload ContentScript: TurndownService initialized');
}

// Helper functions moved from service worker
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

function getImageFilename(src, options, prependFilePath = true) {
    const slashPos = src.lastIndexOf('/');
    const queryPos = src.indexOf('?');
    let filename = src.substring(slashPos + 1, queryPos > 0 ? queryPos : src.length);

    let imagePrefix = (options.imagePrefix || '');

    if (prependFilePath && options.title.includes('/')) {
        imagePrefix = options.title.substring(0, options.title.lastIndexOf('/') + 1) + imagePrefix;
    } else if (prependFilePath) {
        imagePrefix = options.title + (imagePrefix.startsWith('/') ? '' : '/') + imagePrefix;
    }
    
    if (filename.includes(';base64,')) {
        filename = 'image.' + filename.substring(0, filename.indexOf(';'));
    }
    
    let extension = filename.substring(filename.lastIndexOf('.'));
    if (extension == filename) {
        filename = filename + '.idunno';
    }

    filename = generateValidFileName(filename, options.disallowedChars);
    return imagePrefix + filename;
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

    string = string.replace(/{(.*?)}/g, '');
    return string;
}

// Main turndown function
function turndownContent(content, options, article) {
    console.log('MarkDownload ContentScript: Converting content to markdown');
    
    if (options.turndownEscape) TurndownService.prototype.escape = TurndownService.prototype.defaultEscape;
    else TurndownService.prototype.escape = s => s;

    var turndownService = new TurndownService(options);
    turndownService.use(turndownPluginGfm.gfm);
    turndownService.keep(['iframe', 'sub', 'sup', 'u', 'ins', 'del', 'small', 'big']);

    let imageList = {};
    
    // Add image rule
    turndownService.addRule('images', {
        filter: function (node, tdopts) {
            if (node.nodeName == 'IMG' && node.getAttribute('src')) {
                let src = node.getAttribute('src');
                node.setAttribute('src', validateUri(src, article.baseURI));
                
                if (options.downloadImages) {
                    let imageFilename = getImageFilename(src, options, false);
                    if (!imageList[src] || imageList[src] != imageFilename) {
                        let i = 1;
                        while (Object.values(imageList).includes(imageFilename)) {
                            const parts = imageFilename.split('.');
                            if (i == 1) parts.splice(parts.length - 1, 0, i++);
                            else parts.splice(parts.length - 2, 1, i++);
                            imageFilename = parts.join('.');
                        }
                        imageList[src] = imageFilename;
                    }
                    
                    const obsidianLink = options.imageStyle.startsWith("obsidian");
                    const localSrc = options.imageStyle === 'obsidian-nofolder'
                        ? imageFilename.substring(imageFilename.lastIndexOf('/') + 1)
                        : imageFilename.split('/').map(s => obsidianLink ? s : encodeURI(s)).join('/');
                    
                    if(options.imageStyle != 'originalSource' && options.imageStyle != 'base64') {
                        node.setAttribute('src', localSrc);
                    }
                    return true;
                } else return true;
            }
            return false;
        },
        replacement: function (content, node, tdopts) {
            if (options.imageStyle == 'noImage') return '';
            else if (options.imageStyle.startsWith('obsidian')) return `![[${node.getAttribute('src')}]]`;
            else {
                var alt = cleanAttribute(node.getAttribute('alt'));
                var src = node.getAttribute('src') || '';
                var title = cleanAttribute(node.getAttribute('title'));
                var titlePart = title ? ' "' + title + '"' : '';
                if (options.imageRefStyle == 'referenced') {
                    var id = this.references.length + 1;
                    this.references.push('[fig' + id + ']: ' + src + titlePart);
                    return '![' + alt + '][fig' + id + ']';
                }
                else return src ? '![' + alt + ']' + '(' + src + titlePart + ')' : '';
            }
        },
        references: [],
        append: function (options) {
            var references = '';
            if (this.references.length) {
                references = '\n\n' + this.references.join('\n') + '\n\n';
                this.references = [];
            }
            return references;
        }
    });

    // Add link rule
    turndownService.addRule('links', {
        filter: (node, tdopts) => {
            if (node.nodeName == 'A' && node.getAttribute('href')) {
                const href = node.getAttribute('href');
                node.setAttribute('href', validateUri(href, article.baseURI));
                return options.linkStyle == 'stripLinks';
            }
            return false;
        },
        replacement: (content, node, tdopts) => content
    });

    // Add math rule
    turndownService.addRule('mathjax', {
        filter(node, options) {
            return article.math && article.math.hasOwnProperty(node.id);
        },
        replacement(content, node, options) {
            const math = article.math[node.id];
            let tex = math.tex.trim().replaceAll('\xa0', '');

            if (math.inline) {
                tex = tex.replaceAll('\n', ' ');
                return `$${tex}$`;
            } else {
                return `$$\n${tex}\n$$`;
            }
        }
    });

    let markdown = options.frontmatter + turndownService.turndown(content) + options.backmatter;
    
    // Strip out non-printing special characters
    markdown = markdown.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028\u2029\ufeff\ufff9-\ufffc]/g, '');
    
    return { markdown: markdown, imageList: imageList };
}

// Complete article processing function
function processCompleteArticle(domString, options, selection = false) {
    console.log('MarkDownload ContentScript: Processing complete article');
    
    try {
        // Step 1: Process DOM to article
        const article = processArticleFromDOM(domString);
        
        if (!article) {
            throw new Error('Failed to process article from DOM');
        }

        // Step 2: Apply selection if provided
        const selectionData = getHTMLOfSelection();
        if (selection && selectionData) {
            article.content = selectionData;
        }
        
        // Step 3: Prepare options
        if (options.includeTemplate) {
            options.frontmatter = textReplace(options.frontmatter, article) + '\n';
            options.backmatter = '\n' + textReplace(options.backmatter, article);
        } else {
            options.frontmatter = options.backmatter = '';
        }

        options.imagePrefix = textReplace(options.imagePrefix, article, options.disallowedChars)
            .split('/').map(s => generateValidFileName(s, options.disallowedChars)).join('/');

        // Step 4: Convert to markdown
        const result = turndownContent(article.content, options, article);
        
        // Step 5: Format title
        let title = textReplace(options.title, article, options.disallowedChars + '/');
        title = title.split('/').map(s => generateValidFileName(s, options.disallowedChars)).join('/');
        
        console.log('MarkDownload ContentScript: Article processing complete, title:', title, 'markdown length:', result.markdown.length);
        
        return {
            markdown: result.markdown,
            imageList: result.imageList,
            title: title,
            article: article
        };
    } catch (error) {
        console.error('MarkDownload ContentScript: Error processing complete article:', error);
        throw error;
    }
}

// 新增：处理来自Service Worker的DOM处理请求
function processArticleFromDOM(domString) {
    console.log('MarkDownload ContentScript: Processing DOM to article');
    
    try {
        const parser = new DOMParser();
        const dom = parser.parseFromString(domString, "text/html");

        if (dom.documentElement.nodeName == "parsererror") {
            console.error("MarkDownload ContentScript: DOM parsing error");
            throw new Error("DOM parsing failed");
        }

        const math = {};
        
        // 简化的数学公式处理
        if (dom.body) {
            dom.body.querySelectorAll('h1, h2, h3, h4, h5, h6')?.forEach(header => {
                header.className = '';
            });
            dom.documentElement.removeAttribute('class');
        }

        // 使用 Readability 提取文章
        const article = new Readability(dom).parse();

        if (!article) {
            throw new Error("Failed to parse article from DOM");
        }

        // 添加元数据
        article.baseURI = dom.baseURI || window.location.href;
        article.pageTitle = dom.title || document.title || 'Untitled';
        
        try {
            const url = new URL(article.baseURI);
            article.hash = url.hash;
            article.host = url.host;
            article.origin = url.origin;
            article.hostname = url.hostname;
            article.pathname = url.pathname;
            article.port = url.port;
            article.protocol = url.protocol;
            article.search = url.search;
        } catch (e) {
            console.warn('MarkDownload ContentScript: Failed to parse URL info:', e);
        }

        if (dom.head) {
            article.keywords = dom.head.querySelector('meta[name="keywords"]')?.content?.split(',')?.map(s => s.trim());

            dom.head.querySelectorAll('meta[name][content], meta[property][content]')?.forEach(meta => {
                const key = (meta.getAttribute('name') || meta.getAttribute('property'));
                const val = meta.getAttribute('content');
                if (key && val && !article[key]) {
                    article[key] = val;
                }
            });
        }

        article.math = math;
        console.log('MarkDownload ContentScript: Article processed successfully, title:', article.title);
        return article;
    } catch (error) {
        console.error('MarkDownload ContentScript: Error processing DOM:', error);
        throw error;
    }
}

function getHTMLOfDocument() {
    console.log('MarkDownload ContentScript: Starting document processing');
    console.log('MarkDownload ContentScript: Page URL:', window.location.href);
    console.log('MarkDownload ContentScript: Page title:', document.title);
    
    try {
    // make sure a title tag exists so that pageTitle is not empty and
        // a filename can be generated.
        if (!document.head) {
            console.warn('MarkDownload ContentScript: No document head found, creating one');
            const head = document.createElement('head');
            document.documentElement.insertBefore(head, document.body);
        }
        
    if (document.head.getElementsByTagName('title').length == 0) {
            console.log('MarkDownload ContentScript: Adding missing title tag');
        let titleEl = document.createElement('title');
            // prepare a good default text (the text displayed in the window title)
            titleEl.innerText = document.title || 'Untitled';
        document.head.append(titleEl);
    }

    // if the document doesn't have a "base" element make one
    // this allows the DOM parser in future steps to fix relative uris

    let baseEls = document.head.getElementsByTagName('base');
    let baseEl;

    if (baseEls.length > 0) {
        baseEl = baseEls[0];
    } else {
            console.log('MarkDownload ContentScript: Adding base element');
        baseEl = document.createElement('base');
        document.head.append(baseEl);
    }

    // make sure the 'base' element always has a good 'href`
    // attribute so that the DOMParser generates usable
    // baseURI and documentURI properties when used in the
    // background context.

    let href = baseEl.getAttribute('href');

    if (!href || !href.startsWith(window.location.origin)) {
            console.log('MarkDownload ContentScript: Setting base href to:', window.location.href);
        baseEl.setAttribute('href', window.location.href);
    }

    // remove the hidden content from the page
        if (document.body) {
            console.log('MarkDownload ContentScript: Removing hidden nodes');
    removeHiddenNodes(document.body);
        } else {
            console.warn('MarkDownload ContentScript: No document body found');
        }

    // get the content of the page as a string
        const htmlContent = document.documentElement.outerHTML;
        console.log('MarkDownload ContentScript: Generated HTML length:', htmlContent.length);
        
        // Basic validation
        if (!htmlContent || htmlContent.length < 100) {
            console.warn('MarkDownload ContentScript: Generated HTML seems too small');
        }
        
        return htmlContent;
    } catch (error) {
        console.error('MarkDownload ContentScript: Error processing document:', error);
        // Return basic HTML as fallback
        return `<html><head><title>${document.title || 'Error'}</title><base href="${window.location.href}"></head><body><p>Error processing page content.</p></body></html>`;
    }
}

// code taken from here: https://www.reddit.com/r/javascript/comments/27bcao/anyone_have_a_method_for_finding_all_the_hidden/
function removeHiddenNodes(root) {
    let nodeIterator, node,i = 0;

    nodeIterator = document.createNodeIterator(root, NodeFilter.SHOW_ELEMENT, function(node) {
      let nodeName = node.nodeName.toLowerCase();
      if (nodeName === "script" || nodeName === "style" || nodeName === "noscript" || nodeName === "math") {
        return NodeFilter.FILTER_REJECT;
      }
      if (node.offsetParent === void 0) {
        return NodeFilter.FILTER_ACCEPT;
      }
      let computedStyle = window.getComputedStyle(node, null);
      if (computedStyle.getPropertyValue("visibility") === "hidden" || computedStyle.getPropertyValue("display") === "none") {
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    while ((node = nodeIterator.nextNode()) && ++i) {
      if (node.parentNode instanceof HTMLElement) {
        node.parentNode.removeChild(node);
      }
    }
    return root
  }

// code taken from here: https://stackoverflow.com/a/5084044/304786
function getHTMLOfSelection() {
    var range;
    if (document.selection && document.selection.createRange) {
        range = document.selection.createRange();
        return range.htmlText;
    } else if (window.getSelection) {
        var selection = window.getSelection();
        if (selection.rangeCount > 0) {
            let content = '';
            for (let i = 0; i < selection.rangeCount; i++) {
                range = selection.getRangeAt(0);
                var clonedSelection = range.cloneContents();
                var div = document.createElement('div');
                div.appendChild(clonedSelection);
                content += div.innerHTML;
            }
            return content;
        } else {
            return '';
        }
    } else {
        return '';
    }
}

function getSelectionAndDom() {
    console.log('MarkDownload ContentScript: Getting selection and DOM');
    
    try {
        const selection = getHTMLOfSelection();
        const dom = getHTMLOfDocument();
        
        console.log('MarkDownload ContentScript: Selection length:', selection.length);
        console.log('MarkDownload ContentScript: DOM length:', dom.length);
        
        return {
            selection: selection,
            dom: dom
        };
    } catch (error) {
        console.error('MarkDownload ContentScript: Error getting selection and DOM:', error);
    return {
            selection: '',
        dom: getHTMLOfDocument()
        };
    }
}

// This function must be called in a visible page, such as a browserAction popup
// or a content script. Calling it in a background page has no effect!
function copyToClipboard(text) {
    console.log('MarkDownload ContentScript: Copying to clipboard, length:', text.length);
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            console.log('MarkDownload ContentScript: Successfully copied to clipboard');
        }).catch(error => {
            console.error('MarkDownload ContentScript: Failed to copy to clipboard:', error);
            
            // Fallback method
            try {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.select();
                textArea.setSelectionRange(0, 99999);
                document.execCommand('copy');
                document.body.removeChild(textArea);
                console.log('MarkDownload ContentScript: Fallback copy successful');
            } catch (fallbackError) {
                console.error('MarkDownload ContentScript: Fallback copy failed:', fallbackError);
            }
        });
    } else {
        console.warn('MarkDownload ContentScript: Clipboard API not available, using fallback');
        // Fallback method for older browsers
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            textArea.setSelectionRange(0, 99999);
            document.execCommand('copy');
            document.body.removeChild(textArea);
            console.log('MarkDownload ContentScript: Fallback copy successful');
        } catch (error) {
            console.error('MarkDownload ContentScript: All copy methods failed:', error);
        }
    }
}

function downloadMarkdown(filename, text) {
    console.log('MarkDownload ContentScript: Starting download:', filename, 'Data length:', text.length);
    
    try {
    let datauri = `data:text/markdown;base64,${text}`;
    var link = document.createElement('a');
    link.download = filename;
    link.href = datauri;
        link.style.display = 'none';
        document.body.appendChild(link);
    link.click();
        document.body.removeChild(link);
        console.log('MarkDownload ContentScript: Download triggered successfully');
    } catch (error) {
        console.error('MarkDownload ContentScript: Download failed:', error);
    }
}

function downloadImage(filename, url) {

    /* Link with a download attribute? CORS says no.
    var link = document.createElement('a');
    link.download = filename.substring(0, filename.lastIndexOf('.'));
    link.href = url;
    console.log(link);
    link.click();
    */

    /* Try via xhr? Blocked by CORS.
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    xhr.onload = () => {
        console.log('onload!')
        var file = new Blob([xhr.response], {type: 'application/octet-stream'});
        var link = document.createElement('a');
        link.download = filename;//.substring(0, filename.lastIndexOf('.'));
        link.href = window.URL.createObjectURL(file);
        console.log(link);
        link.click();
    }
    xhr.send();
    */

    /* draw on canvas? Inscure operation
    let img = new Image();
    img.src = url;
    img.onload = () => {
        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        var link = document.createElement('a');
        const ext = filename.substring(filename.lastIndexOf('.'));
        link.download = filename;
        link.href = canvas.toDataURL(`image/png`);
        console.log(link);
        link.click();
    }
    */
}

// Initialize content script with debugging
console.log('MarkDownload ContentScript: Initializing on', window.location.href);

// Ensure browser polyfill compatibility
if (typeof browser === 'undefined' && typeof chrome !== 'undefined') {
    window.browser = chrome;
}

(function loadPageContextScript(){
    try {
    var s = document.createElement('script');
    s.src = browser.runtime.getURL('contentScript/pageContext.js');
    (document.head||document.documentElement).appendChild(s);
        console.log('MarkDownload ContentScript: Page context script loaded');
    } catch (error) {
        console.error('MarkDownload ContentScript: Failed to load page context script:', error);
    }
})()
