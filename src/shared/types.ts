export interface Options {
  headingStyle: 'atx' | 'setext';
  hr: '***' | '---' | '___';
  bulletListMarker: '-' | '*' | '+';
  codeBlockStyle: 'fenced' | 'indented';
  fence: '```' | '~~~';
  emDelimiter: '_' | '*';
  strongDelimiter: '**' | '__';
  linkStyle: 'inlined' | 'referenced' | 'stripLinks';
  linkReferenceStyle: 'full' | 'collapsed' | 'shortcut';
  imageStyle:
    | 'markdown'
    | 'obsidian'
    | 'obsidian-nofolder'
    | 'originalSource'
    | 'noImage'
    | 'base64';
  imageRefStyle: 'inlined' | 'referenced';
  frontmatter: string;
  backmatter: string;
  title: string;
  includeTemplate: boolean;
  saveAs: boolean;
  downloadImages: boolean;
  imagePrefix: string;
  mdClipsFolder: string | null;
  disallowedChars: string | null;
  downloadMode: 'downloadsApi' | 'contentLink';
  turndownEscape: boolean;
  contextMenus: boolean;
  obsidianIntegration: boolean;
  obsidianVault: string;
  obsidianFolder: string;
  clipSelection: boolean;
}

export interface MathInfo {
  tex: string;
  inline: boolean;
}

export interface Article {
  title: string;
  content: string;
  textContent: string;
  length: number;
  excerpt: string;
  byline: string | null;
  dir: string | null;
  siteName: string | null;
  lang: string | null;
  baseURI: string;
  pageTitle: string;
  hash: string;
  host: string;
  origin: string;
  hostname: string;
  pathname: string;
  port: string;
  protocol: string;
  search: string;
  publishedTime?: string | null;
  keywords?: string[];
  math: Record<string, MathInfo>;
  [key: string]: unknown;
}

export interface ConversionResult {
  markdown: string;
  imageList: Record<string, string>;
}

export interface ClipMessage {
  type: 'clip';
  dom: string;
  selection?: string;
  clipSelection?: boolean;
  includeTemplate?: boolean;
  downloadImages?: boolean;
}

export interface DownloadMessage {
  type: 'download';
  markdown: string;
  title: string;
  tab: chrome.tabs.Tab;
  imageList: Record<string, string>;
  mdClipsFolder: string;
}

export interface DisplayMessage {
  type: 'display.md';
  markdown: string;
  article: Article;
  imageList: Record<string, string>;
  mdClipsFolder: string;
}

export type Message = ClipMessage | DownloadMessage | DisplayMessage;

export interface SelectionAndDom {
  selection: string;
  dom: string;
}
