# Eridanus

Exploration-first mini web game inspired by 魔塔, focused on handcrafted maze exploration, story/quests/treasure, and fast deterministic combat.

## Development

Requires [Bun](https://bun.sh).

```bash
bun install
bun run dev        # dev server
bun run test:unit  # Vitest
bun run test:e2e   # Playwright (needs `bunx playwright install chromium`)
bun run lint       # ESLint + Prettier checks
ci checks: bun run typecheck && bun run lint && bun run format:check && bun run build
```
