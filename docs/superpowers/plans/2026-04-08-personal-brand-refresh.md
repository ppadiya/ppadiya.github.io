# Personal Brand Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update `index.html` to reposition Pratik Padiya from "Product Manager & Solutions Architect" to "Solutions Engineer & AI Automation Builder", reflecting his current role and side projects.

**Architecture:** All 7 changes are in `index.html` only. No CSS changes are needed — content updates only. Each task targets a specific section of the file and can be verified by inspecting the resulting HTML in a browser.

**Tech Stack:** Static HTML, existing CSS classes/styles

---

## File Map

| File | Action | Sections Touched |
|------|--------|-----------------|
| `index.html` | Modify | `<title>`, `#hero`, `#about`, `#portfolio`, `#skills`, `<nav>`, `#contact` |

---

### Task 1: Update `<title>` tag (line 6)

**Files:**
- Modify: `index.html:6`

- [ ] **Step 1: Edit the title tag**

  Find:
  ```html
  <title>Pratik Padiya - Product Manager & Solutions Architect</title>
  ```
  Replace with:
  ```html
  <title>Pratik Padiya - Solutions Engineer & AI Automation Builder</title>
  ```

- [ ] **Step 2: Verify**

  Open `index.html` in browser. Check the browser tab reads "Pratik Padiya - Solutions Engineer & AI Automation Builder".

---

### Task 2: Update Hero section headline and subheadline (lines 68–69)

**Files:**
- Modify: `index.html:68-69`

- [ ] **Step 1: Edit the hero h2 and tagline**

  Find:
  ```html
                  <h2>Product Manager & Solutions Architect</h2>
                  <p class="tagline">Strategic Product Leader with 10+ years of experience scaling innovation in Fintech, Payments, and SaaS</p>
  ```
  Replace with:
  ```html
                  <h2>Solutions Engineer & AI Automation Builder</h2>
                  <p class="tagline">I work at the intersection of enterprise SaaS and LLM automation — selling loyalty platforms to enterprise retailers by day, building AI-powered workflows and agents by night.</p>
  ```

- [ ] **Step 2: Verify**

  Reload browser. Hero section should show new title and subtitle. CTAs ("View My Work" / "Get In Touch") unchanged.

---

### Task 3: Rewrite About Me body copy and highlight boxes (lines 94–116)

**Files:**
- Modify: `index.html:94-116`

- [ ] **Step 1: Replace About Me paragraphs**

  Find (the three `<p>` tags inside `.about-text`, before `.about-highlights`):
  ```html
                  <p>I'm a seasoned Product Manager and Solutions Architect with over 10 years of experience driving revenue growth, enhancing customer experiences, and developing innovative solutions across fintech, payments, and SaaS industries.</p>
                  
                  <p>At Mastercard, I led product management initiatives across APAC, spearheading the launch of global products and driving digital transformation for payment card benefits. My expertise includes managing cross-functional teams, aligning strategies with customer demands, and implementing strategic initiatives that deliver measurable business results.</p>
                  
                  <p>I specialize in bridging business objectives with cutting-edge technology to deliver scalable, secure, and user-centric products that drive revenue growth, operational efficiency, and market differentiation.</p>
  ```
  Replace with:
  ```html
                  <p>I'm a Solutions Engineer (pre-sales) with 10+ years of experience across Fintech, Payments, and SaaS — currently helping enterprise retail clients in APAC evaluate and adopt loyalty platforms.</p>
                  
                  <p>What makes my profile unusual: I also build AI automation systems as a practitioner. My personal projects include n8n-based LLM workflows, automated news aggregation tools for the retail and loyalty industry, and AI agents with Supabase backends. I build these because I find the gap between 'what AI can do' and 'what actually holds up in production' genuinely fascinating — and it makes me a better SE.</p>
                  
                  <p>Previously at Mastercard, I led product management across APAC, launching global payment card benefit products and driving digital transformation initiatives.</p>
  ```

