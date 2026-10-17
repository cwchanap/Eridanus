# HPA-182 Cloudflare Worker Deploy Design

## Status

Design for serving the shipped MVP from a Cloudflare Worker. The complete HPA-182 change stays on one PR.

## Goal

Make the game available from a Cloudflare Worker, deployed automatically from `main` after the same checks that gate the GitHub Pages deploy, without changing the game or the Pages deploy.

## Non-Goals

- No Worker script, bindings, backend, or server-side state. The game stays a static client with `localStorage` saves.
- GitHub Pages is not removed or altered; both hosts serve the same build.
- No custom domain, per-PR preview Workers, or staging environment.
- No new runtime dependency and no change to `package.json` or `bun.lock`.

## Current Evidence

- `vite.config.ts` already sets `base: './'` (HPA-21 made the build safe under a Pages project subpath), so every asset URL in `dist/index.html` is relative and the same build also works from a host root. Nothing in the build needs to change for a Worker.
- Verified locally: `wrangler deploy --dry-run` reads all `dist/` files, and `wrangler dev` serving `dist/` boots the real game (canvas, HUD, how-to-play card, arrow-key movement) from `/` with no failed requests or page errors.

## Design

### Serve `dist/` as Workers static assets

A root `wrangler.jsonc` with `name: "eridanus"`, a `compatibility_date`, and `assets.directory: "./dist"`. There is no `main`, so Cloudflare serves the folder directly. The game has a single page and no client-side routing, so the default 404 behaviour stays.

### Deploy job in CI

A `deploy-cloudflare` job beside the Pages `deploy` job in `.github/workflows/ci.yml`:

- runs only on pushes to `main` and `needs` the same three jobs (`build-lint`, `unit-test`, `playwright-test`);
- ships the exact `dist/` the CI build produced: `build-lint` already uploads it for Pages, and now also uploads it as a plain `dist` artifact that this job downloads;
- runs `bunx wrangler@<pinned> deploy`, pinned in the workflow so a new wrangler release cannot change a deploy;
- serialized with its own concurrency group (`cancel-in-progress: false`) so two close pushes cannot finish out of order;
- has no `permissions` beyond the workflow's `contents: read`.

The Pages and Cloudflare jobs are independent: a failure in one does not block the other.

### Credentials

Two repository secrets, set once by the repo owner:

- `CLOUDFLARE_API_TOKEN`: a token with the "Edit Cloudflare Workers" permission on the target account;
- `CLOUDFLARE_ACCOUNT_ID`: the account the Worker is created in.

The job runs only on `main`, after the gates, so pull requests (including forks) never see them. If either secret is missing the deploy step fails loudly rather than skipping, so a misconfiguration cannot look like a successful deploy.

The first deploy creates the `eridanus` Worker. The account must already have a `workers.dev` subdomain; the README documents this.

## Verification

Before merge: CI passes unchanged for pull requests (the new job does not run), and the local dry-run and `wrangler dev` smoke above. After merge, with secrets set: the `Deploy to Cloudflare Workers` job is green on `main` and the printed `workers.dev` URL loads the game.
