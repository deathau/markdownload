# MarkDownload User Guide
## Basic Usage
Simply click the ![](src/icons/favicon-16x16.png) Markdown icon in the browser's extension area to show a popup containing the current website as Markdown. Here you can make quick edits to the content or the title before clicking the Download button at the bottom of the popup to download the content as a Markdown file. The file will be named according to the text in the title box at the top of the popover.

Because the website is first passed through a readability process, you won't get extra content such as website navigation, footers and advertisements. However, please note that not all websites are created equal and as such some sites may not clip the content you expect.

### Clipping Selected Text
If you select text on the page *and then* click the ![](src/icons/favicon-16x16.png) Markdown icon, you will have the option of clipping just the selected text, or the entire document. This is great for capturing small snippets of a website, or for websites whose main content may not clip properly.

Furthermore, if you select text *within* the popup, a "Download Selected" button will appear, allowing you to download just the selected section of text in the popup

### Include Front/Back Template
The popup also includes the option to "Include front/back template". This is extra text and metadata that can appear at the start and/or end of the clipping. You can customize the templates for these in the [Front/Back Templates](#Front%2FBack%20Templates)

## Context Menu
A couple of options are available in the context menu by right clicking on a page and hovering over the MarkDownload option.

### Download Tab as Markdown
Select this option to download the current tab as a Markdown file, without having to open the popup. You can also set up a shortcut key for this functionality in your browser's settings (<kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>M</kbd> by default)

### Download Selection as Markdown
Select this option to download the currently selected section of the web page as a Markdown file, without having to open the popup

### Download All Tabs as Markdown
Selecting this option will download all open tabs in the current window as Markdown files.

### Copy Tab as Markdown
This converts the current tab's content as Markdown and copies it to the clipboard, so you can paste it in another program

### Copy Selection as Markdown
This converts the  currently selected section of the web page as Markdown and copies it to the clipboard, so you can paste it in another program

### Copy Tab URL as Markdown Link
Copies the current tab's url and title as a Markdown link to be pasted into another Markdown document

### Copy Selected Tabs as Markdown Link
Copies all selected tabs into Markdown link to be pasted into another Markdown document

### Copy Link as Markdown
**Only when right-clicking on a link**  
Copies the selected link as a Markdown link to be pasted into another Markdown document

### Copy Image as Markdown
**Only when right-clicking on an image**  
Copies the selected image as a Markdown image embed to be pasted into another Markdown document

### Include Front/Back Template
This allows you to toggle the setting via the context menu — for if you would like the templates to be included without using the popup. As mentioned above,  you can customize the templates in the [Front/Back Templates](#Front%2FBack%20Templates)

## Extension Options
One of the best features of MarkDownload is that it is highly customizable. Open the extension's options and tweak things to work the way *you* want them to.

### Title Template
This is what will be displayed in the popup as the file's title, and what will be the resulting markdown file's filename. Utilizes [Custom Text Substitutions](#Custom%20Text%20Substitutions)

**Default value:** `{title}`

### Subfolder
**Only available if [Download Mode](#Download%20Mode) is set to "Downloads API" (Not supported in Safari)**  
This specifies a subfolder within your downloads folder to save downloaded files. A security limitation of modern browsers prevents this folder being outside the browser's specified downloads folder. Utilizes [Custom Text Substitutions](#Custom%20Text%20Substitutions)

**Default value:** (none)

### Disallowed Characters
There are specific characters that are automatically stripped from filenames, as they are invalid on certain operating systems. This setting allows you to add more characters to strip out, in case they are not supported in other programs you use.

**Default value:** `[]#^` (these characters can cause issues with Obsidian)

### Front/Back Templates
This is the text you would like to appear at the start or end of any downloaded Markdown files. Useful for supplying metadata. Utilizes [Custom Text Substitutions](#Custom%20Text%20Substitutions).

**Default value (front):**
```
---
created: {date:YYYY-MM-DDTHH:mm:ss} (UTC {date:Z})
tags: [{keywords}]
source: {baseURI}
author: {byline}
---

# {pageTitle}

> ## Excerpt
> {excerpt}

---
```
**Default value (back):** (none)

### Download Mode
**The Downloads API is recommended, but is not supported in the current version of Safari**  
This specifies the method to use for downloading Markdown files. Set to "Content Link" if you're having trouble with the Downloads API (Sometimes conflicts can occur with other download extensions, leading to randomly generated filenames and other symptoms).

**Note:** "Content Link" mode is more limited and thus disables some functionality such as downloading images or using subfolders.

### Show Save As Dialog
**Only available if [Download Mode](#Download%20Mode) is set to "Downloads API" (Not supported in Safari)**  
When this is on, the Save As popup will show when downloading a markdown file through the extension, regardless of the browser's current settings. Note that this is *not* recommended if [Download Images](#Download%20Images) is on.

### Download Images
**Only available if [Download Mode](#Download%20Mode) is set to "Downloads API" (Not supported in Safari)**  
Turning this on will download images alongside Markdown files you download. The Markdown can even be adjusted to link to these local images, rather than the online ones (depending on your [Image Format](#Image Format) setting).

### Image Filename Prefix
**Only available if [Download Images](#Download%20Images) is on (Not supported in Safari)**  
This allows you to provide a prefix and/or subfolder for images downloaded alongside markdown files. Including a forward slash (`/`) will specify a subfolder.

**Default value:** `{title}/` — this means images will download in a folder with the same name as the Markdown file

### Heading Style
- Setext Style headers:
```markdown
All About Dogs
==============
```
- Atx-Style Headers
```markdown
# All About Dogs
```

### Horizontal Rule Style
- `***`
- `---`
- `___`

### Bullet List Marker
- `*`
- `-`
- `+`

### Code Block Style
- Indented
```markdown
····const helloWorld = () => {
········console.log("Hello World");
····}
```
- Fenced
~~~markdown
```
const helloWorld = () => {
····console.log("Hello World");
}
```
~~~

### Code Block Fence
**If [Code Block Style](#Code%20Block%20Style) is "Fenced"**  
- <code>```</code>
- `~~~`

### Emphasis (italics) Delimiter
- `_italics_`
- `*italics*`

### Strong (bold) Delimiter
- `**bold**`
- `__bold__`

### Link Style
- Inlined
```markdown
Link to [Google](http://google.com)
```
- Referenced
```markdown
Link to [Google]

[Google]: http://google.com
```
- Strip links
```markdown
Link to Google
```

### Link Reference Style
**If [Link Style](#Link%20Style) is "Referenced"**  
- Full
```markdown
Link to [Google][1]

[1]: http://google.com
```
- Collapsed
```markdown
Link to [Google][]

[Google]: http://google.com
```
- Shortcut
```markdown
Link to [Google]

[Google]: http://google.com
```

### Image Style
- Original Source
```markdown 
Figure 1: ![](http://example.com/img/image.jpg)
```
- Strip Images
```markdown
Figure 1: 
```
**The following options only apply if [Download Images](#Download%20Images) is on (Not supported in Safari)**  
- Pure Markdown
```markdown
![](folder/image.jpg)
```
- Obsidian internal embed
```markdown
![[folder/image.jpg]]
```
- Obsidian internal embed (no folder prefix)
```markdown
![[image.jpg]]
```

### Escape Markdown Characters
By default, backslashes (`\`) are used to escape Markdown characters in the HTML input. This ensures that these characters are not interpreted as Markdown. For example, the contents of `<h1>1. Hello world</h1>` needs to be escaped to `1\. Hello world`, otherwise it will be interpreted as a list item rather than a heading.

Disabling this option disables this escaping.

## Custom Text Substitutions
For options such as the [Title Template](#Title%20Template), [Subfolder](#Subfolder), [Front/Back Templates](#Front%2FBack%20Templates) and [Image Filename Prefix](#Image%20Filename%20Prefix), you can specify text substitutions, based on the website metadata and/or the current date. The following options are available:

-   `{title}` \- Article Title
-   `{pageTitle}` \- Title of the actual page
-   `{length}` \- Length of the article, in characters
-   `{excerpt}` \- Article description or short excerpt from the content
-   `{byline}` \- Author metadata
-   `{dir}` \- Content direction
-   `{baseURI}` \- The url of the article
-   `{date:FORMAT}` \- The current date and time. Check the [format reference](https://momentjs.com/docs/#/displaying/format/)
-   `{keywords}` \- Meta keywords (if present). Comma separated by default.
-   `{keywords:SEPARATOR}` \- Meta keywords (if present) separated by SEPARATOR. For example, to separate by space, use `{keywords: }`

There is also support for all meta tags not mentioned above, should the page you are clipping support them. For example, try `{og:image}` or any other widely supported meta tags.

Note that not all websites will provide all values.
