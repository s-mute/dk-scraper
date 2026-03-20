// Add to console, and start the script by calling funcs start() or start(pageNumber, totalPages) to begin, stop() to abort
// Config:
//   startPage   - starting page number for filenames (default: 1)
//   totalPages  - how many pages to download before stopping (default: Infinity)
//   waitBuffer  - ms to wait after last XHR activity before saving (default: 5000)

const config = {
  startPage: 1,
  totalPages: Infinity,
  // How long after last XHR activity to start checking canvas stability
  xhrIdleDelay: 2000,
  // How often to compare canvas snapshots when polling for stability
  stabilityPollInterval: 600,
  // How many consecutive identical snapshots = canvas is done rendering
  stabilityRequiredMatches: 3,
}

const nextPageElSelector = ".app-view-controls > mat-icon:last-of-type"

let currentPage = config.startPage
let timeoutHandle = null
let running = false

function log(msg) {
  console.log(`[DK Scraper | page ${currentPage}] ${msg}`)
}

function zeroPad(n, width = 4) {
  return String(n).padStart(width, '0')
}

function nextPage() {
  const btn = document.querySelector(nextPageElSelector)
  if (!btn) {
    log("next page button not found — stopping.")
    running = false
    return
  }
  btn.click()
}

function getSharpCanvases() {
  const all = document.querySelectorAll("canvas")
  if (all.length < 2) return null
  // DK uses 4 canvases in double-page mode (indices 1 and 3 are the sharp ones), rest are probably some previews
  const isDouble = all.length > 3
  const canvases = isDouble ? [all[1], all[3]] : [all[1]]
  return { canvases: canvases.filter(Boolean), isDouble, all }
}

function waitForCanvasStable(onStable) {
  let matchCount = 0
  let lastSnapshot = null

  function poll() {
    if (!running) return

    const result = getSharpCanvases()
    if (!result) {
      log("canvases not found yet, waiting...")
      matchCount = 0
      lastSnapshot = null
      setTimeout(poll, config.stabilityPollInterval)
      return
    }

    const snapshot = result.canvases.map(c => c.toDataURL("image/png")).join("|")

    if (snapshot === lastSnapshot) {
      matchCount++
      log(`⏳ Stable check ${matchCount}/${config.stabilityRequiredMatches}`)
    } else {
      matchCount = 0
      log("⏳ Canvas still rendering...")
    }

    lastSnapshot = snapshot

    if (matchCount >= config.stabilityRequiredMatches) {
      onStable(result)
    } else {
      setTimeout(poll, config.stabilityPollInterval)
    }
  }

  poll()
}

function saveCanvasLocally() {
  if (!running) return

  log("waiting for canvas to stabilize")

  waitForCanvasStable(({ canvases, isDouble, all }) => {
    function downloadCanvas(canvas, suffix = '') {
      if (!canvas) return
      const image = canvas.toDataURL("image/png")
      const link = document.createElement('a')
      link.download = `page_${zeroPad(currentPage)}${suffix}.png`
      link.href = image
      link.click()
    }

    if (isDouble) {
      downloadCanvas(canvases[0], '_a')
      downloadCanvas(canvases[1], '_b')
    } else {
      downloadCanvas(canvases[0])
    }


    // Remove canvases to prevent stale images on next page
    all.forEach(c => c.remove())

    currentPage++

    if (currentPage > config.startPage + config.totalPages - 1) {
      log("reached page limit")
      running = false
      return
    }

    nextPage()
  })
}

function scheduleCapture() {
  clearTimeout(timeoutHandle)
  timeoutHandle = setTimeout(saveCanvasLocally, config.xhrIdleDelay)
}

// Intercept XHR to detect when page has finished loading
XMLHttpRequest.prototype._realSend = XMLHttpRequest.prototype._realSend || XMLHttpRequest.prototype.send
XMLHttpRequest.prototype.send = function (value) {
  this.addEventListener("progress", () => {
    if (running) {
      log("loading")
      scheduleCapture()
    }
  }, false)
  this._realSend(value)
}

function start(fromPage = config.startPage, pages = config.totalPages) {
  config.startPage = fromPage
  config.totalPages = pages
  currentPage = fromPage
  running = true
  log(`starting from page ${fromPage}${pages !== Infinity ? `, downloading ${pages} pages` : ''}`)
  scheduleCapture()
}

function stop() {
  running = false
  clearTimeout(timeoutHandle)
  log("⏹️ Stopped.")
}

console.log("DK Scraper loaded. Call start() or start(pageNumber, totalPages) to begin, stop() to abort")
