## Linting
- Run `bun run lint:fix` or `./node_modules/.bin/eslint . --fix` — `npx eslint` fails through the rtk hook
- `eslint-plugin-obsidianmd` is registered manually in `eslint.config.js` (plugin + rules inline); do NOT spread `obsidianmd.configs.recommended` — it bundles conflicting plugins (@microsoft/sdl, no-unsanitized, eslint-comments, etc.)
