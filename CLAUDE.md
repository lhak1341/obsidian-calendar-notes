# obsidian-calendar-notes

House conventions for Obsidian plugin repos live in the `obsidian-plugin-dev` skill —
bun, script contract, ESLint/obsidianmd setup, settings-tab structure, API/CSS gotchas,
live debugging. Only repo-specific facts are below.

Has `graphify-out/`.

## This repo

- ESLint config is `eslint.config.js` (not `.mjs`) and additionally uses
  `eslint-plugin-import-x` (ESLint 10-compatible) with auto-fixable import sorting.
- `bun run build` runs esbuild **and** eslint; errors surface as `ERROR` lines and an
  `X ERRORS` count in the COMPLETED summary.
- `bun run dev` without a `TEST_VAULT` env var writes build output to `undefined.obsidian/`
  in the repo root (gitignored). Set `TEST_VAULT` to a trailing-slash vault path.
- `standard-version` handles releases (`bun run release`).
- Test files live alongside source as `*.test.ts`.

## Svelte version split

`src/settings/` uses Svelte 4 (`export let`, `$:`); the calendar UI uses Svelte 5 runes.
This is deliberate — do not mix within either area.
