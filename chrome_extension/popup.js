const btnStart   = document.getElementById("btnStart")
const btnStop    = document.getElementById("btnStop")
const statusEl   = document.getElementById("status")
const startInput = document.getElementById("startPage")
const pagesInput = document.getElementById("totalPages")

let pollInterval = null

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab.id
}

async function injectScraper(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    files: ["content.js"],
  })
}

async function execInPage(tabId, func, args = []) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func,
    args,
  })
  return results[0]?.result
}

function setRunning(val) {
  btnStart.disabled = val
  btnStop.disabled  = !val
}

function setStatus(text, cls = "") {
  statusEl.textContent = text
  statusEl.className = cls
}

function startPolling(tabId) {
  stopPolling()
  pollInterval = setInterval(async () => {
    try {
      const status = await execInPage(tabId, () => window.__dkScraper?.getStatus() ?? null)
      if (!status) return
      if (status.running) {
        setStatus(`Running — page ${status.currentPage}…`, "running")
      } else {
        setStatus("Done.", "stopped")
        setRunning(false)
        stopPolling()
      }
    } catch {
      stopPolling()
    }
  }, 800)
}

function stopPolling() {
  clearInterval(pollInterval)
  pollInterval = null
}

btnStart.addEventListener("click", async () => {
  const fromPage   = parseInt(startInput.value, 10) || 1
  const totalPages = pagesInput.value ? parseInt(pagesInput.value, 10) : null

  setStatus("Injecting…")
  try {
    const tabId = await getActiveTabId()
    await injectScraper(tabId)
    await execInPage(tabId, (fp, tp) => window.__dkScraper.start(fp, tp), [fromPage, totalPages])
    setRunning(true)
    setStatus(`Running — page ${fromPage}…`, "running")
    startPolling(tabId)
  } catch (e) {
    setStatus("Error: " + e.message, "stopped")
  }
})

btnStop.addEventListener("click", async () => {
  stopPolling()
  try {
    const tabId = await getActiveTabId()
    await execInPage(tabId, () => window.__dkScraper?.stop())
  } catch {}
  setRunning(false)
  setStatus("Stopped.", "stopped")
})

// On popup open, check if already running
;(async () => {
  try {
    const tabId = await getActiveTabId()
    const status = await execInPage(tabId, () => window.__dkScraper?.getStatus() ?? null)
    if (status?.running) {
      setRunning(true)
      setStatus(`Running — page ${status.currentPage}…`, "running")
      startPolling(tabId)
    }
  } catch {}
})()
