import '/3rd-party/easymde.min.js'
import StateManager from '../common/state-manager.js'
import Options from '../common/options.js'
import overlayMode from '../common/cm-md-overlay.js'

globalThis.browser ??= chrome;

class Sidepanel {
  constructor(document) {
    this.document = document
    this.api = new StateManager()
    this.windowId = null
    this.editor = null
    Options.getOptions().then(async o => {this.options = o; await this.init()})
  }

  init = async () => {
    // get the current window id
    this.windowId = (await browser.windows.getCurrent({populate: true})).id

    // initialize the editor
    this.editor = new EasyMDE({
      element: this.document.getElementById('content'),
      autoDownloadFontAwesome: false,
      spellChecker: false,
      toolbar: false,
      theme: 'markdownload',
      overlayMode: { mode: overlayMode }
    })

    // todo: add a popup for highlighting?
    this.editor.codemirror.on("cursorActivity", (cm) => {
      // console.log(cm.getSelection())
    })

    // setup the toolbar buttons
    await this.setupToolbar()
  }

  download = async () => {
    // todo: add the download functionality
  }

  clear = async () => {
    // make sure you really want to clear it
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
    this.document.getElementById('download').addEventListener('click', this.download)
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
  // check that we have the right permissions and redirect if we don't
  const permissions = { origins: ["*://*/*"] }
  let hasPermission = await browser.permissions.contains(permissions)
  if(!hasPermission){
    location.replace(browser.runtime.getURL('/sidepanel/welcome.html'))
    return
  }

  const sidepanel = new Sidepanel(document)
})()