# Graph Report - .  (2026-07-11)

## Corpus Check
- Corpus is ~12,775 words - fits in a single context window. You may not need a graph.

## Summary
- 385 nodes · 596 edges · 46 communities (16 shown, 30 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Date & Config Utilities|Date & Config Utilities]]
- [[_COMMUNITY_Settings UI & Localization|Settings UI & Localization]]
- [[_COMMUNITY_Calendar UI & Word Count|Calendar UI & Word Count]]
- [[_COMMUNITY_App Integration & Templates|App Integration & Templates]]
- [[_COMMUNITY_Command Registry & Navigation|Command Registry & Navigation]]
- [[_COMMUNITY_Daily Notes Legacy Support|Daily Notes Legacy Support]]
- [[_COMMUNITY_Date Formatting Rules|Date Formatting Rules]]
- [[_COMMUNITY_Svelte UI Integration|Svelte UI Integration]]
- [[_COMMUNITY_Periodic Notes Cache Engine|Periodic Notes Cache Engine]]
- [[_COMMUNITY_Autocomplete Suggestions UI|Autocomplete Suggestions UI]]
- [[_COMMUNITY_Filename & Directory Valida...|Filename & Directory Valida...]]
- [[_COMMUNITY_Natural Language Date Parsing|Natural Language Date Parsing]]
- [[_COMMUNITY_Obsidian View Life Cycle|Obsidian View Life Cycle]]
- [[_COMMUNITY_Related Files Navigation Modal|Related Files Navigation Modal]]
- [[_COMMUNITY_Timeline Manager Panel|Timeline Manager Panel]]
- [[_COMMUNITY_Esbuild Build Automation|Esbuild Build Automation]]
- [[_COMMUNITY_Search Suggestion Helpers|Search Suggestion Helpers]]
- [[_COMMUNITY_getDailyNotesPlugin|getDailyNotesPlugin]]
- [[_COMMUNITY_Timeline Component|Timeline Component]]
- [[_COMMUNITY_SUPPRESSED|SUPPRESSED]]
- [[_COMMUNITY_HUMANIZE_FORMAT|HUMANIZE_FORMAT]]
- [[_COMMUNITY_isValidFilename|isValidFilename]]
- [[_COMMUNITY_Svelte Config|Svelte Config]]
- [[_COMMUNITY_ESLint Code Style Config|ESLint Code Style Config]]
- [[_COMMUNITY_Vitest Test Config|Vitest Test Config]]
- [[_COMMUNITY_IDisplayConfig|IDisplayConfig]]
- [[_COMMUNITY_Comm 28 (PeriodicNotesPl)|Comm 28 (PeriodicNotesPl)]]
- [[_COMMUNITY_isMetaPressed|isMetaPressed]]
- [[_COMMUNITY_Workspace Augmentations|Workspace Augmentations]]
- [[_COMMUNITY_Comm 31 (VaultSettings A)|Comm 31 (VaultSettings A)]]
- [[_COMMUNITY_IPeriodicity|IPeriodicity]]
- [[_COMMUNITY_DEFAULT_CALENDARSET_ID|DEFAULT_CALENDARSET_ID]]
- [[_COMMUNITY_calendarDayIcon|calendarDayIcon]]
- [[_COMMUNITY_calendarWeekIcon|calendarWeekIcon]]
- [[_COMMUNITY_calendarMonthIcon|calendarMonthIcon]]
- [[_COMMUNITY_calendarQuarterIcon|calendarQuarterIcon]]
- [[_COMMUNITY_calendarYearIcon|calendarYearIcon]]
- [[_COMMUNITY_validateTemplate|validateTemplate]]
- [[_COMMUNITY_validateFolder|validateFolder]]
- [[_COMMUNITY_wrapAround|wrapAround]]
- [[_COMMUNITY_Comm 42 (isDailyNotesPlu)|Comm 42 (isDailyNotesPlu)]]
- [[_COMMUNITY_disableDailyNotesPlugin|disableDailyNotesPlugin]]
- [[_COMMUNITY_getLocaleOptions|getLocaleOptions]]
- [[_COMMUNITY_getWeekStartOptions|getWeekStartOptions]]

