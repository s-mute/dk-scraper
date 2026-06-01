# DK Scraper

Downloads pages from Digitální Knihovna as numbered PNG files. Available as a **Chrome extension** (recommended) or a **browser console script**.
> **Warning:** Only works on documents accessible with your current login — e.g. via university library access. DO NOT distribute downloaded pages. The scraper just automates what would otherwise take hours of manual screenshots. 
  
Note: Digitální Knihovna servers can be slow or unresponsive, and your login session may drop mid-run. If the scraper stalls or stops, just restart it from the last successfully downloaded page.                                                                                                        

Output: Individual PNG files (`page_0001.png`, ...). To combine them into a PDF, use `merge_pngs_to_pdf.py`.

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

## Merge PNGs into PDF

The helper script `merge_pngs_to_pdf.py` merges downloaded `page_*.png` files into one PDF.

Install the Python dependency once:

```bash
python3 -m pip install Pillow
```

From the folder containing the downloaded PNG files, run:

```bash
python3 /path/to/digitalni\ knihovna\ scraper/merge_pngs_to_pdf.py -o output.pdf
```

By default, the script removes empty scanner background around each page. This is useful for double-page spread files such as `page_0001_a.png` and `page_0001_b.png`, where one side can contain only empty black/white background.

Additional crop modes:

```bash
# exact 50% split: a keeps the left half, b keeps the right half
python3 /path/to/digitalni\ knihovna\ scraper/merge_pngs_to_pdf.py --crop-mode half -o output.pdf

# no cropping
python3 /path/to/digitalni\ knihovna\ scraper/merge_pngs_to_pdf.py --crop-mode none -o output.pdf

# keep more border around detected content
python3 /path/to/digitalni\ knihovna\ scraper/merge_pngs_to_pdf.py --margin 30 -o output.pdf
```

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
