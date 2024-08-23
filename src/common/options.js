globalThis.browser ??= chrome;

export const defaultOptions = {
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

  useReadability: true,
}

export default class Options {
  constructor(options = null) {
    this.init(options ?? defaultOptions)
  }

  init(options) {
    this.headingStyle       = options.headingStyle
    this.hr                 = options.hr
    this.bulletListMarker   = options.bulletListMarker
    this.codeBlockStyle     = options.codeBlockStyle
    this.fence              = options.fence
    this.emDelimiter        = options.emDelimiter
    this.strongDelimiter    = options.strongDelimiter
    this.linkStyle          = options.linkStyle
    this.linkReferenceStyle = options.linkReferenceStyle
    this.imageStyle         = options.imageStyle
    this.imageRefStyle      = options.imageRefStyle
    this.frontmatter        = options.frontmatter
    this.backmatter         = options.backmatter
    this.title              = options.title
    this.includeTemplate    = options.includeTemplate
    this.saveAs             = options.saveAs
    this.downloadImages     = options.downloadImages
    this.imagePrefix        = options.imagePrefix
    this.mdClipsFolder      = options.mdClipsFolder
    this.disallowedChars    = options.disallowedChars
    this.downloadMode       = options.downloadMode
    this.turndownEscape     = options.turndownEscape
    this.contextMenus       = options.contextMenus

    this.useReadability     = options.useReadability

    this.obsidianIntegration = options.obsidianIntegration
    this.obsidianVault      = options.obsidianVault
    this.obsidianFolder     = options.obsidianFolder

    // todo = figure out downloads
  }

  static async getOptions() {
    let options = new Options()
    await options.load()
    return options
  }

  async load() {
    try { this.init(await browser.storage.sync.get(defaultOptions)) }
    catch(err) { console.error(err) }
  }

  async save() {
    try { await browser.storage.sync.set({...this}) }
    catch(err) { console.error(err) }
  }
}