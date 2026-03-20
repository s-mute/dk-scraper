# DK Scraper

Downloads pages from Digitální Knihovna as numbered PNG files. Available as a **Chrome extension** (recommended) or a **browser console script**.
> **Warning:** Only works on documents accessible with your current login — e.g. via university library access. DO NOT distribute downloaded pages. The scraper just automates what would otherwise take hours of manual screenshots. 
  
Note: Digitální Knihovna servers can be slow or unresponsive, and your login session may drop mid-run. If the scraper stalls or stops, just restart it from the last successfully downloaded page.                                                                                                        

Output: Individual PNG files (page_0001.png, …). To combine them into a PDF, use an online tool or — TODO: Create a merge script.                                                                                                                                                                            

---

## Chrome Extension (recommended)

### Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked** and select the `chrome_extension/` folder

### Usage

1. Open a book in Digitální Knihovna
2. Click the **DK Scraper** extension icon
3. Set **Start page** (default: 1) and optionally **Total pages** (leave blank to download all)
4. Click **Start** — pages will be saved to your Downloads folder as `page_0001.png`, `page_0002.png`, etc.
5. Click **Stop** at any time to abort

The popup shows live status (`Running — page N…`) and updates automatically when the run finishes.

**Double-page spreads** are saved as two files per spread: `page_0001_a.png` and `page_0001_b.png`. Therefore page number you choose should represent numbered page of the last file you downloaded.

---

## Console Script (legacy version)

For one-off use without installing the extension.

### Usage

1. Open a book in Digitální Knihovna
2. Open DevTools (`F12` or `Cmd+Option+I`) → **Console** tab
3. Paste the contents of `console_script.js` and press Enter
4. Start the scraper:

```js
start()                  // download all pages starting from page 1
start(5)                 // start from page 5, download all remaining
start(1, 20)             // download 20 pages starting from page 1
```

5. To stop early:

```js
stop()
```

### Config

Edit the `config` object at the top of the script before pasting:

| Option | Default | Description |
|---|---|---|
| `startPage` | `1` | Starting page number (also sets filename numbering) |
| `totalPages` | `Infinity` | How many pages to download before stopping |
| `xhrIdleDelay` | `2000` | ms to wait after last XHR activity before capturing |
| `stabilityPollInterval` | `600` | ms between canvas stability checks |
| `stabilityRequiredMatches` | `3` | Consecutive identical snapshots required before saving |

---
