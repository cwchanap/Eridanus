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

Pushes to `main` deploy the normal CI-built `dist/` artifact to two hosts after all CI jobs pass:

- **GitHub Pages** (https://cwchanap.github.io/Eridanus/). The Pages source is GitHub Actions.
- **Cloudflare Workers**, as the `eridanus` Worker serving `dist/` as static assets (`wrangler.jsonc`).

Saves live in each host's own `localStorage`, so progress does not carry between the two URLs.

The quality gates above remain authoritative for every change.

### Cloudflare setup

One-time, by a repository admin:

1. Make sure the Cloudflare account has a `workers.dev` subdomain (Workers & Pages → Overview).
2. Create an API token from the "Edit Cloudflare Workers" template and note the account ID.
3. Add them as repository secrets named `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (Settings → Secrets and variables → Actions).

The first successful deploy creates the Worker; the job log prints its `workers.dev` URL. To deploy from a local checkout instead, run `bun run build` then `bunx wrangler deploy` after `bunx wrangler login`.

## Architecture

- Pure TypeScript owns durable gameplay rules and save state.
- Phaser renders one reusable authored-map scene and forwards input.
- A framework-free DOM overlay renders HUD, interaction copy, combat controls, and save recovery.
- Content is authored as closed typed entities plus compact ASCII map rows.
