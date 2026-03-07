# HD-Encode Search+

[![HDEncode-Search-Plus.png](https://i.postimg.cc/LhFKRbfz/HDEncode-Search-Plus.png)](https://postimg.cc/p5C1JksT)

A heavily expanded and reworked HDEncode userscript focused on faster browsing, smarter search, safer controls, cleaner UI, and direct page-navigation shortcuts.

---

# Features

- **Dedicated category page navigation**
  - Movies
  - TV Shows
  - TV Packs
  - Top Downloads
  - 4K UHD

- **Improved multi-page search flow**
  - Resets searches back to page 1 first
  - Loads results progressively while scanning more pages
  - Better duplicate prevention
  - Better status text during scanning

- **Safer Stop and Clear behavior**
  - Stop safely aborts active searches
  - Clear detects when a search is still running
  - Clear waits for Stop to finish before resetting filters
  - Helps prevent freezing, slowdown, and tab crashes during active page loading

- **Smarter text matching**
  - Case-insensitive matching
  - Accent normalization
  - Better handling for dots, dashes, spaces, and other separators
  - More forgiving matching for inconsistent release naming

- **Custom pagination under the toolbar**
  - Native pagination is hidden
  - A cleaner custom pager is shown beneath the script controls

- **Improved toolbar layout**
  - Better wrapping
  - Better visibility on sidebar-heavy layouts
  - Search box stays visible more reliably

- **Rounded result cards with green glow**
  - Rounded corners
  - Green outer glow
  - Improved matched-result highlighting
  - Cleaner hover feel

- **Better empty-state messaging**
  - Shows a visible no-results message in the results area

- **Dynamic release-group handling**
  - Group list updates from visible results
  - Works better as filters change

- **Updated labels**
  - `All groups` → `All Release Groups`
  - `All resolutions` → `All Resolutions`
  - `All pages` → `All Pages`

- **Quick links improvements**
  - Host labels cleaned up
  - Copy individual links
  - Copy all links per host
  - Inline access without opening each detail page

---
### 🗃️ Advanced Filtering and Sorting

#### Row 1: Main filters and section navigation

| Control | Description |
|---|---|
| Dolby Vision | Show only Dolby Vision releases |
| HDR | Show only HDR releases |
| All Resolutions | Filter by 2160p, 1080p or 720p |
| Minimum Rating | Hide releases below this IMDb rating |
| Min GB / Max GB | Filter by file size |
| Movies | Reload to the Movies page |
| TV Shows | Reload to the TV Shows page |
| TV Packs | Reload to the TV Packs page |
| Top Downloads | Reload to the Top Downloads page |
| 4K UHD | Reload to the 2160p quality page |

#### Row 2: Search, groups, loading and reset

| Control | Description |
|---|---|
| All Release Groups | Filter by release group, populated dynamically from current visible results |
| Search anything... | Free-text search across release info |
| Search | Start multi-page search/loading |
| Stop Page Loading | Safely abort an active search |
| Clear | Safely reset filters, stopping active searches first when needed |

---

### 🏋️‍♂️ Advanced Search Redundancy

The search system is designed to be more forgiving than plain text matching.

### It Can Handle:

- Dots instead of spaces
- Dashes instead of spaces
- Mixed separators
- Compacted words
- Accent differences
- Case differences
- Inconsistent release formatting across pages

That means searches often still match even when a release title is formatted differently than what you typed.

Examples it is better at handling:

- `Movie.Name.2025`
- `Movie-Name-2025`
- `Movie Name 2025`

---

### ⚡ Result Filters

| Control | Description |
|---|---|
| Dolby Vision | Show only Dolby Vision releases |
| HDR | Show only HDR releases |
| All Resolutions | Filter by 2160p, 1080p or 720p |
| Minimum Rating | Hide releases below this IMDb rating |
| Min GB / Max GB | Filter by file size |
| Release Group | Filter by release group |

### 🔎 Search Control

| Control | Description |
|---|---|
| Search All Pages Automatically | Pages are scanned in the background and results are displayed dynamically |
| Stop Page Scanning | Stop background page scanning when you're happy with the results |
| Clear | Clear filters and reset to default, including default results

### 🔗 Quick Link Access

- Inline `🔗 Links` button on each release
- View host links without opening the release page
- Copy links to clipboard directly

---

### 💪 Stability

Improvements include:
- Abort protection for active loading
- Delayed clear-after-stop handling
- Safer observer timing
- Fewer UI collisions during large result updates

These changes are aimed at reducing freezes and slowdown during aggressive multi-page searching.

---

## ✅ Easy Installation

### One-click install

If you already have a userscript manager installed, click below:

**[Install HD-Encode Search+](https://github.com/xXSalamanderXx/HDEncode-Search-Plus/raw/refs/heads/main/HDEncode-Search-Plus.user.js)**

Most userscript managers will detect the raw `.user.js` file automatically and open an install prompt.

---

### Supported Userscript Managers

This script should work with most userscript extensions, including:

- **Tampermonkey**
- **Violentmonkey**
- **Greasemonkey**
- **FireMonkey**
- Other Greasemonkey-compatible managers

### Tampermonkey Install
1. Install the Tampermonkey extension.
2. Open the install link above.
3. Tampermonkey should detect the script automatically.
4. Click **Install**.
5. Open HDEncode and refresh the page if needed.

### Violentmonkey Install
1. Install the Violentmonkey extension.
2. Open the install link above.
3. Violentmonkey should detect the script automatically.
4. Confirm installation.
5. Refresh HDEncode if needed.

### Greasemonkey / Other Managers
1. Install your preferred userscript manager.
2. Open the raw install link above.
3. If the manager detects `.user.js` automatically, approve the install.
4. If it does not, create a new script manually and paste in the script contents.
5. Save and refresh HDEncode.

---

## Supported Sites

Works on:

- `hdencode.org`
- `www.hdencode.org`
- `hdencode.com`
- `www.hdencode.com`
- `hdencode.ro`
- `www.hdencode.ro`

Supports homepage listings, tag pages, quality pages, search pages, and similar listing views.

---

## Direct Page Targets

The category selector loads these site pages directly:

- **Movies** → `https://hdencode.org/tag/movies/`
- **TV Shows** → `https://hdencode.org/tag/tv-shows/`
- **TV Packs** → `https://hdencode.org/tag/tv-packs/`
- **Top Downloads** → `https://hdencode.org/top-downloads/`
- **4K UHD** → `https://hdencode.org/quality/2160p/`

---

## Persistence

Most filters are saved locally in your browser and restored automatically later.

Saved locally:
- Dolby Vision
- HDR
- Resolution
- Rating
- Size limits
- Release group
- Search text

Not treated as a saved local filter:
- Category page selector, because it works as page navigation

Nothing is uploaded or shared.

---

## Credit

This project was originally based on the idea and codebase from:

[mikeymuis/hdencode-filter-suite](https://github.com/mikeymuis/hdencode-filter-suite)

This fork has since been heavily reworked and expanded with substantial UI, search, navigation, and stability changes.

---

## Contributing

Bug reports and suggestions are welcome through GitHub Issues.

Helpful info to include:
- browser
- userscript manager
- page URL
- what you clicked
- whether Search, Stop, or Clear was active
- whether the issue happened on homepage, tag page, or quality page

---

## Disclaimer

This repository is provided for general educational and informational use only.

By accessing, using, modifying, or distributing this repository, you agree that:

- **Use at Your Own Risk:** You are solely responsible for how you use anything provided in this repository.
- **No Guarantees:** The software, documentation, and related materials are provided **"as is"**, without warranty of any kind, express or implied.
- **No Liability:** The authors, maintainers, and contributors are not liable for any claims, damages, losses, or other liabilities arising from the use of this project.
- **Legal Compliance:** You are responsible for making sure your use of this project complies with any laws, rules, or policies that apply to you.
- **Not Legal Advice:** Nothing in this repository or its documentation should be considered legal advice.

---

## License 📄

Licensed under the [MIT License](LICENSE)

---

Special Thanks To The Original Project For Inspiring This Fork:
https://github.com/mikeymuis/hdencode-filter-suite
