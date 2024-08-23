import Markdownload from './markdownload.js'
import Meta from './metadata.js'
import Options from './options.js'

globalThis.browser ??= chrome;

export default class StateManager {
  constructor() {
    // "state" is stored in the browser session
    this.state = browser.storage.session
    if(!this.state.meta) this.state.meta = {} // metadata list (map; key: tab id)
  }

  // the "content" represents the markdown to download. The text visible in the editor
  getContent = async () => (await this.state.get('content')).content
  setContent = async (content) => await this.state.set({content})

  // the title represents the name of the file that will be downloaded
  getTitle = async () => (await this.state.get('title')).title
  setTitle = async (title) => await this.state.set({title})

  // the image list contains a list of images to download, in the form of { <url>: <downloaded file name> }
  getImgList = async () => (await this.state.get('imgList'))?.imgList ?? {}
  setImgList = async (imgList) => await this.state.set({imgList})

  // clear the current state
  clear = async () => {
    await this.state.clear()
    this.state.meta = {}
  }

  // grab the content of the current page
  grabPageContent = async (tabId) => {
    // get the metadata for this tab
    let meta = await this.getMetadata(tabId)
    let options = await Options.getOptions()
    let md = Markdownload.parse(meta.html, meta, options)
    this.setImgList({...this.getImgList, ...md.imageList})
    return md
  }

  // grab the content of the current selection (or start the selection client script)
  grabSelectionContent = async (tabId) => {
    // get the metadata for this tab
    let meta = await this.getMetadata(tabId)
    let scriptOptions = {target: {tabId}, injectImmediately: true}
    let htmlScript = await browser.scripting.executeScript({
      ...scriptOptions, files: ["/content/grab-selection.js"]
    })
    // if there's an error, throw it here so we don't continue
    if(htmlScript[0].error) throw(htmlScript[0].error)
    else if(htmlScript[0].result) {
      let html = await Promise.resolve(htmlScript[0].result)
      let options = await Options.getOptions()
      let md = Markdownload.parse(html, meta, options)
      this.setImgList({...this.getImgList, ...md.imageList})
      return md
    }
  }

  // get the metadata of the current page
  getMetadata = async(tabId) => {
    let meta = this.state.meta[tabId]
    if(meta) return meta

    // common script properties so I don't have to keep re-typing them
    let scriptOptions = {target: {tabId}, injectImmediately: true}

    // run some page context scripts. See the script itself for more details
    let contextScript = await browser.scripting.executeScript({
      ...scriptOptions, files: ["/content/page-context.js"]
    })
    // if there's an error, throw it here so we don't continue
    if(contextScript[0].error) throw(contextScript[0].error)

    // get the html of the current page
    let htmlScript = await browser.scripting.executeScript({
      ...scriptOptions, func: () => {
        const html = document.documentElement.outerHTML
        document.querySelectorAll('[markdownload-hidden]').forEach(el => el.removeAttribute('markdownload-hidden'))
        document.querySelectorAll('[markdownload-math]').forEach(el => el.removeAttribute('markdownload-latex'))
        return html
      }
    })

    // initialize the metadata object
    meta = new Meta(htmlScript[0].result)
    this.state.meta[tabId] = meta
    return meta
  }
}