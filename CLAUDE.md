# ppadiya.github.io — portfolio site (Netlify: pratikpadiyaportfolio.netlify.app)

- **Deploys to:** Netlify via GitHub push (remote `ppadiya/ppadiya.github.io`; pushing IS the deploy — confirm with user before pushing). Node 22 runtime. Static site (no bundler build step) + Netlify Functions.
- **Functions (`netlify/functions/`):** `chatbot.js` + `enhance-prompt.js` (OpenRouter), `fetch-news.js` (NewsAPI/NewsData + Supabase lazy init with `ws` transport), `cleanup-archive.js` (scheduled; deletes old archived news via **service-role** Supabase client — server-side only, keep it that way). `embeddings_cache.json` in the same dir is chatbot data, not a function — don't delete it.
- **API keys:** always headers (`X-Api-Key`, `X-ACCESS-KEY`), never URL params. CORS scoped to the netlify.app origin — never `*`.
- **OpenRouter:** free-tier models fail/disappear often (429s, "No endpoints found") — that's usually the root cause, not the code. Default model `meta-llama/llama-3.1-8b-instruct:free`; UI model selection must be respected, with fallback to first available model.
- **DOM:** `news-events/script.js` uses createElement/textContent — never reintroduce innerHTML interpolation anywhere on the site.

## Definition of Done

There is no test suite (`npm test` is the placeholder error) — verification is manual and mandatory:

1. `netlify dev` locally: exercise every touched function end-to-end (chatbot reply, enhance-prompt returns text, fetch-news 200 with items).
2. `npm audit` clean (no new high/critical) if `package.json` changed.
3. After the user approves push: curl the LIVE endpoints — `fetch-news` 200, `enhance-prompt` returns text, chatbot answers (use /deploy-verify). A merge without live curls is not done.
4. Input caps and header-based keys preserved on any touched function.
5. Docs-before-push rule applies (global CLAUDE.md): update this file + memory with anything non-obvious.

## Gotchas
- Deps refreshed 2026-07-18 (in-range bumps, audit clean). `@vectorize-io/vectorize-client` is pinned pre-0.4 — a major bump needs testing against the chatbot function.
- Rate limiting on chatbot/enhance-prompt is consciously deferred (see SECURITY_REMEDIATION_REPORT.md §11).
- Input capped at 2000 chars returning 400 — keep at boundary.

## Dependency state
- 2026-11-01: plain `npm audit fix` (lockfile only) cleared axios + follow-redirects advisories; audit = 0. Never use `--force` here (push = deploy).

## Security Standards

<!-- managed by /security-bootstrap -->
- **No secrets in logs or committed files.** Log HTTP status + action name, never full error objects or URLs containing tokens. `.env*` stays gitignored.
- **Secrets only in env vars, never client-side.** No passwords/keys/tokens in localStorage, sessionStorage, or client bundles.
- **Public env prefixes are not secrets.** `VITE_*`/`NEXT_PUBLIC_*` compile into the client bundle; never put keys there. Commit the lockfile; run `npm audit` after adding deps.
- **Timeouts on all outbound HTTP.** Every fetch/axios/requests call sets an explicit timeout.
- **New endpoints go through the existing auth gate.** Validate credentials server-side; scope CORS to the deployed origin, never `*`; validate and length-cap all input at public boundaries.
<!-- end managed -->
