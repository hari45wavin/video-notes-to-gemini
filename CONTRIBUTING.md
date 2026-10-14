# Contributing to Video Notes to Gemini ✧

Thank you for your interest in contributing to **Video Notes to Gemini**! Whether you are fixing a bug, adding support for a new video platform, improving prompt templates, or refining Notion export serialization, your help is warmly welcomed.

---

## 🌟 Ways to Contribute

1. **Bug Reports:** Found an issue where a button is misplaced or a prompt doesn't type into Gemini? [Open a Bug Report](https://github.com/hari45wavin/video-notes-to-gemini/issues/new?template=bug_report.md).
2. **Feature Requests:** Want support for Coursera timestamps, a dark/light theme toggle, or Obsidian export? [Propose a Feature](https://github.com/hari45wavin/video-notes-to-gemini/issues/new?template=feature_request.md).
3. **Good First Issues:** Check our [Good First Issues](https://github.com/hari45wavin/video-notes-to-gemini/labels/good%20first%20issue) for beginner-friendly tasks!
4. **Code Contributions:** Submit Pull Requests with enhancements and bug fixes.

---

## 💻 Local Development Setup

No complex build tools, Webpack, or Babel required! Video Notes to Gemini is built using vanilla modern JavaScript (ES6+), clean CSS, and standard Web APIs.

### 1. Clone the Repository
```bash
git clone https://github.com/hari45wavin/video-notes-to-gemini.git
cd video-notes-to-gemini
```

### 2. Load into Chromium Browser
1. Open Google Chrome, Brave, Microsoft Edge, or Arc.
2. Navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the `video-notes-to-gemini` directory.

### 3. Making and Testing Changes
* **Editing `content.js` or `styles.css`:** Make your edits, then reload the extension by clicking the refresh icon (🔄) on `chrome://extensions/`, and refresh the YouTube watch page.
* **Editing `gemini-inject.js`:** Reload the extension and refresh `https://gemini.google.com/app`.
* **Editing `service-worker.js`:** Reload the extension and inspect background logs via the "service worker" link on `chrome://extensions/`.

---

## 📐 Code Style & Conventions

* **Vanilla JS First:** Keep dependencies at zero (`0`). All DOM manipulation, clipboard access, and storage use standard browser APIs.
* **Non-Blocking & Resilient:** DOM queries should always fail gracefully without throwing uncaught exceptions.
* **Conventional Commits:** Please format commit messages using the [Conventional Commits](https://www.conventionalcommits.org/) specification:
  - `feat: add support for timestamped chapter prompts`
  - `fix: resolve button positioning overlap on mobile web`
  - `docs: update installation instructions for Brave browser`
  - `style: refine button frosted-glass backdrop blur`

---

## 🚀 Submitting a Pull Request (PR)

1. Fork the repository on GitHub.
2. Create your feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. Commit your changes with clear, descriptive commit messages:
   ```bash
   git commit -m "feat: add your feature description"
   ```
4. Push to your fork:
   ```bash
   git push origin feat/your-feature-name
   ```
5. Open a Pull Request against `hari45wavin/video-notes-to-gemini:main`.
6. Fill out the provided PR template describing your changes and testing steps.

---

## 💬 Community & Questions

Have questions or need help getting started?
* Open an [Issue on GitHub](https://github.com/hari45wavin/video-notes-to-gemini/issues).
* Reach out directly to [harijoshi215@gmail.com](mailto:harijoshi215@gmail.com).

Thank you for helping make open-source learning tools better for everyone! 🚀
