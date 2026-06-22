# Pratik Padiya — Portfolio

Personal portfolio and tooling site for **Pratik Padiya**, Solutions Engineer (Loyalty, Fintech & Retail, APAC).

Live site: https://pratikpadiyaportfolio.netlify.app

---

## What's here

| Path | Description |
|---|---|
| `index.html` | Main portfolio — about, projects, skills, contact |
| `news-events/` | Live loyalty & retail news feed (n8n → Supabase) |
| `loyalty-ui/` | Interactive loyalty program UI demo |
| `ai-tools/` | AI tools showcase |
| `games/` | Mini browser games |
| `PM+Framework/` | PM framework reference |
| `netlify/functions/` | Serverless functions: chatbot, news fetch, embeddings |

## Stack

- Static HTML / CSS / JS — no framework, no build step
- **Theming** — follows the OS light/dark preference (`prefers-color-scheme`) with a manual sun/moon toggle (localStorage override). Dark palette lives at `:root` in `css/base.css`; light mode is `[data-theme="light"]` overrides applied by an inline head script before first paint. All sub-pages (news-events, ai-tools, games, loyalty-ui, PM+framework) support both themes; loyalty-ui keeps its own PremiumRewards brand palette via `loyalty-ui/css/tokens.css`.
- **CSS architecture** — homepage loads CSS as individual parallel `<link>` tags (`css/base.css`, `css/layout.css`, `css/header.css`, `css/hero.css`, `css/components.css`, `css/sections.css`, `css/chatbot.css`). Sub-pages use the same token system via `css/base.css` + `css/subpage.css` + a per-page stylesheet. Sub-page chrome (fixed theme toggle, scroll-reveal, sticky footer) lives in `css/subpage.css` + `js/subpage-ui.js`.
- Hosted on **Netlify** with serverless functions
- **Supabase** — stores news and events data
- **n8n** — scheduled workflow that fetches and filters industry news daily
- **Vectorize + Xenova Transformers** — embeddings for the chatbot RAG pipeline

## Local development

Requires [Netlify CLI](https://docs.netlify.com/cli/get-started/).

```bash
npm install
netlify dev        # runs at http://localhost:8888
```

Environment variables (set in Netlify dashboard or a local `.env` file — not committed):

- `SUPABASE_URL` / `SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`
- `VECTORIZE_*` keys

## SEO

- `robots.txt` — crawl directives; AI search bots explicitly allowed; `/games/` and `/loyalty-ui/` excluded from indexation
- `games/index.html` — `noindex, nofollow` meta tag (games page excluded from search results)
- `sitemap.xml` — homepage, `/news-events/`, `/ai-tools/`
- `llms.txt` — authoritative identity file for LLM/AI search engines
- JSON-LD schema on all pages (Person + WebSite + ProfilePage on homepage; BreadcrumbList + WebPage on sub-pages)
- Google Search Console property: `pratikpadiyaportfolio.netlify.app`

## Deployment

Push to `main` — Netlify auto-deploys.

Scheduled functions run via `netlify.toml`:
- `fetch-news` — daily at 23:00 UTC
- `cleanup-archive` — monthly (28th–31st) at 23:00 UTC
