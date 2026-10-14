/* ============================================================
   Video Notes to Gemini — Popup Script
   Handles safe opening of links in new tabs.
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll("a[target='_blank']");
  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const href = link.getAttribute("href");
      if (href) {
        chrome.tabs.create({ url: href });
      }
    });
  });
});
