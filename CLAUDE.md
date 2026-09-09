# obsidian-calendar-notes

House conventions for Obsidian plugin repos live in the `obsidian-plugin-dev` skill.
Repo-specific gotchas below.

- `bun run build` runs esbuild **and** eslint; errors surface as `ERROR` lines and an
  `X ERRORS` count in the COMPLETED summary — a clean esbuild pass doesn't mean lint passed.
- `bun run dev` silently writes build output to `undefined.obsidian/` in the repo root if
  `TEST_VAULT` isn't set. Set it to a trailing-slash vault path.
- `src/settings/` is Svelte 4 (`export let`, `$:`); the calendar UI is Svelte 5 runes.
  Don't mix syntax within either area.
- `vitest.config.ts` runs jsdom globally and aliases `obsidian` to an empty
  `src/__mocks__/obsidian.ts` — Obsidian-runtime globals like `window.moment` are NOT
  polyfilled. Any test touching code that calls `window.moment(...)` needs
  `window.moment = moment` set explicitly (e.g. in `beforeAll`).
- No App/Vault fake exists (see above) — pure-logic modules that need vault/plugin I/O
  should take narrow function-shaped ports as params instead (e.g. `noteCreation.ts`'s
  `NoteCreationPorts`, `dateSuggestions.ts`'s `parseDate`), so tests stub plain functions
  rather than building an `App`/`Vault` fake.
- Every note-creation trigger (command, ribbon icon, calendar click, next/prev nav,
  startup auto-open) funnels through `createPeriodicNote` in `src/main.ts`, which
  delegates to `createNoteFromTemplate` in `src/noteCreation.ts` — hook creation-time
  behavior (template, rollover, write order) there, not in `main.ts`.
