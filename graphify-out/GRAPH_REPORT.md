# Graph Report - obsidian-calendar-notes  (2026-09-10)

## Corpus Check
- 55 files · ~15,314 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 534 nodes · 788 edges · 80 communities (36 shown, 44 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f676b87a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Settings UI & Localization
- Calendar UI & Word Count
- App Integration & Templates
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
- rollover.ts

## God Nodes (most connected - your core abstractions)
1. `Granularity` - 28 edges
2. `PeriodicNotesPlugin` - 26 edges
3. `PeriodicNotesCache` - 17 edges
4. `PeriodicNoteCachedMetadata` - 15 edges
5. `INoteOps` - 15 edges
6. `createNoteFromTemplate()` - 13 edges
7. `moment` - 12 edges
8. `PeriodicConfig` - 12 edges
9. `configFor()` - 11 edges
10. `compilerOptions` - 11 edges

## Surprising Connections (you probably didn't know these)
- `getCanonicalDateString()` --references--> `moment`  [EXTRACTED]
  src/cacheDecision.ts → package.json
- `matchByFilename()` --references--> `moment`  [EXTRACTED]
  src/cacheDecision.ts → package.json
- `dayUID()` --references--> `moment`  [EXTRACTED]
  src/calendar/ui/types.ts → package.json
- `weekUID()` --references--> `moment`  [EXTRACTED]
  src/calendar/ui/types.ts → package.json
- `createNoteFromTemplate()` --references--> `moment`  [EXTRACTED]
  src/noteCreation.ts → package.json

## Import Cycles
- None detected.

## Communities (80 total, 44 thin omitted)

### Community 1 - "Settings UI & Localization"
Cohesion: 0.06
Nodes (23): App, CalendarPlugin, Chooser, CommandManager, CommunityPluginManager, DailyNotesPlugin, DailyNotesSettings, Editor (+15 more)

### Community 2 - "Calendar UI & Word Count"
Cohesion: 0.10
Nodes (20): lodash/capitalize, src/commands, src/constants, src/settings/defaults, src/ui/file-suggest, src/settings/components/NoteFolderSetting.svelte, src/settings/components/NoteFormatSetting.svelte, src/settings/components/NoteTemplateSetting.svelte (+12 more)

### Community 3 - "App Integration & Templates"
Cohesion: 0.08
Nodes (17): ./Calendar.svelte, createRef, deleteRef, getDots, leafRef, modifyRef, renameRef, selectedId (+9 more)

### Community 4 - "Command Registry & Navigation"
Cohesion: 0.08
Nodes (13): displayConfigs, getCommands(), IDisplayConfig, jumpToAdjacentNote(), openAdjacentNote(), PeriodicNoteCreateModal, showFileMenu(), NAVIGATOR_INSTRUCTIONS (+5 more)

### Community 5 - "Daily Notes Legacy Support"
Cohesion: 0.08
Nodes (21): PeriodicNotesPlugin, VaultSettings, DEFAULT_PERIODIC_CONFIG, DEFAULT_SETTINGS, PeriodicNotesSettingsTab, configureGlobalMomentLocale(), getLocalizationSettings(), ILocaleOverride (+13 more)

### Community 6 - "Date Formatting Rules"
Cohesion: 0.11
Nodes (28): moment, moment, ConfirmOps, openWithConfirm(), dayUID(), weekUID(), configFor(), isIsoFormat() (+20 more)

### Community 7 - "Svelte UI Integration"
Cohesion: 0.23
Nodes (7): clamp(), createWordCountSource(), getWordCount(), DotCell, CalendarDot, GetDots, Vault

### Community 8 - "Periodic Notes Cache Engine"
Cohesion: 0.11
Nodes (17): compareGranularity(), PeriodicNotesCache, decide(), getCanonicalDateString(), matchByFilename(), matchByLooseGuess(), MatchInput, ResolveReason (+9 more)

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
Nodes (8): FileLike, getBasename(), getDateInput(), isValidFilename(), pathWithoutExtension(), splitFormatSegments(), validateFormat(), validateFormatComplexity()

### Community 75 - "rollover.ts"
Cohesion: 0.07
Nodes (27): CalendarView, addLegacySettingsCompat(), LegacyConfig, SettingsStore, createNoteFromTemplate(), NoteCreationPorts, RolloverOptions, Block (+19 more)

## Knowledge Gaps
- **179 isolated node(s):** `sveltePreprocessOptions`, `buildOptions`, `id`, `name`, `description` (+174 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **44 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Filename & Directory Valida...` to `Natural Language Date Parsing`, `Date Formatting Rules`?**
  _High betweenness centrality (0.165) - this node is a cross-community bridge._
- **Why does `moment` connect `Date Formatting Rules` to `Periodic Notes Cache Engine`, `Filename & Directory Valida...`, `rollover.ts`?**
  _High betweenness centrality (0.164) - this node is a cross-community bridge._
- **Why does `createNoteFromTemplate()` connect `rollover.ts` to `Daily Notes Legacy Support`, `Date Formatting Rules`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **What connects `sveltePreprocessOptions`, `buildOptions`, `id` to the rest of the system?**
  _179 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Settings UI & Localization` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `Calendar UI & Word Count` be split into smaller, more focused modules?**
  _Cohesion score 0.1028225806451613 - nodes in this community are weakly interconnected._
- **Should `App Integration & Templates` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._