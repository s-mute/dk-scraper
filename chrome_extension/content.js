if (!window.__dkScraper) {

  const _cfg = {
    xhrIdleDelay: 2000,
    stabilityPollInterval: 600,
    stabilityRequiredMatches: 3,
  }

  const nextPageElSelector = ".app-view-controls > mat-icon:last-of-type"

  let _startPage = 1
  let _totalPages = null  // null = all
  let _currentPage = 1
  let _timeoutHandle = null
  let _running = false

  function _log(msg) {
    console.log(`[DK Scraper | page ${_currentPage}] ${msg}`)
  }

  function _zeroPad(n, width = 4) {
    return String(n).padStart(width, '0')
  }

  function _nextPage() {
    const btn = document.querySelector(nextPageElSelector)
    if (!btn) {
      _log("next page button not found — stopping.")
      _running = false
      return
    }
    btn.click()
  }

  function _getSharpCanvases() {
    const all = document.querySelectorAll("canvas")
    if (all.length < 2) return null
    const isDouble = all.length > 3
    const canvases = isDouble ? [all[1], all[3]] : [all[1]]
    return { canvases: canvases.filter(Boolean), isDouble, all }
  }

  function _waitForCanvasStable(onStable) {
    let matchCount = 0
    let lastSnapshot = null

    function poll() {
      if (!_running) return

      const result = _getSharpCanvases()
      if (!result) {
        _log("canvases not found yet, waiting")
        matchCount = 0
        lastSnapshot = null
        setTimeout(poll, _cfg.stabilityPollInterval)
        return
      }

      const snapshot = result.canvases.map(c => c.toDataURL("image/png")).join("|")

      if (snapshot === lastSnapshot) {
        matchCount++
        _log(`stable check ${matchCount}/${_cfg.stabilityRequiredMatches}`)
      } else {
        matchCount = 0
        _log("canvas still rendering")
      }

      lastSnapshot = snapshot

      if (matchCount >= _cfg.stabilityRequiredMatches) {
        onStable(result)
      } else {
        setTimeout(poll, _cfg.stabilityPollInterval)
      }
    }

    poll()
  }

  function _saveCanvasLocally() {
    if (!_running) return

    _log("waiting for canvas to stabilize...")

    _waitForCanvasStable(({ canvases, isDouble, all }) => {
      function downloadCanvas(canvas, suffix = '') {
        if (!canvas) return
        const image = canvas.toDataURL("image/png")
        const link = document.createElement('a')
        link.download = `page_${_zeroPad(_currentPage)}${suffix}.png`
        link.href = image
        link.click()
      }

      if (isDouble) {
        downloadCanvas(canvases[0], '_a')
        downloadCanvas(canvases[1], '_b')
      } else {
        downloadCanvas(canvases[0])
      }

      all.forEach(c => c.remove())
      _currentPage++

      const atLimit = _totalPages !== null && _currentPage > _startPage + _totalPages - 1
      if (atLimit) {
        _log("reached page limit — done!")
        _running = false
        return
      }

      _nextPage()
    })
  }

  function _scheduleCapture() {
    clearTimeout(_timeoutHandle)
    _timeoutHandle = setTimeout(_saveCanvasLocally, _cfg.xhrIdleDelay)
  }

  // Patch XHR to detect when a page has loaded
  XMLHttpRequest.prototype._realSend = XMLHttpRequest.prototype._realSend || XMLHttpRequest.prototype.send
  XMLHttpRequest.prototype.send = function (value) {
    this.addEventListener("progress", () => {
      if (_running) {
        _log("XHR loading...")
        _scheduleCapture()
      }
    }, false)
    this._realSend(value)
  }

  window.__dkScraper = {
    start(fromPage = 1, totalPages = null) {
      _startPage = fromPage
      _totalPages = totalPages
      _currentPage = fromPage
      _running = true
      _log(`▶️ Starting from page ${fromPage}${totalPages ? `, downloading ${totalPages} pages` : ''}`)
      _scheduleCapture()
    },
    stop() {
      _running = false
      clearTimeout(_timeoutHandle)
      _log("stopped.")
    },
    getStatus() {
      return { running: _running, currentPage: _currentPage }
    }
  }

  console.log("DK Scraper ready. Use the extension popup to start.")
}
