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

## Architecture

- Pure TypeScript owns durable gameplay rules and save state.
- Phaser renders one reusable authored-map scene and forwards input.
- A framework-free DOM overlay renders HUD, interaction copy, combat controls, and save recovery.
- Content is authored as closed typed entities plus compact ASCII map rows.
