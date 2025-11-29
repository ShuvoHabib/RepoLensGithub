# GitHub Repository Search

Production-ready GitHub repo search app built with React + TypeScript, Vite, React Query, and a Cloudflare Pages Function proxy for authenticated requests.

## Features
- Debounced keyword search with server-side pagination, sorting (best match, stars, updated), language and fork filters.
- React Query caching and instant back/forward navigation to cached pages.
- Accessible pagination controls, loading skeletons, empty/error/rate-limit messaging.
- Optional Cloudflare Pages Function proxy that injects a private `GITHUB_TOKEN` without exposing it to the client.
- Strict TypeScript, ESLint + Prettier, Vitest + React Testing Library with integration coverage.

## Getting Started
```bash
npm install
npm run dev
```
The Vite dev server uses the public GitHub API directly. Without a token, GitHub rate limits apply (60 requests/hour).

### Environment Variables
- `VITE_USE_PROXY` (client, optional): set to `true` to route calls through `/search` (Cloudflare Function). Default is direct GitHub calls.
- `GITHUB_TOKEN` (Cloudflare env var): classic or fine-grained PAT used only inside the Cloudflare Function for authenticated requests. **Do not** expose this in `.env.local`.

Create a `.env` file for local client-only toggles if needed:
```
VITE_USE_PROXY=false
```

## Cloudflare Pages Function (Proxy)
- Location: `functions/search.ts`
- Validates/sanitizes query params, appends fork/language qualifiers, forwards to `GET /search/repositories`, and returns a trimmed JSON payload.
- Uses `GITHUB_TOKEN` from the Pages project environment. No tokens are bundled in the client.

## Running with the Function Locally
1. Build the site: `npm run build`
2. Serve with Wrangler (requires `GITHUB_TOKEN` in your shell or a `.dev.vars` file):
   ```bash
   npx wrangler pages dev dist
   ```
3. Set `VITE_USE_PROXY=true` in `.env` so the client hits `/search`.

## Scripts
- `npm run dev` – Vite dev server.
- `npm run build` – Type-check (project refs) then build for production.
- `npm run preview` – Preview the built bundle.
- `npm run lint` / `npm run lint:fix` – ESLint with TypeScript/React rules + Prettier compat.
- `npm run test` – Vitest with coverage **and** `tsc --noEmit`.
- `npm run test:watch` – Vitest watch mode.
- `npm run typecheck` – TypeScript without emit.

## Testing
Vitest + React Testing Library cover:
- Data fetching hook (`useSearchRepos`) success/error paths.
- Search page integration: renders results, debounced typing triggers new queries, pagination visible.
- Pagination component interactions.

Coverage is emitted to `coverage/` when running `npm run test`.

## Deployment to Cloudflare Pages
1. Set the build command to `npm run build` and output directory to `dist`.
2. Ensure the Functions directory is `functions` (matching `wrangler.toml`).
3. Add an environment variable in Pages: `GITHUB_TOKEN=<your-token>`.
4. (Optional) Set `VITE_USE_PROXY=true` in project build env to force the client to hit the proxy in production.

## Notes on Input Safety
- Client and function trim queries, cap length (120 chars), and reject obviously empty input.
- Function strips unsafe characters, enforces numeric ranges for `page`/`per_page`, and never returns raw errors or stack traces.
- Only a safe subset of repository fields is returned to the client.