- [ ] **Step 2: Replace highlight boxes**

  Find:
  ```html
                  <div class="about-highlights">
                      <div class="highlight">
                          <i class="fas fa-chart-line"></i>
                          <h3>Strategic Vision</h3>
                          <p>Aligning product roadmaps with business goals and market trends</p>
                      </div>
                      <div class="highlight">
                          <i class="fas fa-users"></i>
                          <h3>Team Leadership</h3>
                          <p>Managing cross-functional teams to deliver exceptional results</p>
                      </div>
                      <div class="highlight">
                          <i class="fas fa-globe-asia"></i>
                          <h3>Global Perspective</h3>
                          <p>Scaling products across diverse markets in APAC region</p>
                      </div>
                  </div>
  ```
  Replace with:
  ```html
                  <div class="about-highlights">
                      <div class="highlight">
                          <i class="fas fa-handshake"></i>
                          <h3>Pre-sales SE</h3>
                          <p>Translating technical complexity into business value for enterprise buyers</p>
                      </div>
                      <div class="highlight">
                          <i class="fas fa-robot"></i>
                          <h3>AI Automation Builder</h3>
                          <p>Shipping real LLM workflows: n8n, Supabase, Python, Telegram</p>
                      </div>
                      <div class="highlight">
                          <i class="fas fa-credit-card"></i>
                          <h3>Fintech & Payments</h3>
                          <p>10+ years across Mastercard APAC, loyalty platforms, and SaaS</p>
                      </div>
                  </div>
  ```

- [ ] **Step 3: Verify**

  Reload browser. About section should show new paragraphs and three new highlight boxes with correct icons, titles, and descriptions.

---

### Task 4: Add new APAC Retail Intelligence Feed project card (first in portfolio grid)

**Files:**
- Modify: `index.html:126-128` (insert before the Credit Card Rewards Program card)

- [ ] **Step 1: Insert new project card before the Credit Card Rewards card**

  Find (the comment + opening div for the first card):
  ```html
                  <!-- Credit Card Rewards Program UI -->
                  <div class="portfolio-item animate-on-scroll fade-in-up">
  ```
  Replace with:
  ```html
                  <!-- APAC Retail & Loyalty Intelligence Feed -->
                  <div class="portfolio-item animate-on-scroll fade-in-up">
                      <div class="portfolio-image-container">
                          <div class="portfolio-image portfolio-banner" style="background: linear-gradient(135deg, #1a3a5c 0%, #0d6efd 50%, #198754 100%); display:flex; align-items:center; justify-content:center; min-height:200px;">
                              <div style="text-align:center; color:#fff; padding:1.5rem;">
                                  <i class="fas fa-newspaper" style="font-size:3rem; margin-bottom:0.75rem; display:block;"></i>
                                  <span style="font-size:1.1rem; font-weight:600;">APAC Retail &amp; Loyalty Intelligence</span>
                              </div>
                          </div>
                          <div class="portfolio-overlay">
                              <div class="portfolio-overlay-content">
                                  <a href="news-events/index.html" class="portfolio-link" aria-label="View APAC Retail Intelligence Feed"><i class="fas fa-eye"></i></a>
                              </div>
                          </div>
                      </div>
                      <div class="portfolio-info">
                          <h3>APAC Retail &amp; Loyalty Intelligence Feed</h3>
                          <p>A live news and events aggregation tool I built for my own use as an SE. It pulls retail and loyalty industry news via an n8n workflow, filters and categorises it automatically, and surfaces APAC retail events in a separate tab. Built because manually tracking industry news across Asia was taking too much time.</p>
                          <p class="tech-stack"><strong>Tech:</strong> n8n, LLM filtering, REST APIs, JavaScript</p>
                          <div class="portfolio-links">
                              <a href="news-events/index.html" class="btn btn-small">View Live Tool</a>
                          </div>
                      </div>
                  </div>

                  <!-- Credit Card Rewards Program UI -->
                  <div class="portfolio-item animate-on-scroll fade-in-up">
  ```

- [ ] **Step 2: Verify**

  Reload browser. Projects section should show the new APAC Retail card first, followed by the existing Credit Card Rewards card.

---

### Task 5: Add "AI & Automation" skills group (first in skills grid)

**Files:**
- Modify: `index.html:199-200` (insert before the Product Management skill category)

