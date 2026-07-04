## Linting
- Run `bun run lint:fix` or `./node_modules/.bin/eslint . --fix` — `npx eslint` fails through the rtk hook
- `eslint-plugin-obsidianmd` is registered manually in `eslint.config.js` (plugin + rules inline); do NOT spread `obsidianmd.configs.recommended` — it bundles conflicting plugins (@microsoft/sdl, no-unsanitized, eslint-comments, etc.)

## Code Analysis
- `bun run build` runs esbuild + eslint; errors appear as `ERROR` lines and `X ERRORS` in the COMPLETED summary
- Fallow reports ~93% "dead files" as false positives — Obsidian loads plugins dynamically so static analysis can't trace the real entry graph; trust complexity and circular-dep findings, ignore unused-file verdicts
