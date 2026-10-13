/* ============================================================
   Video Notes to Gemini — Gemini Page Injector
   Injected into gemini.google.com/app.
   - Listens for pending prompt in chrome.storage.local.
   - Also listens for live storage changes (if tab is already open).
   - Finds Gemini's prompt editor across all UI variants.
   - Types in the curated Notion prompt and focuses the editor.
   - EXPLICITLY DOES NOT SEND: leaves it for the user to review.
   - Adds a 1-Click "Copy Notion Notes" helper so no URLs are lost!
   ============================================================ */

(function () {
  "use strict";

  // Prevent multiple initializations in the same tab
  if (window.__vn2g_gemini_initialized) return;
  window.__vn2g_gemini_initialized = true;

  console.log("VN2G: Gemini script active and listening.");

  // ----------------------------------------------------------
  // Check Visibility Helper (works with display:contents & flex)
  // ----------------------------------------------------------
  function isVisible(el) {
    if (!el) return false;
    try {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 || rect.height > 0 || el.getClientRects().length > 0;
    } catch {
      return true;
    }
  }

  // ----------------------------------------------------------
  // Comprehensive Input Element Finder for Gemini
  // ----------------------------------------------------------
  function findEditorElement() {
    // 1. Check inside rich-textarea component (Gemini standard)
    const richTextarea = document.querySelector("rich-textarea");
    if (richTextarea) {
      const inner =
        richTextarea.querySelector(".ql-editor") ||
        richTextarea.querySelector("[contenteditable='true']") ||
        richTextarea.querySelector("p[data-placeholder]") ||
        richTextarea.querySelector("textarea");
      if (inner && isVisible(inner)) return inner;

      // Check shadowRoot if present
      if (richTextarea.shadowRoot) {
        const shadowInner =
          richTextarea.shadowRoot.querySelector(".ql-editor") ||
          richTextarea.shadowRoot.querySelector("[contenteditable='true']") ||
          richTextarea.shadowRoot.querySelector("textarea");
        if (shadowInner && isVisible(shadowInner)) return shadowInner;
      }
    }

    // 2. Search for any contenteditable element on the page
    const contentEditables = document.querySelectorAll('[contenteditable="true"]');
    for (const ce of contentEditables) {
      if (isVisible(ce)) return ce;
    }

    // 3. Search by common selectors
    const selectors = [
      ".ql-editor",
      "div[role='textbox']",
      "p[data-placeholder*='Ask Gemini' i]",
      "p[data-placeholder*='prompt' i]",
      "p[data-placeholder]",
      "div[aria-label*='Ask Gemini' i]",
      "div[aria-label*='prompt' i]",
      ".text-input-field_textarea-wrapper textarea",
      "textarea[aria-label*='Ask Gemini' i]",
      "textarea",
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && isVisible(el)) return el;
    }

    // 4. Recursive shadow DOM search (fallback for future UI updates)
    const allElements = document.querySelectorAll("*");
    for (const el of allElements) {
      if (el.shadowRoot) {
        const shadowTarget = el.shadowRoot.querySelector(
          "[contenteditable='true'], .ql-editor, textarea, div[role='textbox']"
        );
        if (shadowTarget && isVisible(shadowTarget)) return shadowTarget;
      }
    }

    return null;
  }

  // ----------------------------------------------------------
  // Write Text into Gemini's Editor
  // ----------------------------------------------------------
  async function writeTextIntoEditor(el, text) {
    if (!el) return false;
    el.focus();

    // Plain textarea
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
      el.value = text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    // Contenteditable (Quill / Lit / Angular)
    let populated = false;

    // Method 1: DataTransfer / Paste event simulation
    try {
      const dt = new DataTransfer();
      dt.setData("text/plain", text);
      const pasteEvt = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dt,
      });
      el.dispatchEvent(pasteEvt);
      if (el.textContent && el.textContent.length >= 20) {
        populated = true;
      }
    } catch (e) {
      console.log("VN2G: Paste dispatch error", e);
    }

    // Method 2: document.execCommand insertText
    if (!populated) {
      try {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(el);
        selection.removeAllRanges();
        selection.addRange(range);
        populated = document.execCommand("insertText", false, text);
      } catch (e) {
        console.log("VN2G: execCommand error", e);
      }
    }

    // Method 3: DOM Paragraph injection (Quill internal structure)
    if (!populated || !el.textContent || el.textContent.trim().length === 0) {
      el.innerHTML = "";
      const lines = text.split("\n");
      for (const line of lines) {
        const p = document.createElement("p");
        if (line.trim().length > 0) {
          p.textContent = line;
        } else {
          p.appendChild(document.createElement("br"));
        }
        el.appendChild(p);
      }
    }

    // Method 4: Dispatch full synthetic input events so framework detects changes
    el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    el.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        composed: true,
        inputType: "insertText",
        data: text,
      })
    );

    const richEl = el.closest("rich-textarea");
    if (richEl) {
      richEl.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      richEl.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    }

    // Move cursor to the end
    try {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch {}

    el.focus();
    return true;
  }

  // ----------------------------------------------------------
  // Floating Toast / Banner in Gemini
  // ----------------------------------------------------------
  function showStatusBanner(title, message) {
    const existing = document.getElementById("vn2g-status-banner");
    if (existing) existing.remove();

    const banner = document.createElement("div");
    banner.id = "vn2g-status-banner";
    banner.style.cssText = `
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.95);
      color: #f8fafc;
      border: 1px solid rgba(56, 189, 248, 0.5);
      border-radius: 16px;
      padding: 12px 22px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
      z-index: 99999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13.5px;
      line-height: 1.4;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      animation: vn2gSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    banner.innerHTML = `
      <style>
        @keyframes vn2gSlideIn {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      </style>
      <div style="font-size: 20px;">✨</div>
      <div>
        <div style="font-weight: 600; color: #ffffff;">${title}</div>
        <div style="color: #94a3b8; font-size: 12.5px;">${message}</div>
      </div>
      <button id="vn2g-close-banner" style="
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 18px;
        cursor: pointer;
        padding: 0 0 0 10px;
        line-height: 1;
      ">&times;</button>
    `;

    document.body.appendChild(banner);
    const closeBtn = banner.querySelector("#vn2g-close-banner");
    if (closeBtn) closeBtn.onclick = () => banner.remove();

    setTimeout(() => {
      if (banner.parentNode) {
        banner.style.transition = "opacity 0.4s ease, transform 0.4s ease";
        banner.style.opacity = "0";
        banner.style.transform = "translate(-50%, -10px)";
        setTimeout(() => banner.remove(), 400);
      }
    }, 8000);
  }

  // ----------------------------------------------------------
  // Extract Clean Markdown Preserving All URLs & Embeds
  // Serializes the entire response top-to-bottom into Notion-ready Markdown
  // ----------------------------------------------------------
  function extractCleanNotionMarkdown(container) {
    if (!container) return "";

    function serializeNode(el) {
      if (!el) return "";

      if (el.nodeType === Node.TEXT_NODE) {
        return el.textContent;
      }
      if (el.nodeType !== Node.ELEMENT_NODE) return "";

      const tag = el.tagName.toLowerCase();

      // Filter out Gemini interactive UI chrome
      if (
        tag === "button" ||
        tag === "svg" ||
        tag === "mat-icon" ||
        tag === "form" ||
        el.getAttribute("role") === "button" ||
        el.classList.contains("code-block-decoration") ||
        el.classList.contains("copy-button") ||
        el.classList.contains("response-actions") ||
        el.classList.contains("model-response-actions") ||
        el.classList.contains("actions-container") ||
        el.id === "vn2g-gemini-fab"
      ) {
        return "";
      }

      // 1. Code blocks (<pre>)
      if (tag === "pre") {
        const rawCode = el.textContent.replace(/\r\n/g, "\n").trim();
        if (!rawCode) return "";

        // If this pre block is actually an entire markdown document (e.g. from an older prompt),
        // unwrap it directly so Notion gets authentic headers & callouts instead of a giant code box!
        const isMarkdownDoc =
          (rawCode.startsWith("#") || rawCode.startsWith("> 📌") || rawCode.startsWith("> 💡")) &&
          (rawCode.includes("## ") || rawCode.includes("### "));

        if (isMarkdownDoc) {
          return `\n\n${rawCode}\n\n`;
        }

        // Genuine programming code or ASCII diagram
        let lang = "";
        const codeEl = el.querySelector("code") || el;
        const langMatch = (codeEl.className || el.className || "").match(/language-([a-zA-Z0-9_+-]+)/);
        if (langMatch) {
          lang = langMatch[1];
        } else {
          const parentBlock = el.closest(".code-block, code-block, .code-container");
          if (parentBlock) {
            const langLabel = parentBlock.querySelector(".code-block-language, .language-label, .header-formatted");
            if (langLabel) {
              const labelText = langLabel.textContent.trim().toLowerCase();
              if (!["copy", "code", "run"].includes(labelText)) {
                lang = labelText;
              }
            }
          }
        }
        return `\n\n\`\`\`${lang}\n${rawCode}\n\`\`\`\n\n`;
      }

      // Inline code (not inside a pre block)
      if (tag === "code") {
        if (el.closest("pre")) {
          return el.textContent;
        }
        return `\`${el.textContent.trim()}\``;
      }

      // 2. Links (Preserve all URLs verbatim)
      if (tag === "a") {
        const href = el.getAttribute("href") || "";
        const text = el.textContent.trim();
        if (!href) return text;
        // If anchor text matches href or bare domain, output clean bare URL for Notion mention/embed
        if (text === href || text === href.replace(/^https?:\/\//, "")) {
          return href;
        }
        return `[${text || href}](${href})`;
      }

      // 3. Headings
      if (tag === "h1") return `\n\n# ${serializeChildren(el).trim()}\n\n`;
      if (tag === "h2") return `\n\n## ${serializeChildren(el).trim()}\n\n`;
      if (tag === "h3") return `\n\n### ${serializeChildren(el).trim()}\n\n`;
      if (tag === "h4") return `\n\n#### ${serializeChildren(el).trim()}\n\n`;

      // 4. Paragraphs
      if (tag === "p") return `\n\n${serializeChildren(el).trim()}\n\n`;

      // 5. Blockquotes (Notion Callouts)
      if (tag === "blockquote") {
        const inner = serializeChildren(el).trim();
        if (!inner) return "";
        const lines = inner.split("\n");
        const quoted = lines.map((l) => (l.trim() ? `> ${l.trim()}` : ">")).join("\n");
        return `\n\n${quoted}\n\n`;
      }

      // 6. Lists
      if (tag === "ul" || tag === "ol") {
        return `\n\n${serializeChildren(el).trim()}\n\n`;
      }
      if (tag === "li") {
        const parent = el.parentElement;
        const isOrdered = parent && parent.tagName.toLowerCase() === "ol";
        const bullet = isOrdered ? "1. " : "- ";
        return `\n${bullet}${serializeChildren(el).trim()}`;
      }

      // 7. Markdown Tables
      if (tag === "table") {
        let tableMd = "\n\n";
        const rows = el.querySelectorAll("tr");
        if (rows.length === 0) return "";

        rows.forEach((row, rowIndex) => {
          const cells = row.querySelectorAll("th, td");
          if (cells.length === 0) return;

          const rowContent = Array.from(cells)
            .map((c) =>
              serializeChildren(c)
                .trim()
                .replace(/\|/g, "\\|")
                .replace(/\n+/g, " ")
            )
            .join(" | ");

          tableMd += `| ${rowContent} |\n`;

          if (rowIndex === 0) {
            const separator = Array.from(cells)
              .map(() => "---")
              .join(" | ");
            tableMd += `| ${separator} |\n`;
          }
        });

        return tableMd + "\n\n";
      }

      // 8. Text Formatting & Dividers
      if (tag === "strong" || tag === "b") return `**${serializeChildren(el).trim()}**`;
      if (tag === "em" || tag === "i") return `*${serializeChildren(el).trim()}*`;
      if (tag === "del" || tag === "s") return `~~${serializeChildren(el).trim()}~~`;
      if (tag === "hr") return "\n\n---\n\n";
      if (tag === "br") return "\n";

      return serializeChildren(el);
    }

    function serializeChildren(parent) {
      let out = "";
      for (const child of parent.childNodes) {
        out += serializeNode(child);
      }
      return out;
    }

    let result = serializeNode(container);
    // Normalize newlines (max 2 consecutive newlines)
    result = result.replace(/\r\n/g, "\n");
    result = result.replace(/\n{3,}/g, "\n\n").trim();
    return result;
  }

  // ----------------------------------------------------------
  // Helper: Reliable Clipboard Copy with Fallback
  // ----------------------------------------------------------
  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      console.warn("VN2G: navigator.clipboard failed, attempting execCommand fallback", err);
    }
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand("copy");
      textarea.remove();
      return success;
    } catch (err) {
      console.error("VN2G: Both clipboard methods failed", err);
      return false;
    }
  }

  // ----------------------------------------------------------
  // Helper: Find the Latest Gemini Response Container
  // ----------------------------------------------------------
  function getLatestGeminiResponse() {
    const modelResponses = document.querySelectorAll("model-response");
    if (modelResponses.length > 0) {
      const last = modelResponses[modelResponses.length - 1];
      const inner =
        last.querySelector("markdown-renderer, .response-container-content, .model-response-text, message-content") ||
        last;
      return inner;
    }
    const fallbacks = document.querySelectorAll(
      "markdown-renderer, .model-response-text, .response-container-content, [data-test-id='model-response-text'], message-content, .message-content"
    );
    return fallbacks[fallbacks.length - 1] || null;
  }

  // ----------------------------------------------------------
  // Inject Floating Translucent Expandable "Gemini Notes" Copy Button
  // - Moved UP (bottom: 90px, right: 28px).
  // - Translucent frosted glass.
  // - Shows ONLY the copy icon by default.
  // - Expands on hover to say "Gemini Notes".
  // ----------------------------------------------------------
  function injectGeminiCopyButton() {
    if (document.getElementById("vn2g-gemini-fab")) return;

    const fab = document.createElement("div");
    fab.id = "vn2g-gemini-fab";
    fab.style.cssText = `
      position: fixed;
      bottom: 90px;
      right: 28px;
      z-index: 9999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      pointer-events: none;
    `;

    fab.innerHTML = `
      <style>
        #vn2g-gemini-copy-btn {
          pointer-events: auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 42px;
          min-width: 42px;
          padding: 0 11px;
          border-radius: 21px;
          background: rgba(15, 23, 42, 0.62);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(56, 189, 248, 0.38);
          color: #f8fafc;
          cursor: pointer;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.38);
          transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          user-select: none;
          overflow: hidden;
          box-sizing: border-box;
          text-decoration: none;
          outline: none;
        }
        #vn2g-gemini-copy-btn:hover {
          background: rgba(15, 23, 42, 0.88);
          border-color: rgba(56, 189, 248, 0.75);
          box-shadow: 0 10px 32px rgba(56, 189, 248, 0.35);
          padding: 0 16px 0 12px;
          transform: translateY(-2px);
        }
        #vn2g-gemini-copy-btn:active {
          transform: translateY(0) scale(0.96);
        }
        #vn2g-copy-svg {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          fill: none;
          stroke: #38bdf8;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
          transition: transform 0.2s ease;
        }
        #vn2g-gemini-copy-btn:hover #vn2g-copy-svg {
          transform: scale(1.08);
        }
        .vn2g-copy-text {
          max-width: 0;
          opacity: 0;
          margin-left: 0;
          overflow: hidden;
          white-space: nowrap;
          font-size: 13.5px;
          font-weight: 600;
          letter-spacing: 0.2px;
          color: #f8fafc;
          display: inline-block;
          transition: max-width 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease, margin 0.2s ease;
        }
        #vn2g-gemini-copy-btn:hover .vn2g-copy-text {
          max-width: 130px;
          opacity: 1;
          margin-left: 8px;
        }
      </style>
      <button id="vn2g-gemini-copy-btn" title="Gemini Notes (Click to copy for Notion)">
        <svg id="vn2g-copy-svg" viewBox="0 0 24 24">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span class="vn2g-copy-text">Gemini Notes</span>
      </button>
    `;

    document.body.appendChild(fab);

    const copyBtn = fab.querySelector("#vn2g-gemini-copy-btn");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        const latestResponse = getLatestGeminiResponse();

        if (!latestResponse) {
          showStatusBanner("No notes found yet", "Wait for Gemini to finish generating your notes.");
          return;
        }

        let cleanMarkdown = extractCleanNotionMarkdown(latestResponse);
        if (!cleanMarkdown || cleanMarkdown.length < 50) {
          showStatusBanner("Notes not ready", "Wait for Gemini to complete writing the notes.");
          return;
        }

        // Clean any playlist parameters from all YouTube URLs in the markdown
        cleanMarkdown = cleanMarkdown.replace(
          /https:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)(?:&[^\s\)\`]+)?/g,
          "https://www.youtube.com/watch?v=$2"
        );

        const isGenerating = !!document.querySelector(
          "button[aria-label*='Stop'], button[aria-label*='stop'], .streaming-indicator"
        );

        const copied = await copyToClipboard(cleanMarkdown);
        if (copied) {
          // Visual feedback on button
          const textEl = copyBtn.querySelector(".vn2g-copy-text");
          const svgEl = copyBtn.querySelector("#vn2g-copy-svg");
          if (textEl) textEl.textContent = "Copied! ✓";
          if (svgEl) {
            svgEl.innerHTML = `<polyline points="20 6 9 17 4 12" stroke-width="2.5"></polyline>`;
          }

          setTimeout(() => {
            if (textEl) textEl.textContent = "Gemini Notes";
            if (svgEl) {
              svgEl.innerHTML = `
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              `;
            }
          }, 2400);

          if (isGenerating) {
            showStatusBanner(
              "Copied Current Progress! ⏳",
              "Gemini is still generating. Click again once finished for the full notes with video embeds."
            );
          } else {
            showStatusBanner(
              "All Gemini Notes Copied! ✨",
              "100% of notes copied! Paste (Ctrl+V) directly into Notion! Click video links to choose Mention (chip) or Embed (player)."
            );
          }
        } else {
          showStatusBanner("Copy failed", "Could not write to clipboard. Please check browser permissions.");
        }
      });
    }
  }

  // ----------------------------------------------------------
  // Process and Type Pending Prompt
  // ----------------------------------------------------------
  let isProcessing = false;

  async function processPendingPrompt() {
    if (isProcessing) return;
    isProcessing = true;

    try {
      const data = await chrome.storage.local.get("vn2g_prompt");
      const promptText = data.vn2g_prompt;

      if (!promptText) {
        isProcessing = false;
        return;
      }

      // Claim it immediately
      await chrome.storage.local.remove("vn2g_prompt");

      // Also copy to clipboard for convenience
      try {
        await navigator.clipboard.writeText(promptText);
      } catch {}

      console.log("VN2G: Found pending prompt, waiting for Gemini editor...");

      // Poll until editor is ready (up to 30 seconds)
      const startTime = Date.now();
      const interval = setInterval(async () => {
        const editor = findEditorElement();
        if (editor) {
          clearInterval(interval);
          console.log("VN2G: Found Gemini editor, inserting prompt...");
          await writeTextIntoEditor(editor, promptText);

          showStatusBanner(
            "Video Notes Prompt Ready!",
            "Review or customize your prompt below, then click Send whenever you're ready."
          );

          // Also inject the floating 1-click copy helper for when Gemini finishes!
          injectGeminiCopyButton();

          isProcessing = false;
        } else if (Date.now() - startTime > 30000) {
          clearInterval(interval);
          console.warn("VN2G: Gemini editor not found within 30s.");
          showStatusBanner(
            "Prompt Copied to Clipboard!",
            "Press Ctrl+V to paste your video notes prompt into Gemini."
          );
          injectGeminiCopyButton();
          isProcessing = false;
        }
      }, 400);
    } catch (err) {
      console.error("VN2G: Error processing prompt", err);
      isProcessing = false;
    }
  }

  // 1. Check storage on script load
  processPendingPrompt();

  // 2. Also inject copy button if page already has responses
  setTimeout(injectGeminiCopyButton, 2000);
  setInterval(injectGeminiCopyButton, 3000);

  // 3. Also listen for storage changes (handles when Gemini is already open)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.vn2g_prompt && changes.vn2g_prompt.newValue) {
      processPendingPrompt();
    }
  });
})();
