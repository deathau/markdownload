import '/3rd-party/easymde.min.js'
import StateManager from '../common/state-manager.js'
import Options from '../common/options.js'
import overlayMode from '../common/cm-md-overlay.js'

globalThis.browser ??= chrome;

class Sidepanel {
  constructor(document) {
    this.document = document
    this.api = new StateManager()
    Options.getOptions().then(async o => {this.options = o; await this.init()})
    this.editor = new EasyMDE({
      element: this.document.getElementById('content'),
      autoDownloadFontAwesome: false,
      spellChecker: false,
      toolbar: false,
      theme: 'markdownload',
      overlayMode: { mode: overlayMode }
    })
    this.editor.codemirror.on("cursorActivity", (cm) => {
      // todo: add a popup for highlighting?
      // console.log(cm.getSelection())
    })
    this.windowId = null
  }

  init = async () => {
    this.windowId = (await browser.windows.getCurrent({populate: true})).id
    await this.setupToolbar()
  }

  clear = async () => {
    if(confirm("Anything not saved will be lost.\nAre you sure you want to clear all text?")){
      await this.api.clear()
      this.editor.value('')
    }
  }

  addContent = async (content) => {
    if(!content.endsWith('\n')) content += '\n\n'
    this.editor.codemirror.getDoc().replaceSelection(content)
    await this.api.setContent(this.editor.value())
  }

  grabSelection = async () => {
    const md = await this.api.grabSelectionContent(await this.getCurrentTabId())
    await this.addContent(md.markdown)
  }

  grabContent = async () => {
    const md = await this.api.grabPageContent(await this.getCurrentTabId())
    await this.addContent(md.markdown)
  }

  help = () => browser.tabs.create({url: "https://github.com/deathau/markdownload/blob/master/user-guide.md"})
  
  openOptions = () => browser.tabs.create({url: "/options/options.html"})

  getCurrentTabId = async () => (await browser.tabs.query({windowId: this.windowId, active: true}))[0].id

  setupToggle = (optionName) => {
    let el = this.document.getElementById(optionName)
    el.classList.toggle('active', this.options[optionName])
    el.addEventListener('click', function() {
      this.options[optionName] = !this.options[optionName]
      this.classList.toggle('active', this.options[optionName])
      this.options.save()
    })
  }

  setupToolbar = async () => {
    this.setupToggle('useReadability')
    this.setupToggle('includeTemplate')
    this.setupToggle('downloadImages')

    this.document.getElementById('capture-page').addEventListener('click', this.grabContent)
    this.document.getElementById('capture-selection').addEventListener('click', this.grabSelection)
    // this.document.getElementById('download').addEventListener('click', this.download)
    this.document.getElementById('clear').addEventListener('click', this.clear)
    this.document.getElementById('help').addEventListener('click', this.help)
    this.document.getElementById('options').addEventListener('click', this.openOptions)

    let previewToggle = this.document.getElementById('togglePreview')
    previewToggle.addEventListener('click', () => {
      previewToggle.classList.toggle('active', this.editor.isPreviewActive())
      this.editor.togglePreview()
    })
    previewToggle.classList.toggle('active', !this.editor.isPreviewActive())


    let settingsToggle = this.document.getElementById('toggleSettings')
    settingsToggle.addEventListener('click', () => {
      settingsToggle.classList.toggle('active')
      this.document.querySelector('#settings.toolbar').classList.toggle('active')
    })
  }
}

(async () => {
  const permissions = { origins: ["*://*/*"] }
  let hasPermission = await browser.permissions.contains(permissions)
  if(!hasPermission){
    location.replace(browser.runtime.getURL('/sidepanel/welcome.html'))
    return
  }

  const sidepanel = new Sidepanel(document)

  // const api = new StateManager()
  // const options = await Options.getOptions()
  
  // const editor = new EasyMDE({ //new TinyMDE.Editor({textarea: 'content'})
  //   element: document.getElementById('content'),
  //   autoDownloadFontAwesome: false,
  //   spellChecker: false,
  //   toolbar: false,
  //   theme: 'markdownload',
  //   overlayMode: { mode: overlayMode }
  // })

  // editor.codemirror.on("cursorActivity", (cm) => {
  //   // todo: add a popup for highlighting?
  //   // console.log(cm.getSelection())
  // })

  // setupToolbar()

  // function setupToggle(optionName) {
  //   let el = document.getElementById(optionName)
  //   el.classList.toggle('active', options[optionName])
  //   el.addEventListener('click', function() {
  //     options[optionName] = !options[optionName]
  //     this.classList.toggle('active', options[optionName])
  //     options.save()
  //   })
  // }

  // async function setupToolbar() {
  //   setupToggle('useReadability')
  //   setupToggle('includeTemplate')
  //   setupToggle('downloadImages')

  //   document.getElementById('capture-page').addEventListener('click', grabContent)
  //   document.getElementById('capture-selection').addEventListener('click', grabSelection)
  //   // document.getElementById('download').addEventListener('click', download)
  //   document.getElementById('clear').addEventListener('click', clear)
  //   document.getElementById('help').addEventListener('click', help)
  //   document.getElementById('options').addEventListener('click', openOptions)

  //   let previewToggle = document.getElementById('togglePreview')
  //   previewToggle.addEventListener('click', () => {
  //     previewToggle.classList.toggle('active', editor.isPreviewActive())
  //     editor.togglePreview()
  //   })
  //   previewToggle.classList.toggle('active', !editor.isPreviewActive())


  //   let settingsToggle = document.getElementById('toggleSettings')
  //   settingsToggle.addEventListener('click', () => {
  //     settingsToggle.classList.toggle('active')
  //     document.querySelector('#settings.toolbar').classList.toggle('active')
  //   })
  // }

  // let myWindowId

  // async function clear() {
  //   if(confirm("Anything not saved will be lost.\nAre you sure you want to clear all text?")){
  //     await api.clear()
  //     editor.value('')
  //   }
  // }

  // async function addContent(content){
  //   editor.codemirror.getDoc().replaceSelection(content)
  //   await api.setContent(editor.value())
  // }

  // async function grabSelection() {
  //   const md = await api.grabSelectionContent(await getCurrentTabId())
  //   await addContent(options.useReadability ? md.readable.markdown : md.markdown)
  // }

  // async function grabContent() {
  //   const md = await api.grabPageContent(await getCurrentTabId())
  //   await addContent(options.useReadability ? md.readable.markdown : md.markdown)
  // }

  // function help() {
  //   browser.tabs.create({url: "https://github.com/deathau/markdownload/blob/master/user-guide.md"})
  // }
  
  // function openOptions() {
  //   browser.tabs.create({url: "/options/options.html"})
  // }

  // async function getCurrentTabId() {
  //   return (await browser.tabs.query({windowId: myWindowId, active: true}))[0].id
  // }


  // /*
  // Update content when a new tab becomes active.
  // */
  // browser.tabs.onActivated.addListener(updateContent);

  // /*
  // Update content when a new page is loaded into a tab.
  // */
  // browser.tabs.onUpdated.addListener(updateContent);

  /*
  When the sidebar loads, get the ID of its window,
  and update its content.
  */
  // browser.windows.getCurrent({populate: true}).then((windowInfo) => {
  //   myWindowId = windowInfo.id;
  //   // updateContent();
  // })
})()