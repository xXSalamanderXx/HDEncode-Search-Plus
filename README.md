# HDEncode Filter Suite

![HDEncode Filter Suite](https://raw.githubusercontent.com/mikeymuis/hdencode-filter-suite/main/screenshot.png)

HDEncode is a great source for releases of all kinds, movies, TV shows, TV packs. The site has filters, but I kept missing specific options. I mainly use it to track down specific TV show releases and wanted to combine things like release group, Dolby Vision and resolution in one go. Doing that manually meant scrolling through pages every single time. This script adds the extra filter options I was missing, directly above the release grid.

---

## Features

**Filtering**
- Dolby Vision & HDR: quickly isolate releases by HDR format
- Resolution: filter by 2160p, 1080p or 720p
- Content type: separate Movies, TV Shows and TV Packs
- Minimum IMDb rating
- File size: set a minimum and/or maximum in GB
- Release group: dynamic dropdown populated from the current results, updates as you filter

**Search & navigation**
- Free-text search across all visible release info
- Multi-page loading: load 5, 10, 20, 50, 100 or all pages in one click, with a live progress bar

**Quality of life**
- Persistent filters: settings are saved to your browser's local storage and restored when you return. No data is sent anywhere.
- No results feedback: clear message when your filters return zero results, with your selection preserved
- Active filter highlights: a subtle cyan border shows which filters are currently active
- Quick links: click the "🔗 Links" button on any release to instantly fetch and display the download links without leaving the page. Copy links to clipboard with one click.

---

## Example

Want only 2160p Dolby Vision movies with an IMDb rating of 8 or higher and under 50 GB? Check Dolby Vision, select 2160p, set Min rating to 8, Max GB to 50 and select Movies. Hit Load pages to pull in more results and let the filters do the rest.

---

## Installation

### Requirements

- [Tampermonkey](https://www.tampermonkey.net/) browser extension (Chrome, Firefox, Edge, Safari)

The script is fully open-source so you can read every line of code before installing.

### Install

1. Make sure Tampermonkey is installed and enabled in your browser
2. Click the link below and Tampermonkey will detect it automatically:

   **[Install HDEncode Filter Suite](https://raw.githubusercontent.com/mikeymuis/hdencode-filter-suite/main/hdencode-filter-suite.user.js)**

3. Click **Install** in the Tampermonkey dialog
4. Navigate to [HDEncode.org](https://hdencode.org) and the filter bar will appear automatically above the release grid

Updates are delivered automatically via Tampermonkey whenever a new version is released.

---

## Usage

The filter bar appears at the top of the release grid on any HDEncode page.

### Row 1: Quality & content filters

| Control | Description |
|---|---|
| Dolby Vision | Show only Dolby Vision releases |
| HDR | Show only HDR releases |
| All resolutions | Filter by 2160p, 1080p or 720p |
| Min rating | Hide releases below this IMDb rating |
| Min GB / Max GB | Filter by file size |
| All / Movies / TV Shows / TV Packs | Filter by content type |

### Row 2: Search, groups & loading

| Control | Description |
|---|---|
| All groups | Filter by release group, populated dynamically from current results |
| Search anything | Free-text search across all release info |
| All pages | Choose how many additional pages to load |
| ↓ Load pages | Fetch additional pages into the current view with a live progress bar |
| ✕ Clear | Reset all filters and restore the full list |

### Tips

- Active filters are highlighted with a cyan border so you always know what's active
- The release group dropdown only shows groups that match your other active filters
- If a selected release group returns no results after changing other filters, your group selection is preserved. You'll see a red "No results" message rather than silently switching back to "All groups"
- Multi-page loading fetches pages sequentially with a small delay between requests, lightweight and respectful to the server
- Filter settings are saved in your browser's local storage automatically and restored when you return. Nothing is collected or shared.

---

## Compatibility

Tested on Chrome and Firefox with Tampermonkey. Should work with any Greasemonkey-compatible extension.

Works on all HDEncode pages including category pages, search results and tag pages. Supports all three official domains: hdencode.org, hdencode.com and hdencode.ro.

---

## Contributing

Bug reports and suggestions are welcome via [GitHub Issues](https://github.com/mikeymuis/hdencode-filter-suite/issues). I'm not a developer myself, this script was built with AI assistance, so I can't promise a quick turnaround but I read everything and will do my best.

---

## Support the project

This project takes time to maintain and keep up to date. If it saves you time and you'd like to say thanks, a small donation is always appreciated!

[![Donate via PayPal](https://img.shields.io/badge/Donate-PayPal-0070ba?logo=paypal&logoColor=white)](https://paypal.me/mikeymuis)

---

## Changelog

### v1.2
- Fixed release group dropdown showing incorrect values after the quick links button was added
- Added support for hdencode.com and hdencode.ro in addition to hdencode.org

### v1.1
- Quick links: click "🔗 Links" on any release to fetch and display download links directly on the page, no need to navigate to the detail page
- Copy any link to clipboard with a single click

### v1.0
- Initial release
- Filtering by Dolby Vision, HDR, resolution, content type, IMDb rating, file size and release group
- Free-text search
- Multi-page loading with live progress bar
- Persistent filters via local storage

---

## License

[MIT License](LICENSE) - free to use, modify and distribute.
