# Domain glossary

**Seeding** — filling a note the user just created by hand (an empty file whose name
strictly matches a periodic format) with the same template, and for day notes the same
rollover, that a command-created note gets. Writes only if the file is still empty.
Contrast with creating, where the plugin makes the file itself.

**Frontmatter match** — a note whose frontmatter has a granularity key (`day: 2024-01-15`)
with a valid ISO-style date. Always outranks a filename match, whatever the filename
format is. An unparseable value is skipped, not fatal. Which file is which period is
decided statelessly (`decide` in `src/cacheDecision.ts`): the same inputs always give the
same answer, whatever events led there.

**Template variable** — a `{{...}}` placeholder in a periodic note's template, filled by
`renderTemplate` (`src/templateEngine.ts`) when a note is created or seeded. Which
variables exist depends on the note's granularity:
- all: `{{date}}`, `{{title}}` (the filename), `{{time}}` (current time, `HH:mm`)
- day only: `{{yesterday}}`, `{{tomorrow}}`, `{{date:fmt}}`, `{{time:fmt}}` and offsets such as
  `{{date+1d:fmt}}`
- week only: `{{monday:fmt}}` … `{{sunday:fmt}}`, relative to the locale's week
- month, quarter, year: the note's own `{{month}}`, `{{quarter}}`, `{{year}}`, resolved to
  the start of the period, with optional offset and `:fmt`

A variable outside its granularity is left as written. Offset units are moment's: `m` is
minutes, `M` is months.