## God Nodes (most connected - your core abstractions)
1. `PeriodicNotesPlugin` - 19 edges
2. `PeriodicNotesCache` - 16 edges
3. `configFor()` - 10 edges
4. `Granularity` - 9 edges
5. `NLDNavigator` - 9 edges
6. `PeriodicNotesPlugin` - 9 edges
7. `CalendarView` - 8 edges
8. `PeriodicNotesCache` - 8 edges
9. `Calendar` - 8 edges
10. `INoteOps` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Svelte Version Coexistence` --rationale_for--> `PeriodicGroup`  [INFERRED]
  CLAUDE.md → src/settings/pages/details/PeriodicGroup.svelte
- `Obsidian CSS Adaptations` --rationale_for--> `PeriodicGroup`  [INFERRED]
  CLAUDE.md → src/settings/pages/details/PeriodicGroup.svelte
- `Svelte Version Coexistence` --rationale_for--> `Calendar`  [INFERRED]
  CLAUDE.md → src/calendar/ui/Calendar.svelte
- `Obsidian CSS Adaptations` --rationale_for--> `Calendar`  [INFERRED]
  CLAUDE.md → src/calendar/ui/Calendar.svelte
- `Weekly Notes Concept` --conceptually_related_to--> `Calendar`  [INFERRED]
  README.md → src/calendar/ui/Calendar.svelte

## Communities (46 total, 30 thin omitted)

### Community 0 - "Date & Config Utilities"
Cohesion: 0.08
Nodes (40): DEFAULT_PERIODIC_CONFIG, DEFAULT_SETTINGS, configFor(), isIsoFormat(), displayConfigs, getCommands(), IDisplayConfig, DEFAULT_FORMAT (+32 more)

### Community 1 - "Settings UI & Localization"
Cohesion: 0.05
Nodes (38): PeriodicNotesSettingsTab, configureGlobalMomentLocale(), getLocalizationSettings(), ILocaleOverride, ILocalizationSettings, initializeLocaleConfigOnce(), IWeekStartOption, langToMomentLocale (+30 more)

### Community 2 - "Calendar UI & Word Count"
Cohesion: 0.06
Nodes (25): note, now, createRef, deleteRef, handleClickDay(), handleClickWeek(), leafRef, modifyRef (+17 more)

### Community 3 - "App Integration & Templates"
Cohesion: 0.12
Nodes (20): lodash/capitalize, src/commands, src/constants, src/settings/defaults, src/ui/file-suggest, src/settings/components/NoteFolderSetting.svelte, src/settings/components/NoteFormatSetting.svelte, src/settings/components/NoteTemplateSetting.svelte (+12 more)

### Community 4 - "Command Registry & Navigation"
Cohesion: 0.1
Nodes (28): displayConfigs, getCommands, jumpToAdjacentNote, openAdjacentNote, esbuild Build Script, VAULT_DIR, configureGlobalMomentLocale, getLocalizationSettings (+20 more)

### Community 5 - "Daily Notes Legacy Support"
Cohesion: 0.11
Nodes (5): findStartupNoteConfig(), getDailyNotesPlugin(), getLegacyDailyNoteSettings(), hasLegacyDailyNoteSettings(), PeriodicNotesPlugin

### Community 6 - "Date Formatting Rules"
Cohesion: 0.1
Nodes (25): compareGranularity, getCanonicalDateString, PeriodicNotesCache, configFor, isIsoFormat, DEFAULT_FORMAT, DEFAULT_PERIODIC_CONFIG, DEFAULT_SETTINGS (+17 more)

### Community 7 - "Svelte UI Integration"
Cohesion: 0.09
Nodes (25): Calendar, CalendarPane, Obsidian CSS Adaptations, Svelte Version Coexistence, NUM_MAX_DOTS, VIEW_TYPE_CALENDAR, GranularitySection, PeriodicNotesSettingsTab (+17 more)

### Community 8 - "Periodic Notes Cache Engine"
Cohesion: 0.18
Nodes (3): compareGranularity(), getCanonicalDateString(), PeriodicNotesCache

### Community 10 - "Filename & Directory Valida..."
Cohesion: 0.31
Nodes (6): getDateInput(), isValidFilename(), pathWithoutExtension(), removeEscapedCharacters(), validateFormat(), validateFormatComplexity()

### Community 11 - "Natural Language Date Parsing"
Cohesion: 0.28
Nodes (3): getRelativeDate(), isMetaPressed(), NLDNavigator

### Community 16 - "Search Suggestion Helpers"
Cohesion: 0.67
Nodes (3): FileSuggest, FolderSuggest, TextInputSuggest

### Community 17 - "getDailyNotesPlugin"
Cohesion: 0.67
Nodes (3): getDailyNotesPlugin, getLegacyDailyNoteSettings, hasLegacyDailyNoteSettings

### Community 18 - "Timeline Component"
Cohesion: 0.67
Nodes (3): TimelineManager, RelativeIcon, Timeline

## Knowledge Gaps
- **125 isolated node(s):** `SUPPRESSED`, `sveltePreprocessOptions`, `buildOptions`, `IDisplayConfig`, `LegacyConfig` (+120 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PeriodicNotesPlugin` connect `Daily Notes Legacy Support` to `Date & Config Utilities`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `PeriodicNotesCache` connect `Periodic Notes Cache Engine` to `Date & Config Utilities`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `CalendarView` connect `Obsidian View Life Cycle` to `Date & Config Utilities`, `App Integration & Templates`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `SUPPRESSED`, `sveltePreprocessOptions`, `buildOptions` to the rest of the system?**
  _125 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Date & Config Utilities` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Settings UI & Localization` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Calendar UI & Word Count` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._