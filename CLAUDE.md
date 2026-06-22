# ppadiya.github.io — portfolio site (Netlify: pratikpadiyaportfolio.netlify.app)

- **Deploys to:** Netlify via GitHub push (confirm with user before pushing). Node 22 runtime.
- **Functions:** `chatbot.js`, `enhance-prompt.js` (OpenRouter), `fetch-news.js` (NewsAPI/NewsData + Supabase lazy init with `ws` transport).
- **API keys:** always headers (`X-Api-Key`, `X-ACCESS-KEY`), never URL params. CORS scoped to the netlify.app origin — never `*`.
- **OpenRouter:** free-tier models fail/disappear often (429s, "No endpoints found") — that's usually the root cause, not the code. Default model `meta-llama/llama-3.1-8b-instruct:free`; UI model selection must be respected, with fallback to first available model.
- **DOM:** `news-events/script.js` uses createElement/textContent — never reintroduce innerHTML interpolation.
- **Verify:** local `netlify dev` checks, then live endpoint curls (fetch-news 200, enhance-prompt returns text).

## Gotchas
- Rate limiting on chatbot/enhance-prompt is consciously deferred (see SECURITY_REMEDIATION_REPORT.md §11).
- Input capped at 2000 chars returning 400 — keep at boundary.

## Security Standards

<!-- managed by /security-bootstrap -->
- **No secrets in logs or committed files.** Log HTTP status + action name, never full error objects or URLs containing tokens. `.env*` stays gitignored.
- **Secrets only in env vars, never client-side.** No passwords/keys/tokens in localStorage, sessionStorage, or client bundles.
- **Public env prefixes are not secrets.** `VITE_*`/`NEXT_PUBLIC_*` compile into the client bundle; never put keys there. Commit the lockfile; run `npm audit` after adding deps.
- **Timeouts on all outbound HTTP.** Every fetch/axios/requests call sets an explicit timeout.
- **New endpoints go through the existing auth gate.** Validate credentials server-side; scope CORS to the deployed origin, never `*`; validate and length-cap all input at public boundaries.
<!-- end managed -->