- [ ] **Step 1: Insert new skill category before Product Management**

  Find:
  ```html
                  <div class="skill-category">
                      <h3>Product Management</h3>
  ```
  Replace with:
  ```html
                  <div class="skill-category">
                      <h3>AI &amp; Automation</h3>
                      <ul class="skill-list">
                          <li><span class="skill-tag">LLM Workflow Design</span></li>
                          <li><span class="skill-tag">n8n Orchestration</span></li>
                          <li><span class="skill-tag">Prompt Engineering</span></li>
                          <li><span class="skill-tag">API &amp; Webhook Integration</span></li>
                          <li><span class="skill-tag">Supabase (PostgreSQL)</span></li>
                          <li><span class="skill-tag">Telegram Bot Automation</span></li>
                      </ul>
                  </div>
                  <div class="skill-category">
                      <h3>Product Management</h3>
  ```

- [ ] **Step 2: Verify**

  Reload browser. Skills section should show "AI & Automation" as the first group, followed by the original groups.

---

### Task 6: Promote "News & Events" to main nav as "Retail Intel"

**Files:**
- Modify: `index.html:44-52`

- [ ] **Step 1: Update navigation**

  Find:
  ```html
                  <li class="nav-dropdown">
                      <a href="javascript:void(0)" class="nav-dropdown-toggle" aria-expanded="false">More tools <i class="fas fa-chevron-down" aria-hidden="true"></i></a>
                      <ul class="dropdown-menu">
                          <li><a href="games/index.html">Games</a></li>
                          <li><a href="ai-tools/index.html">AI Tools</a></li>
                          <li><a href="news-events/index.html">News &amp; Events</a></li>
                          <li><a href="https://omniboardinsightdeck.netlify.app/" target="_blank" rel="noopener">Stock Intel.</a></li>
                      </ul>
                  </li>
  ```
  Replace with:
  ```html
                  <li><a href="news-events/index.html">Retail Intel</a></li>
                  <li class="nav-dropdown">
                      <a href="javascript:void(0)" class="nav-dropdown-toggle" aria-expanded="false">More tools <i class="fas fa-chevron-down" aria-hidden="true"></i></a>
                      <ul class="dropdown-menu">
                          <li><a href="games/index.html">Games</a></li>
                          <li><a href="ai-tools/index.html">AI Tools</a></li>
                          <li><a href="https://omniboardinsightdeck.netlify.app/" target="_blank" rel="noopener">Stock Intel.</a></li>
                      </ul>
                  </li>
  ```

- [ ] **Step 2: Verify**

  Reload browser. "Retail Intel" should appear as a visible top-level nav link. "More tools" dropdown should still exist with Games, AI Tools, Stock Intel (not News & Events).

---

### Task 7: Update contact section tagline (line 304)

**Files:**
- Modify: `index.html:304`

- [ ] **Step 1: Edit contact intro paragraph**

  Find:
  ```html
              <p class="contact-intro">Let's connect to discuss how I can help your organization drive revenue, streamline operations, or outpace competitors in the evolving financial landscape.</p>
  ```
  Replace with:
  ```html
              <p class="contact-intro">Let's connect — whether you're curious about loyalty tech, AI automation in enterprise sales, or building LLM workflows as a non-developer practitioner.</p>
  ```

- [ ] **Step 2: Verify**

  Reload browser. Contact section tagline should show the new text.

---

## Judgment Calls

1. **New project card image**: No screenshot available, so a styled CSS banner with a gradient background and Font Awesome newspaper icon is used. This matches the visual language without requiring an external image file.
2. **HTML entities**: `&amp;` is used for `&` in attribute/text contexts per HTML spec (e.g., "n8n, LLM filtering, REST APIs" doesn't need encoding, but "AI &amp; Automation" in headings does for correctness).
3. **Icon choices** for About highlights: `fa-handshake` for Pre-sales SE, `fa-robot` for AI Automation Builder, `fa-credit-card` for Fintech & Payments — all from Font Awesome 6 Free Solid, already loaded on the page.

## Couldn't Change (Missing Info)

- Nothing blocked — all required content was provided by the user.
