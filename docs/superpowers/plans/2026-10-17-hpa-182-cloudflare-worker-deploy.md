# HPA-182 Cloudflare Worker Deploy Implementation Plan

**Goal:** Deploy the existing static build to a Cloudflare Worker from `main`, gated like the Pages deploy.

**Architecture:** Configuration only. Workers static assets serve `dist/`; a CI job runs a pinned `wrangler deploy` on the artifact the build job already produced. No source, dependency, or lockfile change.

**Spec:** `docs/superpowers/specs/2026-10-17-hpa-182-cloudflare-worker-deploy-design.md`

## Task 1: Worker config

**Files:** `wrangler.jsonc`, `.gitignore`

- [x] Add `wrangler.jsonc` serving `./dist` as assets under the Worker name `eridanus`.
- [x] Ignore `.wrangler/` local state.
- [x] Confirm `wrangler deploy --dry-run` reads the built `dist/`.
- [x] Confirm `wrangler dev` serves the real game from `/` with no failed requests or page errors.

## Task 2: CI deploy job

**Files:** `.github/workflows/ci.yml`

- [x] Upload `dist/` as a plain `dist` artifact from `build-lint` on pushes to `main`.
- [x] Add `deploy-cloudflare`, needing all three check jobs, that downloads `dist` and runs the pinned `wrangler deploy` with the two secrets.

## Task 3: Docs

**Files:** `README.md`

- [x] Document the Cloudflare deploy, the two secrets, the `workers.dev` prerequisite, and the manual deploy command.

## After merge

- [ ] With both secrets set, confirm the `Deploy to Cloudflare Workers` job is green on `main` and the Worker URL loads the game.
