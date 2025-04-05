# Changelog
## 3.4.0
- Fixed extra spaces in titles which could cause issues (thanks @rickdoesdev !)
- Fixed an issue with image paths in some circumstances (thanks @rickdoesdev !)
- Added parametersizations for "mixed-kebab" and "mixed_snake" which retain original casing but replace spaces (thanks @NSHenry !)
  - Also added a special "obsidian-cal" parameterization which is the same as "mixed-kebab" with duplicate `-` removed for additional compatibility with the Obsidian Consistent Attachment Location plugin (thanks @NSHenry !)
- Added lowercase and uppercase options to parameterizations (thanks @redxtech !)
- Updated Turndown to v7.1.3 (thanks @WeHat !)
- Updated Readability to v0.5.0 (thanks @WeHat !)
- Fixed some issues with code block parsing and formatting (thanks @WeHat !)
- Fixed an issue with some sites missing a proper title (thanks @WeHat !)
- Fixed an issue with bad base urls causing issues with links in certain circumstances (thanks @WeHat !)
- Fixed an issue with readability removing everything in certain circumstances (thanks @WeHat !)
- Send properly configured title to the Obsidian integration (thanks @nekton39 !)
- Updates to the README (thanks @2gn and @eugenesvk !)
## 3.3.0
- Remove hidden content before exporting (thanks @nhaouari !). This allows you to use a different extension (e.g. Adblock) to hide elements that would otherwise clutter up your export
- Fixes for Obsidian integration in Safari (thanks @aancw !)
- Keep a few more HTML tags that have no markdown equivalent (`u`, `ins`, `del`, `small`, `big`) (thanks @mnaoumov !)
- Add support for KaTeX formulas parsing (thanks @mnaoumov !)
- Fixed saving for options when imported from file (and show a little 'saved' indicator)
- Added a toggle for downloading images in the context menu and popup
- Added a link to the options in the popup
- Added some basic error handling to the popup
- Changes to how html inside code blocks is handled (thanks @mnaumov !)
- Treat codehilite without specified language as plaintext (thanks @mnaoumov !)
- Ensure sequential line breaks in <pre> are preserved in code blocks (thanks @mnaumov !)
- Update user guide link in README to point to GitHub
- Added keyboard shortcuts to copy selection / current tab to obsidian (user-definable in browsers that support that) (thanks @legolasdimir and @likeablob !)
- Select multiple tabs (hold crtl/cmd) then copy all tab urls as a markdown link list via keyboard shortcut or context menu (thanks @romanPrignon !)
- Allow users to include custom text such like `{date:YYYY-MM-DD}/`` in their Obsidian Folder Name setting (thanks @likeablob !)
- Fixed a small typo in the user guide (thanks @devon-research !)
- Fix for missing headings on sites like Substack (thanks @eactisgrosso !)
- Add support for websites using MathJax 3 (thanks @LeLocTai !)
## 3.2.1
- Bugfixes for the Obsidian integration (thanks @aancw !)
## 3.2.0
- Added a basic Obsidian integration using the [Obsidian Advanced URI](https://vinzent03.github.io/obsidian-advanced-uri/) plugin and clipboard (thanks @aancw !)
- Keep sub/sup tags so that superscript and subscript text is retained (thanks @mnaoumov !)
- Added a keyboard shortcut for copy selection as markdown (nothing by default, needs to be user-configured)
- Added a new context menu item to copy all tabs as a list of markdown links
- Updated dependencies

## 3.1.0
- Firefox for Android (nightly) support
- Updated Readability and Turndown
- Added GitHub-flavoured Markdown (GFM) plugin to Turndown (adds some markdown table support)
- Added support for MathJax -> LaTeX (thanks @LeLocTai)
- Disallow slashes in title text replacements
- Support for Open Graph meta tags as variables (which use `property` instead of `key`)
- Fixed an issue with regex characters like `|` in date formats
- Resolved an extra slash in file name causing images to fail to download in chromium browsers
- Added some support to parse pre elements as code blocks (supports syntax highlighting on GitHub, but not much else yet)
- Added option to enable or disable the context menus
- Added some extra keyboard shortcuts. These can be customised, depending on your browser
    - <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>M</kbd> opens the popup (as it has in previous versions)
    - <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd> downloads the current tab as markdown, bypassing the popup
    - <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd> copies the current tab as markdown to the clipboard, bypassing the popup
    - <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>L</kbd> copies the current tabs URL as a markdown link to the clipboard
- Added support for template variables having different casing using `:` followed by the casing type. For example, for an article titled "Different Types of Casing":
    - `{pageTitle:pascal}` — "DifferentTypesOfCasing"
    - `{pageTitle:camel}` — "differentTypesOfCasing"
    - `{pageTitle:kebab}` — "different-types-of-casing"
    - `{pageTitle:snake` — "different_types_of_casing"
- Added support for rending italics in double underscores (`__`). This isn't valid MarkDown (will output as __bold__), but it's useful for people copying to Roam
- Support image download as base64 embedded urls, directly in the markdown file
- Added some extra variables related to the url beyond the existing `{baseURI}`:
    - `{origin}` - The origin of the URL, that is its scheme, its domain and its port
    - `{host}` - The domain (that is the _hostname_) followed by (if a port was specified) a `:` and the _port_ of the URL.
    - `{hostname}` - The domain of the URL.
    - `{port}` - The port number of the URL.
    - `{protocol}` - The protocol scheme of the URL, including the final `':'`.
    - `{pathname}` - An initial `'/'` followed by the path of the URL, not including the query string or fragment.
    - `{search}` - The URL's parameter string; if any parameters are provided, this string includes all of them, beginning with the leading `?` character.

## 3.0.0
- Theme revamp
- Utilizing CodeMirror for the Markdown Editor
- Strip Disallowed characters on title and image filenames during text replacement
- Add "Download Type" option, to attempt to resolve conflicts with other Download extensions (and to help support Safari!)
- Add options for stripping images and links
- Fixes around downloading images and getting correct urls in the markdown
- Added meta keywords support for the text replace
- Added text replace support for meta tags in general
- Add option to disable turndown escaping
- Strip out 'red dot' special characters
- Added an option to specify a download path (within the downloads folder). Thanks to Nikita Lukianets!

## 2.4.1
- Add option for Obsidian-style image links (when downloading images with the markdown file)
- Downloaded images should download relative to the markdown file in the case where you specify a subfolder in your title template
- Front- and back-matter template will no longer put in extra lines on Opera
- Adjusted the way text is copied to the clipboard

## 2.4.0
- Fixed typo on options page (thanks Dean Cook)
- Added option to download images alongside the markdown file
    - Also added the ability to add a prefix to the images you download, so you can, for example, save them in a subfolder
    - If your browser has the option to always show a save as dialog enabled, you might get a dialog for every image. Sorry about that 😬
- Updated turndown to 7.0.1 and allowed iframes to be kept in the markdown
- Added a new `{pageTitle}` option for template replacement (there are many websites where the `{title}` and `{pageTitle}` actually differ)
- Added a context menu option to copy a tab URL as a markdown link, using the title configured in settings as the link title (i.e. `[<custom title>](<URL>)`)
- Added custom disallowed characters to strip from titles (set to `[]#^` by default for maximum compatibility with Obsidian)
- Added some focus styling so you can tell what is focused
- Auto-focus the download button (you can now `ctrl`+`shift`+`M`, Enter to quickly download a file)
- Template title (and image prefixes) now allow forward slashes (`/`) so that files get saved to a subfolder

## 2.3.1
- Added template toggle to Firefox's tab context menu

## 2.3.0
- Added contexy menus for copying markdown
- Added options to clip selected text
- Include front-matter/back-matter templates in popup
- Add title templating
- Added keyboard shortcut to show the popup
- Added option to always show Save As
- Added context menus to download all tabs as markdown

## 2.2.0
- Added extension options 
    - Turndown (markdown generation) options
    - Front-matter/back-matter templates with replacement variables from page metadata (and date)

## 2.1.6
- Replace non-breaking spaces in filenames

## 2.1.5
- Fixed an issue with sites with invalid `<base>` tags

## 2.1.4
- Fixed issue with relative links [#1](https://github.com/deathau/markdownload/issues/1)

## 2.1.3
- Fist change, forked from [enrico-kaack/markdown-clipper](https://github.com/enrico-kaack/markdown-clipper)
- Added URL to markdown output ([#5](https://github.com/deathau/markdownload/issues/5))
