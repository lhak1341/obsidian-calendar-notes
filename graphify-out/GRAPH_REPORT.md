# Graph Report - obsidian-calendar-notes  (2026-09-09)

## Corpus Check
- 50 files · ~13,773 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 504 nodes · 721 edges · 75 communities (31 shown, 44 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `865a4529`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Settings UI & Localization
- Calendar UI & Word Count
- Command Registry & Navigation
- Daily Notes Legacy Support
- Date Formatting Rules
- Svelte UI Integration
- Periodic Notes Cache Engine
- Autocomplete Suggestions UI
- Filename & Directory Valida...
- Natural Language Date Parsing
- Obsidian View Life Cycle
- Related Files Navigation Modal
- Timeline Manager Panel
- Esbuild Build Automation
- Search Suggestion Helpers
- Timeline Component
- SUPPRESSED
- HUMANIZE_FORMAT
- isValidFilename
- ESLint Code Style Config
- Vitest Test Config
- Svelte Config
- ESLint Code Style Config
- Vitest Test Config
- IDisplayConfig
- Comm 28 (PeriodicNotesPl)
- Workspace Augmentations
- Comm 31 (VaultSettings A)
- IPeriodicity
- DEFAULT_CALENDARSET_ID
- calendarDayIcon
- calendarWeekIcon
- calendarMonthIcon
- calendarQuarterIcon
- calendarYearIcon
- validateTemplate
- Comm 42 (isDailyNotesPlu)
- getLocaleOptions
- getWeekStartOptions
- note
- now
- CalendarPane
- sources
- DotSource
- PeriodicNotesPlugin.configureCommands
- PeriodicNotesPlugin.configureRibbonIcons
- PeriodicNotesPlugin.createPeriodicNote
- LegacyConfig
- PeriodicNotesPlugin.addLegacySettingsCompat
- PeriodicNotesPlugin.loadSettings
- PeriodicNotesPlugin.onUpdateSettings
- PeriodicNotesPlugin.openPeriodicNote
- SettingsStore
- NoteFolderSetting
- NoteFormatSetting
- NoteTemplateSetting
- OpenAtStartupSetting
- PeriodicGroup
- GranularitySection

## God Nodes (most connected - your core abstractions)
1. `PeriodicNotesPlugin` - 25 edges
2. `Granularity` - 24 edges
3. `PeriodicNotesCache` - 16 edges
4. `INoteOps` - 15 edges
5. `moment` - 12 edges
6. `PeriodicNoteCachedMetadata` - 12 edges
7. `configFor` - 11 edges
8. `compilerOptions` - 11 edges
9. `NLDNavigator` - 10 edges
10. `INoteIndex` - 10 edges

## Surprising Connections (you probably didn't know these)
- `dayUID` --references--> `moment`  [EXTRACTED]
  src/calendar/ui/types.ts → package.json
- `weekUID` --references--> `moment`  [EXTRACTED]
  src/calendar/ui/types.ts → package.json
- `getRelativeDate` --references--> `moment`  [EXTRACTED]
  src/utils.ts → package.json
- `getCanonicalDateString()` --references--> `moment`  [EXTRACTED]
  src/cacheDecision.ts → package.json
- `matchByFilename()` --references--> `moment`  [EXTRACTED]
  src/cacheDecision.ts → package.json

## Import Cycles
- None detected.

## Communities (75 total, 44 thin omitted)

### Community 1 - "Settings UI & Localization"
Cohesion: 0.05
Nodes (27): App, CalendarPlugin, Chooser, CommandManager, CommunityPluginManager, DailyNotesPlugin, DailyNotesSettings, Editor (+19 more)

### Community 2 - "Calendar UI & Word Count"
Cohesion: 0.06
Nodes (36): lodash/capitalize, src/commands, src/constants, src/settings/defaults, src/ui/file-suggest, src/settings/components/NoteFolderSetting.svelte, src/settings/components/NoteFormatSetting.svelte, src/settings/components/NoteTemplateSetting.svelte (+28 more)

### Community 4 - "Command Registry & Navigation"
Cohesion: 0.07
Nodes (15): displayConfigs, getCommands, IDisplayConfig, jumpToAdjacentNote, openAdjacentNote, PeriodicNoteCreateModal, showFileMenu, DateNavigationItem (+7 more)

### Community 5 - "Daily Notes Legacy Support"
Cohesion: 0.06
Nodes (30): CalendarView, addLegacySettingsCompat(), LegacyConfig, SettingsStore, LegacyPeriodicitySettings, LegacyPluginData, PeriodicNotesPlugin, DEFAULT_PERIODIC_CONFIG (+22 more)

### Community 6 - "Date Formatting Rules"
Cohesion: 0.08
Nodes (40): moment, moment, decide(), getCanonicalDateString(), matchByFilename(), matchByLooseGuess(), MatchInput, ConfirmOps (+32 more)

### Community 7 - "Svelte UI Integration"
Cohesion: 0.23
Nodes (7): clamp(), createWordCountSource, getWordCount, DotCell, CalendarDot, GetDots, Vault

### Community 8 - "Periodic Notes Cache Engine"
Cohesion: 0.20
Nodes (3): compareGranularity, PeriodicNotesCache, PeriodicNoteCachedMetadata

### Community 9 - "Autocomplete Suggestions UI"
Cohesion: 0.19
Nodes (3): FileSuggest, FolderSuggest, TextInputSuggest

### Community 10 - "Filename & Directory Valida..."
Cohesion: 0.05
Nodes (41): builtin-modules, dotenv, esbuild, esbuild-svelte, eslint, eslint-plugin-import-x, eslint-plugin-obsidianmd, jsdom (+33 more)

### Community 11 - "Natural Language Date Parsing"
Cohesion: 0.07
Nodes (26): lodash, author, dependencies, lodash, obsidian, svelte, svelte-writable-derived, description (+18 more)

### Community 12 - "Obsidian View Life Cycle"
Cohesion: 0.08
Nodes (23): Calendar Plugin Integration, Calendar Plugin Integration, Commands, Commands, FAQ, How do I use a variable in the folder path?, Migrating, Monthly Notes (+15 more)

### Community 13 - "Related Files Navigation Modal"
Cohesion: 0.09
Nodes (22): dom, es2015, es2016, es2019, es2020, es5, scripthost, **/*.ts (+14 more)

### Community 14 - "Timeline Manager Panel"
Cohesion: 0.15
Nodes (11): buildOptions, sveltePreprocessOptions, author, authorUrl, description, fundingUrl, id, isDesktopOnly (+3 more)

### Community 15 - "Esbuild Build Automation"
Cohesion: 0.40
Nodes (3): OPTIONAL, REQUIRED, targets

### Community 21 - "isValidFilename"
Cohesion: 0.31
Nodes (10): FileLike, getBasename, getDateInput, isValidFilename, pathWithoutExtension, splitFormatSegments(), validateFolder, validateFormat (+2 more)

## Knowledge Gaps
- **181 isolated node(s):** `sveltePreprocessOptions`, `buildOptions`, `id`, `name`, `description` (+176 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **44 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Filename & Directory Valida...` to `Natural Language Date Parsing`, `Date Formatting Rules`?**
  _High betweenness centrality (0.171) - this node is a cross-community bridge._
- **Why does `moment` connect `Date Formatting Rules` to `Filename & Directory Valida...`, `Command Registry & Navigation`?**
  _High betweenness centrality (0.168) - this node is a cross-community bridge._
- **Why does `applyTemplateTransformations` connect `Date Formatting Rules` to `Daily Notes Legacy Support`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **What connects `sveltePreprocessOptions`, `buildOptions`, `id` to the rest of the system?**
  _181 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Settings UI & Localization` be split into smaller, more focused modules?**
  _Cohesion score 0.0524390243902439 - nodes in this community are weakly interconnected._
- **Should `Calendar UI & Word Count` be split into smaller, more focused modules?**
  _Cohesion score 0.06009783368273934 - nodes in this community are weakly interconnected._
- **Should `Command Registry & Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.07087486157253599 - nodes in this community are weakly interconnected._