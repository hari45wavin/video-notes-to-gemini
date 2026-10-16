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
     Black & White Notion Style Button Element Generator
     - Authentic monochrome Notion brand icon on crisp white tile.
     - Pure black & white high-contrast Notion styling (NO AI / colorful logos).
     - Expands smoothly on hover to reveal "Gemini Notes".
     -------------------------------------------------------- */
  function createNotionButton(btnId) {
    const btn = document.createElement("button");
    btn.id = btnId;
    btn.className = "vn2g-notion-btn";
    btn.title = "Gemini Notes (Create Notion Notes)";
    btn.setAttribute("aria-label", "Gemini Notes (Create Notion Notes)");

    btn.innerHTML = `
      <span class="vn2g-notion-tile">
        <svg class="vn2g-notion-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx="4.5" fill="#FFFFFF"/>
          <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" fill="#000000"/>
        </svg>
      </span>
      <span class="vn2g-btn-text">Gemini Notes</span>
    `;

    btn.addEventListener("click", handleButtonClick);
    return btn;
  }

  /* --------------------------------------------------------
     Helper: Find Enhancer for YouTube Toolbar
     -------------------------------------------------------- */
  function findEnhancerToolbar() {
    return (
      document.querySelector("#efyt-control-bar") ||
      document.querySelector(".efyt-control-bar") ||
      document.querySelector("[id*='efyt-control-bar']") ||
      document.querySelector("#ytp-efyt-controls") ||
      document.querySelector("#enhancer-for-youtube-toolbar") ||
      document.querySelector(".enhancer-for-youtube-toolbar")
    );
  }

  /* --------------------------------------------------------
     Inject Black & White Notion Button
     - Priority A: Inside Enhancer for YouTube control bar (#efyt-control-bar) on that exact line.
     - Priority B: Top row directly below video player and above video title (#vn2g-top-slot).
     -------------------------------------------------------- */
  function injectButton() {
    const host = window.location.hostname;

    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      // Clean up legacy sidebar button from bottom right if still present
      const oldSidebar = document.getElementById("vn2g-sidebar-slot");
      if (oldSidebar) oldSidebar.remove();

      // 1. Target A: Enhancer for YouTube Toolbar (#efyt-control-bar)
      const enhancerToolbar = findEnhancerToolbar();

      if (enhancerToolbar) {
        let enhBtn = document.getElementById("vn2g-enhancer-btn");
        if (!enhBtn || enhBtn.parentNode !== enhancerToolbar) {
          if (enhBtn) enhBtn.remove();
          enhBtn = createNotionButton("vn2g-enhancer-btn");
          enhancerToolbar.appendChild(enhBtn);
          console.log("VN2G: Inserted black & white Notion button inside Enhancer toolbar on the line.");
        }
        // Remove standalone top slot if enhancer bar is present
        const topSlot = document.getElementById("vn2g-top-slot");
        if (topSlot) topSlot.remove();
        return;
      }

      // 2. Target B: Line just below video player and directly above video title
      const below = document.querySelector("#below");
      const watchMetadata = document.querySelector("ytd-watch-metadata");
      const titleEl = document.querySelector("#title.ytd-watch-metadata, #above-the-fold #title, h1.ytd-watch-metadata");

      const topAnchor = watchMetadata || titleEl || below;

      if (topAnchor && topAnchor.parentNode) {
        let topSlot = document.getElementById("vn2g-top-slot");
        if (!topSlot || topSlot.nextSibling !== topAnchor) {
          if (topSlot) topSlot.remove();
          topSlot = document.createElement("div");
          topSlot.id = "vn2g-top-slot";
          topAnchor.parentNode.insertBefore(topSlot, topAnchor);
        }

        let topBtn = document.getElementById("vn2g-top-btn");
        if (!topBtn || topBtn.parentNode !== topSlot) {
          if (topBtn) topBtn.remove();
          topBtn = createNotionButton("vn2g-top-btn");
          topSlot.appendChild(topBtn);
          console.log("VN2G: Inserted black & white Notion button directly above title below video.");
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
      const enhancerToolbar = findEnhancerToolbar();
      const enhBtn = document.getElementById("vn2g-enhancer-btn");
      const topBtn = document.getElementById("vn2g-top-btn");

      // Ensure button is present on the Enhancer toolbar line or top slot
      if (enhancerToolbar) {
        if (!enhBtn || enhBtn.parentNode !== enhancerToolbar) {
          injectButton();
        }
      } else {
        if (!topBtn) {
          injectButton();
        }
      }
    }
  }, 800);

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
        const topBtn = document.getElementById("vn2g-top-btn");
        if (topBtn) topBtn.remove();
        const topSlot = document.getElementById("vn2g-top-slot");
        if (topSlot) topSlot.remove();
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
