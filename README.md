# Pratik Padiya — Portfolio

Personal portfolio and tooling site for **Pratik Padiya**, Sales Engineer (Loyalty, Fintech & Retail, APAC) at Eagle Eye.

Live site: https://pratikpadiyaportfolio.netlify.app

---

## What's here

| Path | Description |
|---|---|
| `index.html` | Main portfolio — hero, experience, about, projects, skills, achievements, contact |
| `news-events/` | Live loyalty & retail news feed (n8n → Supabase → JS frontend) |
| `loyalty-ui/` | Interactive credit card loyalty program UI demo |
| `ai-tools/` | Prompt optimizer — paste a rough prompt, get an improved version via OpenRouter |
| `games/` | Mini browser games (noindex; excluded from search) |
| `PM+Framework/` | Product launch framework and case studies (Mastercard APAC) |
| `netlify/functions/` | Serverless functions: `chatbot`, `enhance-prompt`, `fetch-news`, `cleanup-archive` |

## Stack

- Static HTML / CSS / JS — no framework, no build step
- **Theming** — follows OS light/dark preference (`prefers-color-scheme`) with a manual sun/moon toggle (localStorage override). Dark palette lives at `:root` in `css/base.css`; light mode is `[data-theme="light"]` overrides applied by an inline head script before first paint. All sub-pages support both themes; loyalty-ui keeps its own PremiumRewards brand palette via `loyalty-ui/css/tokens.css`.
- **CSS architecture** — homepage loads CSS as individual parallel `<link>` tags (`css/base.css`, `css/layout.css`, `css/header.css`, `css/hero.css`, `css/components.css`, `css/sections.css`, `css/chatbot.css`). Sub-pages use the same token system via `css/base.css` + `css/subpage.css` + a per-page stylesheet. Sub-page chrome (fixed theme toggle, scroll-reveal, sticky footer) lives in `css/subpage.css` + `js/subpage-ui.js`.
- Hosted on **Netlify** with serverless functions
- **Supabase** — stores news and events data; RLS enforced (service role key server-side only)
- **n8n** — scheduled workflow fetches and filters industry news daily (Oracle VM 2)
- **OpenRouter** — free-tier model routing for chatbot and prompt optimizer

## Local development

Requires [Netlify CLI](https://docs.netlify.com/cli/get-started/).

```bash
npm install
netlify dev        # runs at http://localhost:8888
```

Environment variables (set in Netlify dashboard or a local `.env` file — never committed):

| Variable | Used by |
|---|---|
| `OPENROUTER_API_KEY` | `chatbot.js`, `enhance-prompt.js` |
| `SUPABASE_URL` | `fetch-news.js`, `cleanup-archive.js` |
| `SUPABASE_SERVICE_ROLE_KEY` | `fetch-news.js`, `cleanup-archive.js` |
| `NEWSDATA_API_KEY` | `fetch-news.js` (NewsData.io) |
| `NEWSAPI_API_KEY` | `fetch-news.js` (NewsAPI.org) |

## SEO

- `robots.txt` — crawl directives; AI search bots (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot) explicitly allowed; `/games/` and `/loyalty-ui/` excluded from indexation
- `sitemap.xml` — covers homepage, `/news-events/`, `/ai-tools/`
- `llms.txt` — authoritative identity file for LLM/AI search engines
- `favicon.ico` + `apple-touch-icon.png` — "P" monogram in brand blue
- JSON-LD schema on all pages (Person + WebSite + ProfilePage on homepage; BreadcrumbList + WebPage on sub-pages)
- Google Search Console property: `pratikpadiyaportfolio.netlify.app`
- `games/index.html` — `noindex, nofollow` meta tag

## Deployment

Push to `main` — Netlify auto-deploys.

Scheduled functions run via `netlify.toml`:
- `fetch-news` — daily at 23:00 UTC
- `cleanup-archive` — monthly (28th–31st) at 23:00 UTC
