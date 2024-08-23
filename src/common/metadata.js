import Markdownload from "./markdownload.js"
import Readability from "./readability-module.js"

export default class Metadata {
  constructor(html) {

    this.html = html
    this.dom = new DOMParser().parseFromString(html, "text/html")
    if (this.dom.documentElement.nodeName == "parsererror") throw "error while parsing html"

    // this is the main object to hold the actual medatata
    this.data = {}

    // get the base uri from the dom
    this.data.baseURI = this.dom.baseURI
    this.url = new URL(this.data.baseURI)
    // also grab the page title
    this.data.pageTitle = this.dom.title

    this.initUrlInfo()
    this.initMetaTags()

    // setup to easily get math — e.g. latex from mathjax — if present
    this.math = this.getMathInfo()
    // fix all urls to be absolute
    Markdownload.fixUrls(this.dom, this.data.baseURI)

    // the readability service is destructive, so create a clone of the dom for this purpose
    this.readablityDom = this.getDomClone()
    // some more modifications of this dom for better Readability parsing
    Markdownload.prepareForReadabilty(this.readablityDom)

    // use Readability to extract a "readable" version of the HTML, and other useful info
    this.readability = new Readability(this.readablityDom)
    this.readable = this.readability.parse()

    // combine the data gleaned from readability with the rest of the data we got for ourselves
    this.data = { ...this.readable, ...this.data }
  }

  // attach URL info
  initUrlInfo() {
    this.data.hash = this.url.hash;
    this.data.host = this.url.host;
    this.data.origin = this.url.origin;
    this.data.hostname = this.url.hostname;
    this.data.pathname = this.url.pathname;
    this.data.port = this.url.port;
    this.data.protocol = this.url.protocol;
    this.data.search = this.url.search;
  }

  // attach the meta keywords and tags
  initMetaTags() {
    if (this.dom.head) {
      // and the keywords, should they exist, as an array
      this.data.keywords = this.dom.head.querySelector('meta[name="keywords"]')?.content?.split(',')?.map(s => s.trim());

      // add all meta tags, so users can do whatever they want
      this.dom.head.querySelectorAll('meta[name][content], meta[property][content]')?.forEach(meta => {
        const key = (meta.getAttribute('name') || meta.getAttribute('property'))
        const val = meta.getAttribute('content')
        if (key && val && !this[key]) {
          this.data[key] = val;
        }
      })
    }
  }

  getMathInfo(dom = this.dom) {
    let math = {}
    const storeMathInfo = (el, mathInfo) => {
      let randomId = URL.createObjectURL(new Blob([]));
      randomId = randomId.substring(randomId.length - 36);
      el.id = randomId;
      math[randomId] = mathInfo;
    };

    dom.body.querySelectorAll('script[id^=MathJax-Element-]')?.forEach(mathSource => {
      const type = mathSource.attributes.type.value
      storeMathInfo(mathSource, {
        tex: mathSource.innerText,
        inline: type ? !type.includes('mode=display') : false
      });
    });

    dom.body.querySelectorAll('[markdownload-latex]')?.forEach(mathJax3Node =>  {
      const tex = mathJax3Node.getAttribute('markdownload-latex')
      const display = mathJax3Node.getAttribute('display')
      const inline = !(display && display === 'true')

      const mathNode = this.dom.createElement(inline ? "i" : "p")
      mathNode.textContent = tex;
      mathJax3Node.parentNode.insertBefore(mathNode, mathJax3Node.nextSibling)
      mathJax3Node.parentNode.removeChild(mathJax3Node)

      storeMathInfo(mathNode, {
        tex: tex,
        inline: inline
      });
    });

    dom.body.querySelectorAll('.katex-mathml')?.forEach(kaTeXNode => {
      storeMathInfo(kaTeXNode, {
        tex: kaTeXNode.querySelector('annotation').textContent,
        inline: true
      });
    });

    return math
  }

  getDomClone(stripBody = false) { 
    let newDom = this.dom.cloneNode(true)
    if(stripBody) newDom.body.replaceWith(newDom.createElement('body'))
    return newDom
  }
}