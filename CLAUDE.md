# obsidian-calendar-notes

House conventions for Obsidian plugin repos live in the `obsidian-plugin-dev` skill.
Repo-specific gotchas below.

- `bun run build` runs esbuild **and** eslint; errors surface as `ERROR` lines and an
  `X ERRORS` count in the COMPLETED summary — a clean esbuild pass doesn't mean lint passed.
- `bun run dev` silently writes build output to `undefined.obsidian/` in the repo root if
  `TEST_VAULT` isn't set. Set it to a trailing-slash vault path.
- `src/settings/` is Svelte 4 (`export let`, `$:`); the calendar UI is Svelte 5 runes.
  Don't mix syntax within either area.
