# Cloudflare Worker Deploy Implementation Plan

**Goal:** Let Cloudflare's Git integration serve the existing static build from a Worker.

**Architecture:** Configuration and docs only. `wrangler.jsonc` serves `dist/` as Workers static assets; the Worker is connected to the repository in the Cloudflare dashboard. No source, dependency, lockfile, or CI change.

**Spec:** `docs/superpowers/specs/2026-10-17-cloudflare-worker-deploy-design.md`

## Task 1: Worker config

**Files:** `wrangler.jsonc`, `.gitignore`

- [x] Add `wrangler.jsonc` serving `./dist` as assets under the Worker name `eridanus`.
- [x] Ignore `.wrangler/` local state.
- [x] Confirm `wrangler deploy --dry-run` reads the built `dist/`.
- [x] Confirm `wrangler dev` serves the real game from `/` with no failed requests or page errors.

## Task 2: Docs

**Files:** `README.md`

- [x] Document the dashboard setup (repository, Worker name, build and deploy commands, `BUN_VERSION`), that Cloudflare does not wait for GitHub CI, and that saves do not carry between hosts.

## After merge

- [ ] With the repository connected in the dashboard, confirm the Cloudflare build for `main` succeeds and the Worker URL loads the game.
