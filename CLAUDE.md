## Linting
- Run `bun run lint:fix` or `./node_modules/.bin/eslint . --fix` — `npx eslint` fails through the rtk hook
- `eslint-plugin-obsidianmd` is registered manually in `eslint.config.js` (plugin + rules inline); do NOT spread `obsidianmd.configs.recommended` — it bundles conflicting plugins (@microsoft/sdl, no-unsanitized, eslint-comments, etc.)
- Uses `eslint-plugin-import-x` (ESLint 10-compatible); auto-fix works — run `eslint . --fix` to sort imports
- `bun run dev` without `TEST_VAULT` env var writes build output to `undefined.obsidian/` in repo root (gitignored); set `TEST_VAULT` to a trailing-slash vault path to use a real test vault

## Testing
- Run `bun run test` (vitest); test files live alongside source as `*.test.ts`

## Code Analysis
- `bun run build` runs esbuild + eslint; errors appear as `ERROR` lines and `X ERRORS` in the COMPLETED summary
- Fallow reports ~93% "dead files" as false positives — Obsidian loads plugins dynamically so static analysis can't trace the real entry graph; trust complexity and circular-dep findings, ignore unused-file verdicts

## Svelte
- `src/settings/` components use Svelte 4 syntax (`export let`, `$:`); calendar UI uses Svelte 5 runes (`$state`, `$derived`) — don't mix within an area
- `getSettingDefinitions()` declarative `control: { type, key }` shorthand requires `plugin.settings[key]` to work — incompatible with a Svelte store; use `render` callbacks or override `display()` instead

## Obsidian CSS
- Settings cards: `.setting-items` only gets padding/background/radius when inside `.setting-group` — use `containerEl.createDiv("setting-group").createDiv("setting-items")` and pass the inner div to `new Setting(...)` for grouped settings panels
- SVG fill/stroke: use `currentColor` not CSS vars — Obsidian base CSS can override `fill: var(--x)` on SVG elements; `currentColor` inherits from the parent's `color` which Svelte scoped CSS controls reliably
- Obsidian overrides bare element selectors (e.g. `th`) — use a parent class selector (`.calendar th`) and `!important` on the overridden properties to win the cascade
