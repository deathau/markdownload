# MarkDownload - Markdown Web Clipper

[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/deathau/markdownload?style=for-the-badge&sort=semver)](https://github.com/deathau/markdownload/releases/latest)

This is an extension to clip websites and download them into a readable markdown file. Please keep in mind that it is not guaranteed to work on all websites.

🚧 This is in the process of being rewritten from scratch. Stuff may not work or be completely out-of-date. Go check out the main branch. 🚧

## Installation
The extension is available for [Firefox](https://addons.mozilla.org/en-GB/firefox/addon/markdownload/), [Google Chrome](https://chrome.google.com/webstore/detail/markdownload-markdown-web/pcmpcfapbekmbjjkdalcgopdkipoggdi), [Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/hajanaajapkhaabfcofdjgjnlgkdkknm) and [Safari](https://apple.co/3tcU0pD).

[![](https://img.shields.io/chrome-web-store/v/pcmpcfapbekmbjjkdalcgopdkipoggdi.svg?logo=google-chrome&style=flat)](https://chrome.google.com/webstore/detail/markdownload-markdown-web/pcmpcfapbekmbjjkdalcgopdkipoggdi) [![](https://img.shields.io/chrome-web-store/rating/pcmpcfapbekmbjjkdalcgopdkipoggdi.svg?logo=google-chrome&style=flat)](https://chrome.google.com/webstore/detail/markdownload-markdown-web/pcmpcfapbekmbjjkdalcgopdkipoggdi) [![](https://img.shields.io/chrome-web-store/users/pcmpcfapbekmbjjkdalcgopdkipoggdi.svg?logo=google-chrome&style=flat)](https://chrome.google.com/webstore/detail/markdownload-markdown-web/pcmpcfapbekmbjjkdalcgopdkipoggdi)

[![](https://img.shields.io/amo/v/markdownload.svg?logo=firefox&style=flat)](https://addons.mozilla.org/en-US/firefox/addon/markdownload/) [![](https://img.shields.io/amo/rating/markdownload.svg?logo=firefox&style=flat)](https://addons.mozilla.org/en-US/firefox/addon/markdownload/) [![](https://img.shields.io/amo/users/markdownload.svg?logo=firefox&style=flat)](https://addons.mozilla.org/en-US/firefox/addon/markdownload/)

[![](https://img.shields.io/badge/dynamic/json?label=edge%20add-on&prefix=v&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fhajanaajapkhaabfcofdjgjnlgkdkknm&style=flat&logo=microsoft-edge)](https://microsoftedge.microsoft.com/addons/detail/hajanaajapkhaabfcofdjgjnlgkdkknm) [![](https://img.shields.io/badge/dynamic/json?label=rating&suffix=/5&query=%24.averageRating&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fhajanaajapkhaabfcofdjgjnlgkdkknm&style=flat&logo=microsoft-edge)](https://microsoftedge.microsoft.com/addons/detail/hajanaajapkhaabfcofdjgjnlgkdkknm)

[![iTunes App Store](https://img.shields.io/itunes/v/1554029832?label=Safari&logo=safari&style=flat)](https://apple.co/3tcU0pD)

To run the development version of this extension, download or clone the repo, then load the `src` folder as an unpacked extension (this process can be googled).
Alternately, I generally test the extension with the [web-ext](https://github.com/mozilla/web-ext) command line tool.

## External Libraries
In order to preserve integrity with released versions of 3rd-party libraries being used, but not have to use some sort of "build" step, I've taken a slightly unorthadox approach.
All 3rd-party libraries used have been downloaded directly from [unpkg](https://unpkg.com/) and added to the [3rd-party](./src/3rd-party) folder.
Also in that folder is a file called [_sources.json](./src/3rd-party/_sources.json), which lists the URLs I downloaded the file from, and the unpkg metadata to go along with it so that integrity hashes can be checked, and double checked against unpkg itself.

I claim no responisibility over the code contained within these 3rd-party modules.

Current 3rd-party modules include:
- [Simple.css](https://simplecss.org/) by [Kev Quirk](https://kevquirk.com/) — a simple css framework to shore up the basic style of ui in this extension. ([License](https://github.com/kevquirk/simple.css/blob/main/LICENSE))
- [Readability.js](https://github.com/mozilla/readability) by [Mozilla](https://www.mozilla.org/) — a library used by Firefox Reader View used to simplify pages so that only the important parts are clipped, as well as providing extra metadata. ([License](https://github.com/mozilla/readability/blob/main/LICENSE.md))
- [Turndown](https://github.com/mixmark-io/turndown) by [Dom Christie](https://domchristie.co.uk/about/) — used to convert HTML into Markdown. ([License](https://github.com/mixmark-io/turndown/blob/master/LICENSE))
- [Turndown Plugin GFM](https://github.com/mixmark-io/turndown-plugin-gfm) by [Dom Christie](https://domchristie.co.uk/about/) — a plugin for Turndown to add in strikethrough, tables and task list items ([License](https://github.com/mixmark-io/turndown-plugin-gfm/blob/master/LICENSE))
- [EasyMDE](https://github.com/Ionaru/easy-markdown-editor) by [Jeroen Akkerman](https://github.com/Ionaru) — a markdown editor based on CodeMirror used as the basis for the markdown display and editing in the sidebar

The Common Mark icon courtesy of https://github.com/dcurtis/markdown-mark

## Permissions
The following permissions are requested from the browser:
- `activeTab` — Access the active tab to get the content
- `scripting` — Run script to modify and grab the content of a page
- `storage` — Used to save extension options
- `debugger` — For debugging purposes. Will probably be removed before release.
- `sidePanel` — For displaying the side panel view on Firefox
- `origins: ["*://*/*"]` (i.e. data on all sites) — Requested at runtime (requires user interaction) in order to run scripts on any site to grab its content

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