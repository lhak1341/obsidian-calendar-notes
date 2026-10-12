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
  `src/__mocks__/obsidian.ts`, so code that reaches `instanceof TFile` or `new Notice`
  throws under test — keep those branches out of the unit under test.
  `src/__mocks__/setupMoment.ts` (vitest `setupFiles`) sets `window.moment` for every
  test; other Obsidian-runtime globals are NOT polyfilled.
  ESLint bans value imports of `moment` in `src/**/*.ts` (it ships with Obsidian; an
  import bundles a second copy) — use `window.moment`, `import type` is fine. Svelte
  files aren't covered by that rule.
- No App/Vault fake exists (see above) — pure-logic modules that need vault/plugin I/O
  should take narrow function-shaped ports as params instead (e.g. `noteCreation.ts`'s
  `NoteCreationPorts`, `dateSuggestions.ts`'s `parseDate`), so tests stub plain functions
  rather than building an `App`/`Vault` fake.
- Every note-creation trigger funnels through `src/noteCreation.ts`: command, ribbon
  icon, calendar click, next/prev nav and startup auto-open via `getOrCreatePeriodicNote`
  in `src/main.ts` (-> `getOrCreateNote`), and hand-made empty files via the cache's
  `periodic-notes:empty-note-created` event (-> `seedNoteFromTemplate`). Hook
  creation-time behavior (template, rollover, write order) there, not in `main.ts`.
  The Obsidian side of the ports is `src/obsidianNoteCreationPorts.ts` (forwards only).
- The settings UI edits the store's settings object in place (`writableDerived` in
  `PeriodicGroup.svelte`), so never keep a reference as "previous settings" — compare a
  fingerprint or clone (`createSettingsEffectsTracker`). Live-check settings logic with
  `p.settings.update(s => { s.day.folder = "x"; return s })`; spread-copies hide the bug.
