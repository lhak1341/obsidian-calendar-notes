# Graph Report - obsidian-calendar-notes  (2026-10-12)

## Corpus Check
- 65 files · ~17,209 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 563 nodes · 886 edges · 83 communities (38 shown, 45 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `599a94a2`
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
- obsidianNoteCreationPorts.ts
- commands.ts
- CONTEXT.md

## God Nodes (most connected - your core abstractions)
1. `Granularity` - 33 edges
2. `PeriodicNotesCache` - 20 edges
3. `PeriodicNotesPlugin` - 18 edges
4. `PeriodicNoteCachedMetadata` - 16 edges
5. `moment` - 14 edges
6. `PeriodicNoteIndex` - 14 edges
7. `activeGranularities()` - 12 edges
8. `compilerOptions` - 11 edges
9. `NoteCreationPorts` - 10 edges
10. `PeriodicConfig` - 10 edges

## Surprising Connections (you probably didn't know these)
- `dayUID()` --references--> `moment`  [EXTRACTED]
  src/calendar/ui/types.ts → package.json
- `weekUID()` --references--> `moment`  [EXTRACTED]
  src/calendar/ui/types.ts → package.json
- `openWithConfirm()` --references--> `moment`  [EXTRACTED]
  src/calendar/ui/openWithConfirm.ts → package.json
- `createNoteFromTemplate()` --references--> `moment`  [EXTRACTED]
  src/noteCreation.ts → package.json
- `periodKey()` --references--> `moment`  [EXTRACTED]
  src/periodicNoteIndex.ts → package.json

## Import Cycles
- None detected.

## Communities (83 total, 45 thin omitted)

### Community 1 - "Settings UI & Localization"
Cohesion: 0.08
Nodes (19): App, Chooser, CommandManager, CommunityPluginManager, DailyNotesPlugin, DailyNotesSettings, EditorSuggestManager, InstalledPlugin (+11 more)

### Community 2 - "Calendar UI & Word Count"
Cohesion: 0.05
Nodes (41): lodash/capitalize, src/constants, src/settings/defaults, src/ui/file-suggest, src/formatRules, src/granularity, src/settings/components/NoteFolderSetting.svelte, src/settings/components/NoteFormatSetting.svelte (+33 more)

### Community 3 - "App Integration & Templates"
Cohesion: 0.11
Nodes (20): createNoteFromTemplate(), getOrCreateNote(), NoteCreationPorts, renderPeriodicNote(), seedNoteFromTemplate(), Block, extractUnfinishedSection(), findSection() (+12 more)

### Community 4 - "Command Registry & Navigation"
Cohesion: 0.15
Nodes (5): NAVIGATOR_INSTRUCTIONS, NLDNavigator, RELATED_FILES_INSTRUCTIONS, RelatedFilesSwitcher, IHasNoteIndex

### Community 5 - "Daily Notes Legacy Support"
Cohesion: 0.11
Nodes (15): PeriodicNotesPlugin, PeriodicNotesSettingsTab, configureGlobalMomentLocale(), getLocalizationSettings(), ILocalizationSettings, initializeLocaleConfigOnce(), langToMomentLocale, overrideGlobalMomentWeekStart() (+7 more)

### Community 6 - "Date Formatting Rules"
Cohesion: 0.12
Nodes (31): moment, moment, decide(), getCanonicalDateString(), matchByFilename(), matchByFrontmatter(), matchByLooseGuess(), resolveFile() (+23 more)

### Community 7 - "Svelte UI Integration"
Cohesion: 0.11
Nodes (10): clamp(), createWordCountSource(), getWordCount(), DotCell, CalendarDot, dayUID(), GetDots, weekUID() (+2 more)

### Community 8 - "Periodic Notes Cache Engine"
Cohesion: 0.08
Nodes (8): PeriodicNotesCache, Resolution, ResolveReason, compareGranularity(), PeriodicNoteIndex, periodKey(), INoteIndex, PeriodicNoteCachedMetadata

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

### Community 32 - "IPeriodicity"
Cohesion: 0.20
Nodes (9): entry, $schema, esbuild.config.mjs, scripts/*.mjs, src/main.ts, src/__mocks__/*.ts, src/**/*.test.ts, svelte.config.js (+1 more)

### Community 75 - "rollover.ts"
Cohesion: 0.09
Nodes (36): MatchInput, ConfirmOps, openWithConfirm(), DEFAULT_FORMAT, HUMANIZE_FORMAT, activeGranularities(), displayConfigs, iconId() (+28 more)

### Community 80 - "obsidianNoteCreationPorts.ts"
Cohesion: 0.47
Nodes (7): noteFilePath(), parentFolders(), ensureFolderExists(), getNoteCreationPath(), getTemplateContents(), obsidianNoteCreationPorts(), join()

### Community 81 - "commands.ts"
Cohesion: 0.50
Nodes (7): commandIds(), commandIdsFor(), CommandPlugin, getCommands(), jumpToAdjacentNote(), openAdjacentNote(), whenActiveIsPeriodic()

## Knowledge Gaps
- **185 isolated node(s):** `$schema`, `src/main.ts`, `src/**/*.test.ts`, `src/__mocks__/*.ts`, `esbuild.config.mjs` (+180 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **45 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `moment` connect `Date Formatting Rules` to `App Integration & Templates`, `Svelte UI Integration`, `Periodic Notes Cache Engine`, `Filename & Directory Valida...`, `rollover.ts`?**
  _High betweenness centrality (0.154) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Filename & Directory Valida...` to `Natural Language Date Parsing`, `Date Formatting Rules`?**
  _High betweenness centrality (0.154) - this node is a cross-community bridge._
- **Why does `Granularity` connect `rollover.ts` to `Settings UI & Localization`, `App Integration & Templates`, `Daily Notes Legacy Support`, `Date Formatting Rules`, `Periodic Notes Cache Engine`, `commands.ts`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **What connects `$schema`, `src/main.ts`, `src/**/*.test.ts` to the rest of the system?**
  _185 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Settings UI & Localization` be split into smaller, more focused modules?**
  _Cohesion score 0.07936507936507936 - nodes in this community are weakly interconnected._
- **Should `Calendar UI & Word Count` be split into smaller, more focused modules?**
  _Cohesion score 0.05194805194805195 - nodes in this community are weakly interconnected._
- **Should `App Integration & Templates` be split into smaller, more focused modules?**
  _Cohesion score 0.1103448275862069 - nodes in this community are weakly interconnected._