# 🗺️ Project Roadmap & Vision: Video Notes to Gemini ✧

This document outlines the architectural roadmap, design principles, and community boundaries for **Video Notes to Gemini**.

---

## 🎯 Core Philosophy & Scope Boundary

To keep this project sustainable, blazing fast, and free of maintenance burnout, we adhere to 3 strict design principles:

1. **Zero External Server Dependency:** The extension will **never** require a proprietary backend proxy or subscription server. Everything runs locally inside the user's Chromium browser.
2. **Zero NPM Dependencies:** Core code remains vanilla JavaScript (ES6+), standard Web APIs, and clean CSS. No dependency vulnerabilities to babysit.
3. **The Flagship Focus:** The primary maintainer focuses 100% on perfecting the **YouTube $\to$ Google Gemini $\to$ Notion** pipeline. Features outside this core flow are welcome as community-contributed modules (`help wanted`).

---

## 🚀 Milestones

### ✅ Phase 1: Foundations & Core Pipeline (Completed)
- [x] Manifest V3 architecture with background service worker tab lifecycle management.
- [x] Smart Domain Categorization Engine (DSA/Coding, Roadmaps, Book Summaries, Pro Tips, Theory).
- [x] Translucent anime Notion button with frosted-glass styling and dual toolbar injection.
- [x] Non-blocking rich-text prompt staging in Google Gemini editor.
- [x] Top-to-bottom recursive DOM-to-Notion Markdown serializer.
- [x] Canonical YouTube URL cleanup for native Notion mention chips and playable video embeds.
- [x] Community health kit (`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue templates, social preview).

---

### ⏳ Phase 2: User Experience Polish (Current Focus)
- [x] **Browser Action Popup:** Sleek, accessible popup showing status, quick start steps, and project links.
- [ ] **Keyboard Shortcut Support:** Trigger note generation directly with `Alt+Shift+N` or `Cmd+Shift+N` ([Issue #1](https://github.com/hari45wavin/video-notes-to-gemini/issues/1)).
- [ ] **YouTube Chapter Marker Detection:** Extract timestamps and inject structured chapter-by-chapter breakdowns ([Issue #2](https://github.com/hari45wavin/video-notes-to-gemini/issues/2)).
- [ ] **Chrome Web Store Submission:** Publish package for 1-click browser store installation.

---

### 🔮 Phase 3: Community Extensions (`help wanted`)
*These features are open to community contributors looking to expand the ecosystem:*

- [ ] **Additional Learning Platforms:** Extend content script listeners to Coursera, Udemy, and edX lecture players.
- [ ] **Alternative Export Destinations:** One-click clipboard formatting for Obsidian, Logseq, and Apple Notes.
- [ ] **Local LLM Support:** Optional toggle to route prompts to local models via Ollama (`localhost:11434`) or WebLLM for 100% offline note generation.

---

## 💖 Supporting the Project

If Video Notes to Gemini saves you hours of manual transcription and helps you build a second brain in Notion, consider starring the repository or supporting ongoing maintenance:

* ⭐ [Star the Repo on GitHub](https://github.com/hari45wavin/video-notes-to-gemini)
* 💖 [Sponsor on GitHub](https://github.com/sponsors/hari45wavin)
* 🐛 [Report Bugs & Suggest Features](https://github.com/hari45wavin/video-notes-to-gemini/issues)
