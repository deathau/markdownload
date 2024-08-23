import customTurndown from "./custom-turndown.js"
import TurndownService from "../3rd-party/turndown.browser.es.js"
import {gfm} from "../3rd-party/turndown-plugin-gfm.browser.es.js"
import Readability from "./readability-module.js"

TurndownService.prototype.defaultEscape = TurndownService.prototype.escape

// TODO: Markdownload.parse(html, metadata)

export default class Markdownload {

  static parse(html, meta, options) {
    return new Markdownload(html, meta, options)
  }

  constructor(html, meta, options) {
    this.options = options
    this.html = html
    this.metadata = meta.data

    let temp = document.createElement('template')
    temp.innerHTML = html

    // fix all urls to be absolute
    Markdownload.fixUrls(temp.content, this.metadata.baseURI)
    // grab all the images, for downloading
    this.imgList = Markdownload.grabImages(temp.content, options)
    
    // initialize the turndown service
    this.initTurndownService({math: meta.math})

    if(this.options.useReadability){
      // the readability service is destructive, so create a clone of the dom for this purpose
      let readabilityDom = meta.dom.cloneNode(true)
      // replace the body with the temp content
      readabilityDom.body.replaceWith(readabilityDom.createElement('body'))
      readabilityDom.body.innerHTML = temp.innerHTML
      // some more modifications of this dom for better Readability parsing
      Markdownload.prepareForReadabilty(readabilityDom)
      
      let readability = new Readability(readabilityDom)
      let readable = readability.parse()
      
      this.markdown = this.turndownService.turndown(readable?.content ?? temp.innerHTML)
    }
    else {
      this.markdown = this.turndownService.turndown(temp.querySelector('main')?.innerHTML ?? temp.innerHTML)
    }

    // strip out non-printing special characters which CodeMirror displays as a red dot
    // see: https://codemirror.net/doc/manual.html#option_specialChars
    this.markdown = this.markdown.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028\u2029\ufeff\ufff9-\ufffc]/g, '');
  }

  initTurndownService(overrideOptions = {}) {
    if (this.options.turndownEscape) TurndownService.prototype.escape = TurndownService.prototype.defaultEscape
    else TurndownService.prototype.escape = s => s

    this.turndownService = new TurndownService({...this.metadata, ...this.options, ...overrideOptions})
    this.turndownService.use(gfm)
    this.turndownService.use(customTurndown)
    this.turndownService.keep(['iframe', 'sub', 'sup', 'u', 'ins', 'del', 'small', 'big'])
  }

  static fixUrls(element, baseURI) {
    ['href', 'src'].forEach(attr => element.querySelectorAll(`[${attr}]`).forEach(el => el.setAttribute(attr, Markdownload.validateUrl(el.getAttribute(attr), baseURI))))
  }

  static validateUrl(href, baseURI) {
    let baseUrl = new URL(baseURI)
    // protocol fix
    if(href.startsWith('//')) href = baseUrl.protocol + href
    // pure anchor links fix
    if(href.startsWith('#')) return href
    // check if the href is a valid url
    try {
      const url = new URL(href)
      // if it's valid, but it's an extension relative uri... let's fix that.
      if(url.protocol.includes("ext")) href = baseUrl.origin + href.substring(url.origin.length)
    }
    catch {
      // if it's not a valid url, that likely means we have to prepend the base uri
      // if the href starts with '/', we need to go from the origin
      if (href.startsWith('/')) href = baseUrl.origin + href
      // otherwise we need to go from the local folder
      else href = baseUrl.href + (baseUrl.href.endsWith('/') ? '/' : '') + href
    }
    return href
  }

  static grabImages(element, options) {
    let imgList = {}
    if(options.downloadImages) {
      element.querySelectorAll('img').forEach(img => {
        let src = img.src
        let filename = Markdownload.getImageFilename(src, options, false)
        if(!(src in imgList)){
          // if the imgList already contains this file, add a number to differentiate
          let i = 1
          while(Object.values(imgList).includes(filename)){
            const parts = filename.split('.')
            if (i == 1) parts.splice(parts.length - 1, 0, i++)
            else parts.splice(parts.length - 2, 1, i++)
            filename = parts.join('.')
          }

          imgList[src] = filename
        }
      })
    }
    return imgList
  }  

  static prepareForReadabilty(el) {
    el.querySelectorAll('[class*=highlight-text],[class*=highlight-source]')?.forEach(codeSource => {
      const language = codeSource.className.match(/highlight-(?:text|source)-([a-z0-9]+)/)?.[1]
      if (codeSource.firstChild.nodeName == "PRE") {
        codeSource.firstChild.id = `code-lang-${language}`
      }
    });
  
    el.querySelectorAll('[class*=language-]')?.forEach(codeSource => {
      const language = codeSource.className.match(/language-([a-z0-9]+)/)?.[1]
      codeSource.id = `code-lang-${language}`;
    });
  
    el.querySelectorAll('pre br')?.forEach(br => {
      // we need to keep <br> tags because they are removed by Readability.js
      br.outerHTML = '<br-keep></br-keep>';
    });
  
    el.querySelectorAll('.codehilite > pre')?.forEach(codeSource => {
      if (codeSource.firstChild.nodeName !== 'CODE' && !codeSource.className.includes('language')) {
        codeSource.id = `code-lang-text`;
      }
    });
  
    el.querySelectorAll('h1, h2, h3, h4, h5, h6')?.forEach(header => {
      // Readability.js will strip out headings if certain words appear in their className
      // See: https://github.com/mozilla/readability/issues/807  
      header.className = '';
      header.outerHTML = header.outerHTML;  
    });

    // Prevent Readability from removing the <html> element if has a 'class' attribute
    // which matches removal criteria.
    // Note: The document element is guaranteed to be the HTML tag because the 'text/html'
    // mime type was used when the DOM was created.
    if(el.documentElement) el.documentElement.removeAttribute('class')

    el.querySelectorAll('[markdownload-hidden]').forEach(e => e.parentNode?.removeChild(e))
  }

  static getImageFilename(src, options, prependFilePath = true) {
    let srcUrl = new URL(src)
    let pathname = srcUrl.pathname
    if(pathname.endsWith('/')) pathname = pathname.slice(0, -1)
    let filename = pathname.substring(pathname.lastIndexOf('/') + 1)

    return filename

    // const slashPos = src.lastIndexOf('/');
    // const queryPos = src.indexOf('?');
    // let filename = src.substring(slashPos + 1, queryPos > 0 ? queryPos : src.length);
  
    // let imagePrefix = (options.imagePrefix || '');
  
    // if (prependFilePath && options.title.includes('/')) {
    //   imagePrefix = options.title.substring(0, options.title.lastIndexOf('/') + 1) + imagePrefix;
    // }
    // else if (prependFilePath) {
    //   imagePrefix = options.title + (imagePrefix.startsWith('/') ? '' : '/') + imagePrefix
    // }
    
    // if (filename.includes(';base64,')) {
    //   // this is a base64 encoded image, so what are we going to do for a filename here?
    //   filename = 'image.' + filename.substring(0, filename.indexOf(';'));
    // }
    
    // let extension = filename.substring(filename.lastIndexOf('.'));
    // if (extension == filename) {
    //   // there is no extension, so we need to figure one out
    //   // for now, give it an 'idunno' extension and we'll process it later
    //   filename = filename + '.idunno';
    // }
  
    // filename = generateValidFileName(filename, options.disallowedChars);
  
    // return imagePrefix + filename;
  }
}