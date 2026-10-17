# Eridanus

Exploration-first mini web game inspired by 魔塔, focused on handcrafted maze exploration, story/quests/treasure, and fast deterministic combat.

## Development

Requires [Bun](https://bun.sh).

```sh
bun install
bun run dev
```

## Quality gates

```sh
bun run typecheck
bun run lint
bun run format:check
bun run test:unit
bun run test:e2e
bun run build
```

## Deployment

Pushes to `main` deploy the normal CI-built `dist/` artifact to GitHub Pages (https://cwchanap.github.io/Eridanus/) after all CI jobs pass. The Pages source is GitHub Actions; the quality gates above remain authoritative for every change.

### Cloudflare Workers

`wrangler.jsonc` serves `dist/` as Workers static assets under the Worker name `eridanus`. The Worker is deployed by Cloudflare's own Git integration ([Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)), configured in the dashboard rather than GitHub Actions, so no Cloudflare secrets live in this repo.

One-time setup in the Cloudflare dashboard:

1. Workers & Pages → Create application → GitHub, and pick this repository. Name the Worker `eridanus`; it must match `name` in `wrangler.jsonc` or the build fails.
2. Git branch `main`, build command `bun run build`, deploy command `npx wrangler deploy` (the default).
3. Under the Worker's Settings → Build → Build variables, set `BUN_VERSION` to `1.4.2` to match the version pinned in `package.json`; Cloudflare's default is older.

Cloudflare builds and deploys on every push to `main` and only runs the build command, so typecheck, lint, and tests stay GitHub CI gates that do not block the Cloudflare deploy. Saves live in each host's own `localStorage`, so progress does not carry between the Pages and Worker URLs.

Other branches get a Preview when Settings → Build → Branch control → Enable Preview Builds is on. That build runs `npx wrangler preview` (the default Preview command), which needs Wrangler 4.135.0 or later; Workers Builds uses the Wrangler version in `package.json`, so `wrangler` is a pinned devDependency and the empty `previews` block in `wrangler.jsonc` is where Preview-only settings would go. Untick Enable Preview Builds if PR branches should not build on Cloudflare at all.

To deploy from a local checkout instead, run `bun run build` then `bunx wrangler deploy` after `bunx wrangler login`.

## Architecture

- Pure TypeScript owns durable gameplay rules and save state.
- Phaser renders one reusable authored-map scene and forwards input.
- A framework-free DOM overlay renders HUD, interaction copy, combat controls, and save recovery.
- Content is authored as closed typed entities plus compact ASCII map rows.
