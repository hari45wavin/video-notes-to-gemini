/* ============================================================
   Video Notes to Gemini — Service Worker (Background Script)
   Handles opening gemini.google.com/app in a new tab.
   ============================================================ */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openGeminiTab" || message.action === "openGeminiAndType") {
    (async () => {
      try {
        if (message.prompt) {
          await chrome.storage.local.set({ vn2g_prompt: message.prompt });
        }
        const tab = await chrome.tabs.create({
          url: "https://gemini.google.com/app",
        });
        sendResponse({ success: true, tabId: tab.id });
      } catch (err) {
        console.error("VN2G service worker error:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep message channel open for async response
  }
});
