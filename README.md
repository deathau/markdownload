# MarkDownload - Markdown Web Clipper

[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/deathau/markdownload?style=for-the-badge&sort=semver)](https://github.com/deathau/markdownload/releases/latest)

This is an extension to clip websites and download them into a readable markdown file. Please keep in mind that it is not guaranteed to work on all websites.

To use this add-on, simply click the add-on icon while you are browsing the page you want to save offline. A popup will show the rendered markdown so you can make minor edits or copy the text, or you can click the download button to download an .md file.  
Selecting text will allow you to download just the selected text

See the [Markdownload User Guide](https://github.com/deathau/markdownload/blob/master/user-guide.md#markdownload-user-guide) for more details on the functionality of this extension

# Installation
The extension is available for [Firefox](https://addons.mozilla.org/firefox/addon/markdownload/), [Google Chrome](https://chrome.google.com/webstore/detail/markdownload-markdown-web/pcmpcfapbekmbjjkdalcgopdkipoggdi), [Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/hajanaajapkhaabfcofdjgjnlgkdkknm) and [Safari](https://apple.co/3tcU0pD).

[![](https://img.shields.io/chrome-web-store/v/pcmpcfapbekmbjjkdalcgopdkipoggdi.svg?logo=google-chrome&style=flat)](https://chrome.google.com/webstore/detail/markdownload-markdown-web/pcmpcfapbekmbjjkdalcgopdkipoggdi) [![](https://img.shields.io/chrome-web-store/rating/pcmpcfapbekmbjjkdalcgopdkipoggdi.svg?logo=google-chrome&style=flat)](https://chrome.google.com/webstore/detail/markdownload-markdown-web/pcmpcfapbekmbjjkdalcgopdkipoggdi) [![](https://img.shields.io/chrome-web-store/users/pcmpcfapbekmbjjkdalcgopdkipoggdi.svg?logo=google-chrome&style=flat)](https://chrome.google.com/webstore/detail/markdownload-markdown-web/pcmpcfapbekmbjjkdalcgopdkipoggdi)

[![](https://img.shields.io/amo/v/markdownload.svg?logo=firefox&style=flat)](https://addons.mozilla.org/en-US/firefox/addon/markdownload/) [![](https://img.shields.io/amo/rating/markdownload.svg?logo=firefox&style=flat)](https://addons.mozilla.org/en-US/firefox/addon/markdownload/) [![](https://img.shields.io/amo/users/markdownload.svg?logo=firefox&style=flat)](https://addons.mozilla.org/en-US/firefox/addon/markdownload/)

[![](https://img.shields.io/badge/dynamic/json?label=edge%20add-on&prefix=v&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fhajanaajapkhaabfcofdjgjnlgkdkknm&style=flat&logo=microsoft-edge)](https://microsoftedge.microsoft.com/addons/detail/hajanaajapkhaabfcofdjgjnlgkdkknm) [![](https://img.shields.io/badge/dynamic/json?label=rating&suffix=/5&query=%24.averageRating&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fhajanaajapkhaabfcofdjgjnlgkdkknm&style=flat&logo=microsoft-edge)](https://microsoftedge.microsoft.com/addons/detail/hajanaajapkhaabfcofdjgjnlgkdkknm)

[![iTunes App Store](https://img.shields.io/itunes/v/1554029832?label=Safari&logo=safari&style=flat)](https://apple.co/3tcU0pD)

# Obsidian Integration

For integration with obsidian, you need to install and enable community plugins named "Advanced Obsidian URI". This plugin help us to bypass character limitation in URL. Because it's using clipboard as the source for creating new file.
More information about Advanced Obsidian URI plugin:  https://vinzent03.github.io/obsidian-advanced-uri/

You need to do some configurations in order to use this integration.
<details>
  <summary>Steps to follow</summary>
  
  1. Left-Click on the extension
  2. Click on the gear icon to open the configuration menu  
  3. Scroll down to "Obsidian integration" section and turn "enable obsidian integration" on.
  4. Fill out the form below (Obsidian vault name and Obsidian folder name.)
  5. Right-click on the extension and open the menu
  6. In "MarkDownload - Markdown Web Clipper", select "Send Tab to Obsidian"

</details>



# External Libraries
It uses the following libraries:
- [Readability.js](https://github.com/mozilla/readability) by Mozilla version [0.5.0](https://github.com/mozilla/readability/releases/tag/0.5.0). This library is also used for the Firefox Reader View and it simplifies the page so that only the important parts are clipped. (Licensed under Apache License Version 2.0)
- [Turndown](https://github.com/mixmark-io/turndown) by Dom Christie in version [7.1.3](https://github.com/mixmark-io/turndown/releases/tag/v7.1.3) is used to convert the simplified HTML (from Readability.js) into markdown. (Licensed under MIT License)
- [Moment.js](https://momentjs.com) version 2.29.4 used to format dates in template variables

# Permissions
- Data on all sites: used to enable "Download All Tabs" functionality - no other data is captured or sent online
- Access tabs: used to access the website content when the icon in the browser bar is clicked.
- Manage Downloads: necessary to be able to download the markdown file.
- Storage: used to save extension options
- Clipboard: used to copy Markdown to clipboard

--- 
The Common Mark icon courtesy of https://github.com/dcurtis/markdown-mark

## Pricing
This is an open-source extension I made *for fun*. Its intention is to be completely free.
It's free on Firefox, Edge and Chrome (and other Chromium browsers),
but unfortunately for Safari there is a yearly developer fee, so I've decided to
charge a small price for the Safari version to help cover that cost.
Alternately, you can become a GitHub Sponsor for as little as $2 per month and
you can request a key for the Safari version.
Also, even if you're using the free version and you absolutely *have* to
send me money because you like it that much, feel free to throw some coins
in my hat via the following:

[![GitHub Sponsors](https://img.shields.io/github/sponsors/deathau?style=social)](https://github.com/sponsors/deathau)
[![Paypal](https://img.shields.io/badge/paypal-deathau-yellow?style=social&logo=paypal)](https://paypal.me/deathau)

# Version History
## 3.4.0
- Fixed extra spaces in titles which could cause issues (thanks @rickdoesdev !)
- Fixed an issue with image paths in some circumstances (thanks @rickdoesdev !)
- Added parametersizations for "mixed-kebab" and "mixed_snake" which retain original casing but replace spaces (thanks @NSHenry !)
  - Also added a special "obsidian-cal" parameterization which is the same as "mixed-kebab" with duplicate `-` removed for additional compatibility with the Obsidian Consistent Attachment Location plugin (thanks @NSHenry !)
- Added lowecase and uppercase options to parameterizations (thanks @redxtech !)
- Updated Turndown to v7.1.3 (thanks @WeHat !)
- Updated Readability to v0.5.0 (thanks @WeHat !)
- Fixed some issues with code block parsing and formatting (thanks @WeHat !)
- Fixed an issue with some sites missing a proper title (thanks @WeHat !)
- Fixed an issue with bad base urls causing issues with links in certain circumstances (thanks @WeHat !)
- Fixed an issue with readability removing everything in certain circumstances (thanks @WeHat !)
- Send properly configured title to the Obsidian integration (thanks @nekton39 !)
- Updates to the README (thanks @2gn and @eugenesvk !)

> Previous version history is recorded in [CHANGELOG.md](./CHANGELOG.md)
