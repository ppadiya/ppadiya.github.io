# Pratik Padiya — Portfolio

Personal portfolio and tooling site for **Pratik Padiya**, Solutions Engineer & AI Automation Builder.

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

- Static HTML / CSS / JS — no framework
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

## Deployment

Push to `main` — Netlify auto-deploys.

Scheduled functions run via `netlify.toml`:
- `fetch-news` — daily at 23:00 UTC
- `cleanup-archive` — monthly (28th–31st) at 23:00 UTC
