# Cloudflare Worker Deploy Design

## Status

Design for serving the shipped MVP from a Cloudflare Worker. The complete change stays on one PR.

## Goal

Make the game available from a Cloudflare Worker without changing the game or the GitHub Pages deploy.

## Non-Goals

- No Worker script, bindings, backend, or server-side state. The game stays a static client with `localStorage` saves.
- GitHub Pages is not removed or altered; both hosts serve the same build.
- No GitHub Actions deploy job and no Cloudflare credentials in this repo. The first version of this PR had one (a gated `wrangler deploy` job needing an API token and account ID); the owner preferred to wire the Worker in the Cloudflare dashboard, so it was dropped.
- No custom domain or staging environment.
- No new runtime dependency and no change to `package.json` or `bun.lock`.

## Current Evidence

- `vite.config.ts` already sets `base: './'` (HPA-21 made the build safe under a Pages project subpath), so every asset URL in `dist/index.html` is relative and the same build also works from a host root. Nothing in the build needs to change for a Worker.
- Verified locally: `wrangler deploy --dry-run` reads all `dist/` files, and `wrangler dev` serving `dist/` boots the real game (canvas, HUD, how-to-play card, arrow-key movement) from `/` with no failed requests or page errors.

## Design

### Serve `dist/` as Workers static assets

A root `wrangler.jsonc` with `name: "eridanus"`, a `compatibility_date`, and `assets.directory: "./dist"`. There is no `main`, so Cloudflare serves the folder directly. The game has a single page and no client-side routing, so the default 404 behaviour stays.

### Deploy through Cloudflare's Git integration

The owner connects this repository to a Worker in the Cloudflare dashboard (Workers Builds). Cloudflare then builds and deploys on every push to `main`. The README holds the setup steps. Constraints from Cloudflare's docs:

- the dashboard Worker name must match `name` in `wrangler.jsonc` (`eridanus`), or the build fails;
- the build command is `bun run build` and the deploy command is the default `npx wrangler deploy`;
- the build image's default Bun is older than the `1.4.2` pinned in `package.json`, so set `BUN_VERSION=1.4.2` as a build variable.

### Trade-offs of this route

- Cloudflare runs only the build command. Typecheck, lint, unit, and Playwright stay in GitHub CI and do not gate the Cloudflare deploy, unlike the Pages deploy. This is accepted; the same checks already gate every PR into `main`.
- Cloudflare also builds non-production branches when Enable Preview Builds is on (Settings → Build → Branch control). Those builds run the Preview command, `npx wrangler preview` by default, instead of `wrangler deploy`. Worker Previews needs Wrangler 4.135.0 or later and Workers Builds uses the Wrangler version in `package.json`, so `wrangler` is a pinned devDependency and `wrangler.jsonc` carries an empty `previews` block. The first PR build after merge (PR 9) failed with no output while `main` succeeded; an unpinned Wrangler and the missing `previews` block were the differences found, and the build log was not readable from CI to confirm which one.
- Saves are per-origin `localStorage`, so progress does not carry between the Pages and Worker URLs.

## Verification

Before merge: CI is unchanged and green, and the local dry-run and `wrangler dev` smoke above. After the owner connects the repository and merges: the Cloudflare build for `main` succeeds and the `workers.dev` URL loads the game.
