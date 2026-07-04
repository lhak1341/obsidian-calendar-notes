## Linting
- Run `bun run lint:fix` or `./node_modules/.bin/eslint . --fix` — `npx eslint` fails through the rtk hook
- `eslint-plugin-obsidianmd` is registered manually in `eslint.config.js` (plugin + rules inline); do NOT spread `obsidianmd.configs.recommended` — it bundles conflicting plugins (@microsoft/sdl, no-unsanitized, eslint-comments, etc.)
- Uses `eslint-plugin-import-x` (ESLint 10-compatible); auto-fix works — run `eslint . --fix` to sort imports
- `bun run dev` without `TEST_VAULT` env var writes build output to `undefined.obsidian/` in repo root (gitignored); set `TEST_VAULT` to a trailing-slash vault path to use a real test vault

## Code Analysis
- `bun run build` runs esbuild + eslint; errors appear as `ERROR` lines and `X ERRORS` in the COMPLETED summary
- Fallow reports ~93% "dead files" as false positives — Obsidian loads plugins dynamically so static analysis can't trace the real entry graph; trust complexity and circular-dep findings, ignore unused-file verdicts
