/* ============================================================
   Video Notes to Gemini — Content Script
   - Injects a native YouTube pill action button ("Share to Gemini")
     positioned UP in the action row right next to the "Download" button.
   - Matches YouTube's native action button styling (Screenshot 3).
   - Automatically analyzes video title & description.
   - Builds curated Notion prompt with Mention & Embed formats.
   - Encloses notes in a markdown code block for 1-click copying.
   - Opens Gemini and leaves editor focused without auto-sending.
   ============================================================ */

(() => {
  "use strict";

  // Prevent duplicate execution
  if (window.__vn2g_content_injected) return;
  window.__vn2g_content_injected = true;

  /* --------------------------------------------------------
     Categories & Automatic Detection
     -------------------------------------------------------- */
  const CATEGORIES = {
    dsa_tech: {
      name: "Technical & DSA Architecture",
      pattern:
        /algorithm|data structure|dsa|sorting|selection sort|bubble sort|insertion sort|merge sort|quick sort|hashing|hash map|hash table|hash set|array|linked list|binary tree|graph|bfs|dfs|dynamic programming|dp|leetcode|complexity|big o|time complexity|space complexity|collision|recursion|stack|queue|trie|heap|system design|backend|frontend|fullstack|python|javascript|typescript|c\+\+|java|golang|rust|react|node|docker|kubernetes|sql|nosql|database|api|graphql|git|clean code|architecture|debug|compiler|os|memory/i,
    },
    roadmap: {
      name: "Roadmap & Career Learning Path",
      pattern:
        /roadmap|how to learn|learning path|step by step guide|how to become|complete guide|zero to hero|beginner to advanced|start with|guide in 202|career path|developer in 202|study plan|syllabus/i,
    },
    book: {
      name: "Book Summary & Core Insights",
      pattern:
        /book summary|audiobook|book review|by [a-z]+|chapter|lessons from|author|atomic habits|deep work|psychology of|principles|rich dad|48 laws|clean code book|think and grow|the lean startup/i,
    },
    tips: {
      name: "Tips, Tricks & Best Practices",
      pattern:
        /tips|tricks|hacks|cheat sheet|shortcuts|mistakes to avoid|best practices|hidden features|pro tips|rules for|speed up|workflow/i,
    },
    theory: {
      name: "Theory & Conceptual Deep Dive",
      pattern:
        /explained|how it works|how does|why does|what is|theory of|deep dive|documentary|science behind|understanding|history of|evolution of|philosophy|math|physics/i,
    },
    general: {
      name: "Comprehensive Master Notes",
      pattern: /.*/,
    },
  };

  /* --------------------------------------------------------
     Platform Helper
     -------------------------------------------------------- */
  function getVideoMetadata() {
    const host = window.location.hostname;
    const url = window.location.href;

    let title = "";
    let channel = "";
    let description = "";

    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      title =
        document.querySelector("yt-formatted-string.style-scope.ytd-watch-metadata")?.textContent?.trim() ||
        document.querySelector("h1.ytd-watch-metadata")?.textContent?.trim() ||
        document.title.replace(" - YouTube", "").trim();

      channel =
        document.querySelector("#channel-name yt-formatted-string, ytd-channel-name a, #owner #text a")
          ?.textContent?.trim() || "";

      description =
        document.querySelector("#description-inline-expander, #description")
          ?.textContent?.trim()?.slice(0, 600) || "";
    } else {
      title = document.querySelector("h1")?.textContent?.trim() || document.title.trim();
      channel = document.querySelector('[rel="author"], .channel, .author')?.textContent?.trim() || "";
    }

    return { title, channel, description, url };
  }

  /* --------------------------------------------------------
     Automatic Category Selection
     -------------------------------------------------------- */
  function autoDetectCategory(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    for (const [key, cat] of Object.entries(CATEGORIES)) {
      if (key !== "general" && cat.pattern.test(text)) {
        return key;
      }
    }
    return "general";
  }

  /* --------------------------------------------------------
     Build Curated Notion-Style Prompt
     -------------------------------------------------------- */
  function buildCuratedPrompt() {
    const { title, channel, description, url } = getVideoMetadata();
    const categoryKey = autoDetectCategory(title, description);
    const cat = CATEGORIES[categoryKey];

    // Clean video URL (strip playlist parameters like &list= and &index=)
    let videoId = "";
    let cleanVideoUrl = url;

    if (url.includes("youtube.com/watch")) {
      const vMatch = url.match(/[?&]v=([^&]+)/);
      if (vMatch) {
        videoId = vMatch[1];
        cleanVideoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      }
    } else if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1]?.split(/[?&]/)[0];
      if (id) {
        videoId = id;
        cleanVideoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      }
    }

    const embedUrl = videoId
      ? `https://www.youtube.com/embed/${videoId}`
      : cleanVideoUrl;

    // Category specific modular instructions
    let domainSpecificInstructions = "";
    if (categoryKey === "dsa_tech") {
      domainSpecificInstructions = `
### ⚡ TECHNICAL & DSA ARCHITECTURE MODULES:
1. **Mental Model & Visual Architecture**:
   - Explain the core concept from first principles (why this exists, the bottleneck it solves).
   - Include an ASCII diagram, flowchart, or memory/bucket visualization illustrating how the data structure or algorithm behaves internally.
2. **Deep-Dive Mechanics (H2 & H3)**:
   - Break down every operation or sorting step (e.g. selection sort min element search, bubble sort adjacent swaps, insertion sort shifting, partitioning, recursion).
   - Explain edge cases, already-sorted arrays, reverse-sorted arrays, duplicates, and boundary conditions.
3. **Time & Space Complexity Analysis**:
   - Provide an exhaustive Markdown table:
     | Case / Operation | Time Complexity | Space Complexity | Why it occurs / Technical explanation |
     | Best Case | ... | ... | ... |
     | Average Case | ... | ... | ... |
     | Worst Case | ... | ... | ... |
4. **Clean Code Implementation**:
   - Provide clean, production-ready, well-commented code snippets showcasing optimal implementation and edge-case handling.
5. **Notion Callouts**:
   > 💡 **Core Invariant / Rule of Thumb:** [Fundamental rule]
   > ⚠️ **Common Pitfalls & Gotchas:** [Classic interview or runtime bugs to watch out for]
   > 📌 **Real-World System Design Context:** [Where this is applied in production systems]
6. **Practice Problems**:
   - List 3-5 standard LeetCode or practical interview problems related to this topic.`;
    } else if (categoryKey === "roadmap") {
      domainSpecificInstructions = `
### 🗺️ ROADMAP & LEARNING PATH MODULES:
1. **Target Competency & Time Horizon**:
   - Target developer roles, required prerequisites, and realistic learning timeline.
2. **Phase-by-Phase Milestones**:
   - **Phase 1: Foundations (Must-Know)** — Core languages, essential tooling, mental models.
   - **Phase 2: Core Engineering & Systems** — In-depth topics, architecture, industry standards.
   - **Phase 3: Production, Scale & Advanced** — DevOps, deployment, security, optimization.
3. **Must-Build Milestone Projects**:
   - Specific portfolio projects for each phase that prove competency (with recommended tech stacks).
4. **Notion Callouts**:
   > ⚠️ **Tutorial Hell Warning:** [Common traps that waste beginner time]
   > 💡 **High-Leverage Shortcut:** [Fastest way to get job-ready]
5. **Milestone Checklist**:
   - Actionable \`- [ ]\` checkboxes to track mastery.`;
    } else if (categoryKey === "book") {
      domainSpecificInstructions = `
### 📚 BOOK SUMMARY & CORE MENTAL MODELS MODULES:
1. **Core Thesis & Background**:
   - The author's core premise and the primary problem the book solves.
2. **The 3-5 Central Mental Models**:
   - Exhaustive breakdown of the fundamental principles introduced in the book.
3. **Core Chapters / Themes Deep Dive**:
   - Detailed analysis of each major argument with real-world examples and case studies.
4. **Memorable Quotes & Provocative Insights**:
   - Impactful quotes with practical analysis.
5. **Notion Callouts**:
   > 💡 **Core Mindset Shift:** [Key transformation]
   > ⚠️ **The Fatal Mistake Most People Make:** [Behavioral trap]
6. **Actionable Habit & Implementation Checklist**:
   - Concrete daily habits or action steps (\`- [ ]\`).`;
    } else if (categoryKey === "tips") {
      domainSpecificInstructions = `
### 💡 TIPS, TRICKS & BEST PRACTICES MODULES:
1. **Underlying Philosophy**:
   - Why these techniques provide 10x leverage or save engineering hours.
2. **Categorized Tip Cards**:
   - For each tip: **The Inefficiency / Problem** → **The Pro Technique / Hack** → **Concrete Code / Keyboard Shortcut / Example**.
3. **"Do This vs. Avoid That" Matrix**:
   - Side-by-side Markdown comparison table contrasting bad habits with optimal patterns.
4. **Notion Callouts**:
   > 💡 **80/20 Leverage Point:** [High-impact insight]
   > ⚠️ **Common Anti-Patterns:** [Mistakes to avoid]
5. **Quick Reference Cheat Sheet**:
   - Rapid copy-paste bullet list for daily reference.`;
    } else if (categoryKey === "theory") {
      domainSpecificInstructions = `
### 🧠 THEORETICAL & CONCEPTUAL DEEP-DIVE MODULES:
1. **First Principles & Foundations**:
   - Foundational definitions and the root axioms.
2. **Underlying Mechanics (How It Actually Works)**:
   - Progressive, step-by-step breakdown of the mechanics.
3. **Historical Evolution & Context**:
   - Why previous models failed and why this paradigm evolved.
4. **Trade-offs, Critiques & Modern Perspectives**:
   - Unresolved questions, boundary conditions, and modern consensus.
5. **Notion Callouts**:
   > 💡 **Mental Model to Remember:** [Core insight]
   > ⚠️ **Common Misconceptions Debunked:** [Counter-intuitive truth]`;
    } else {
      domainSpecificInstructions = `
### 📝 COMPREHENSIVE CURATED TOPIC BREAKDOWN:
1. **Structured Modular Breakdown (H2 & H3)**:
   - Break down every major idea, theme, and sub-topic discussed in the video into organized hierarchical sections.
2. **Detailed Explanations & Examples**:
   - In-depth coverage with real-world illustrations and context.
3. **Notion Callouts**:
   > 💡 **Core Insight:** [Key takeaways]
   > ⚠️ **Key Caveat:** [Important nuance to keep in mind]`;
    }

    const prompt = `Act as a world-class technical writer and Notion documentation expert. Create deeply detailed, publication-ready Notion-style notes for the following video:

📹 **Video Title:** ${title}
🔗 **Direct Video Link:** ${cleanVideoUrl}
👤 **Channel / Creator:** ${channel || "Author"}
🎯 **Automatically Detected Domain:** ${cat.name}

---

# 📋 NOTION FORMATTING REQUIREMENTS:
Format the entire response using authentic Notion markdown formatting (properties block, callouts, tables, code blocks, checklists, bold highlights, and dividers) so it can be pasted directly into a Notion workspace.

### 🏷️ 1. Page Header & Properties (Notion Style)
- Clean title with an appropriate icon/emoji
- A metadata callout block:
  > 📌 **Page Properties**
  > - **Topic:** ${title}
  > - **Domain:** ${cat.name}
  > - **Source:** [Watch Video](${cleanVideoUrl})
  > - **Creator:** ${channel || "Video Author"}
  > - **Level / Target:** Beginner to Advanced
  > - **Estimated Read Time:** 8-12 mins

### 💡 2. Executive Summary & The Big Picture (Notion Callout)
- A prominent callout box:
  > 💡 **Executive Summary / Core Thesis**
  > - What is the central problem or idea explored in this video?
  > - Why does this matter and what makes it essential?
  > - The overarching mental model in 2-3 clear sentences.

---

${domainSpecificInstructions}

---

### 📊 4. Comparison Table & Quick Reference Matrix
- Provide a clean Markdown table summarizing the key elements, options, time complexities, or trade-offs covered in the video.

### 🏁 5. Key Takeaways & Action Items
- 4 to 6 high-retention bullet points capturing the core essence of the video.
- An actionable checklist (\`- [ ] ...\`) of concrete steps or concepts to review.

### 🔗 6. Resources & References Mentioned (Clickable Hyperlinks)
- Extract and list EVERY single tool, website, documentation, library, GitHub repo, book, or paper mentioned in the video.
- Every resource MUST be a direct, clickable markdown link: \`[Resource Name](URL)\`. If a specific URL was not explicitly given, provide the official canonical URL.

### 🎬 7. Video Source (Notion Mention & Embed Formats):
At the very end of the notes, provide the video source in the two exact Notion formats:

#### 1️⃣ Notion Mention Format (YouTube Icon Chip):
${cleanVideoUrl}
*(In Notion: Paste this clean link on a blank line, or click the URL and select "Paste as mention" to render the native YouTube mention chip with the YouTube logo)*

#### 2️⃣ Notion Video Embed Format (Playable Video Player in Notion):
${cleanVideoUrl}
*(In Notion: Paste this clean link on a blank line and select "Create embed", or type /video and paste this link to render the interactive playable video player)*

---

### 📋 NOTION EXPORT GUIDELINES:
- Output the complete notes directly in pure, authentic Markdown from start to finish.
- Do NOT wrap the overall notes inside an outer code block.
- For code snippets, algorithms, or ASCII diagrams, wrap ONLY those specific items in their own code blocks (e.g. \`\`\`java, \`\`\`python, \`\`\`text).
- Ensure all hyperlinks are preserved in full \`[Anchor Text](Full_URL)\` format.
- Ensure the Section 7 video URLs are kept verbatim on their own lines.
- Make the notes deeply detailed, publication-ready, and formatted for effortless pasting into Notion!`;

    return { prompt, cleanVideoUrl, embedUrl, title, channel };
  }

  /* --------------------------------------------------------
     Handle Click: Store, Copy & Open Gemini
     -------------------------------------------------------- */
  async function handleButtonClick() {
    const data = buildCuratedPrompt();
    const prompt = data.prompt;

    // 1. Save directly to chrome.storage.local
    try {
      await chrome.storage.local.set({
        vn2g_prompt: prompt,
        vn2g_video_url: data.cleanVideoUrl,
        vn2g_embed_url: data.embedUrl,
        vn2g_video_title: data.title,
        vn2g_channel: data.channel,
      });
      console.log("VN2G: Prompt & video info saved to local storage.");
    } catch (err) {
      console.warn("VN2G: Storage write error", err);
    }

    // 2. Immediate clipboard copy inside user gesture
    try {
      await navigator.clipboard.writeText(prompt);
      console.log("VN2G: Prompt copied to clipboard.");
    } catch {}

    // 3. Open Gemini Tab
    let tabCreated = false;
    try {
      chrome.runtime.sendMessage({ action: "openGeminiTab", prompt: prompt }, (res) => {
        if (chrome.runtime.lastError || !res?.success) {
          console.log("VN2G: Service worker fallback to window.open");
          window.open("https://gemini.google.com/app", "_blank");
        }
      });
      tabCreated = true;
    } catch {
      window.open("https://gemini.google.com/app", "_blank");
    }

    showToast("✨ Opening Gemini with your Notion prompt...");
  }

  /* --------------------------------------------------------
     Toast Helper
     -------------------------------------------------------- */
  function showToast(message) {
    let toast = document.getElementById("vn2g-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "vn2g-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("vn2g-show");
    setTimeout(() => toast?.classList.remove("vn2g-show"), 2800);
  }

  /* --------------------------------------------------------
     Cute Anime Notion Button Element Generator
     - Notion logo cube with kawaii golden anime sparkle.
     - Translucent Notion dark-glass aesthetic.
     - Expands smoothly on hover to reveal "Gemini Notes".
     -------------------------------------------------------- */
  function createNotionButton(btnId) {
    const btn = document.createElement("button");
    btn.id = btnId;
    btn.className = "vn2g-notion-btn";
    btn.title = "Gemini Notes";
    btn.setAttribute("aria-label", "Gemini Notes (Create Notion Notes)");

    btn.innerHTML = `
      <svg class="vn2g-notion-anime-icon" viewBox="0 0 32 32" fill="none">
        <!-- Cute Notion 3D Block / Tile with soft rounded corners -->
        <rect x="3.5" y="3.5" width="25" height="25" rx="6" fill="#FFFFFF" stroke="#191919" stroke-width="2.2"/>
        <!-- Notion Block 3D Shadow Line -->
        <path d="M5.5 28.5h21a2 2 0 0 0 2-2v-21" stroke="#2F3437" stroke-width="2.2" stroke-linecap="round"/>
        <!-- Iconic Notion "N" with stylized serif -->
        <path d="M9.5 9h3.2v8.6l6-8.6h3.6v14h-3.2v-8.6l-6 8.6H9.5V9z" fill="#191919"/>
        <!-- Cute Golden Anime Sparkle at top right -->
        <path d="M26.5 2.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" fill="#F6C443"/>
        <!-- Tiny Kawaii Pink Sparkle Dot -->
        <circle cx="29.2" cy="9.2" r="1.1" fill="#FF8FA3"/>
      </svg>
      <span class="vn2g-btn-text">Gemini Notes</span>
    `;

    btn.addEventListener("click", handleButtonClick);
    return btn;
  }

  /* --------------------------------------------------------
     Inject Cute Anime Notion Button
     - Priority A: Right side of settings button in Enhancer toolbar (#enhancer-for-youtube-toolbar).
     - Priority B: Right above video playlist / recommendations (#secondary).
     -------------------------------------------------------- */
  function injectButton() {
    const host = window.location.hostname;

    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      // 1. Target A: Enhancer for YouTube Toolbar (right side of settings button)
      const enhancerToolbar =
        document.querySelector("#enhancer-for-youtube-toolbar") ||
        document.querySelector("#enhancer-for-youtube-toolbar-wrapper");

      if (enhancerToolbar) {
        let enhBtn = document.getElementById("vn2g-enhancer-btn");
        if (!enhBtn || enhBtn.parentNode !== enhancerToolbar) {
          if (enhBtn) enhBtn.remove();
          enhBtn = createNotionButton("vn2g-enhancer-btn");
          enhancerToolbar.appendChild(enhBtn);
          console.log("VN2G: Inserted cute anime Notion button inside Enhancer toolbar beside settings.");
        }
      }

      // 2. Target B: Above Video Playlist or Recommendations (Right column)
      const playlistPanel =
        document.querySelector("ytd-playlist-panel-renderer#playlist") ||
        document.querySelector("#secondary #playlist") ||
        document.querySelector("ytd-watch-flexy #playlist");

      const relatedPanel =
        document.querySelector("#secondary #related") ||
        document.querySelector("#secondary-inner") ||
        document.querySelector("#secondary");

      const sidebarTarget = playlistPanel || relatedPanel;

      if (sidebarTarget && sidebarTarget.parentNode) {
        let slot = document.getElementById("vn2g-sidebar-slot");
        if (!slot || slot.nextSibling !== sidebarTarget) {
          if (slot) slot.remove();
          slot = document.createElement("div");
          slot.id = "vn2g-sidebar-slot";
          sidebarTarget.parentNode.insertBefore(slot, sidebarTarget);
        }
        let sidebarBtn = document.getElementById("vn2g-sidebar-btn");
        if (!sidebarBtn || sidebarBtn.parentNode !== slot) {
          if (sidebarBtn) sidebarBtn.remove();
          sidebarBtn = createNotionButton("vn2g-sidebar-btn");
          slot.appendChild(sidebarBtn);
          console.log("VN2G: Inserted cute anime Notion button above playlist/recommendations.");
        }
      }

      // 3. Fallback Target C: Top action row if neither is ready
      if (!enhancerToolbar && !sidebarTarget) {
        const topLevelButtons =
          document.querySelector("#top-level-buttons-computed") ||
          document.querySelector("ytd-menu-renderer.ytd-watch-metadata #top-level-buttons-computed");

        if (topLevelButtons && !document.getElementById("vn2g-action-btn")) {
          const fallbackBtn = createNotionButton("vn2g-action-btn");
          topLevelButtons.appendChild(fallbackBtn);
        }
      }
    } else {
      // Non-YouTube platforms (Vimeo, Coursera, etc.)
      if (document.getElementById("vn2g-action-btn")) return;

      const anchor =
        document.querySelector(".clip_info-wrapper, .Player, [data-player]") ||
        document.querySelector("video");

      if (!anchor) {
        setTimeout(injectButton, 800);
        return;
      }

      const btn = createNotionButton("vn2g-action-btn");
      anchor.insertAdjacentElement("afterend", btn);
    }
  }

  /* --------------------------------------------------------
     Keep Buttons in Place (Relocation Watcher)
     -------------------------------------------------------- */
  setInterval(() => {
    const host = window.location.hostname;
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      const enhancerToolbar = document.querySelector("#enhancer-for-youtube-toolbar");
      const enhBtn = document.getElementById("vn2g-enhancer-btn");
      const sidebarBtn = document.getElementById("vn2g-sidebar-btn");

      // If enhancer toolbar is on page and button is missing, or sidebar button is missing, re-inject
      if ((enhancerToolbar && !enhBtn) || !sidebarBtn) {
        injectButton();
      }
    }
  }, 1000);

  /* --------------------------------------------------------
     Watch for SPA Navigation (YouTube video switches)
     -------------------------------------------------------- */
  function watchNavigation() {
    let lastUrl = window.location.href;

    // Listen to native YouTube navigation finish event
    document.addEventListener("yt-navigate-finish", () => {
      setTimeout(injectButton, 500);
    });

    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        const existing = document.getElementById("vn2g-action-btn");
        if (existing) existing.remove();
        const enh = document.getElementById("vn2g-enhancer-btn");
        if (enh) enh.remove();
        const side = document.getElementById("vn2g-sidebar-btn");
        if (side) side.remove();
        setTimeout(injectButton, 800);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  /* --------------------------------------------------------
     Initialize
     -------------------------------------------------------- */
  function init() {
    injectButton();
    watchNavigation();
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message && message.action === "triggerNotes") {
        handleButtonClick();
        sendResponse({ success: true });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
