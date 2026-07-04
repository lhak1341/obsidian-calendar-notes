import type { Moment } from "moment";
import { addIcon, Plugin, TFile } from "obsidian";
import { get, writable, type Writable } from "svelte/store";

import { PeriodicNotesCache } from "./cache";
import { VIEW_TYPE_CALENDAR } from "./calendar/constants";
import { CalendarView } from "./calendar/view";
import { getConfig, getFormat } from "./calendarSet";
import { displayConfigs, getCommands } from "./commands";
import {
  calendarDayIcon,
  calendarMonthIcon,
  calendarWeekIcon,
  calendarQuarterIcon,
  calendarYearIcon,
} from "./icons";
import { showFileMenu } from "./modal";
import {
  type ISettings,
  PeriodicNotesSettingsTab,
  DEFAULT_SETTINGS,
  DEFAULT_PERIODIC_CONFIG,
} from "./settings";
import { initializeLocaleConfigOnce } from "./settings/localization";
import {
  findStartupNoteConfig,
  hasLegacyDailyNoteSettings,
} from "./settings/utils";
import { NLDNavigator } from "./switcher/navigator";
import TimelineManager from "./timeline/manager";
import {
  granularities,
  type Granularity,
  type IOpenOpts,
  type IPeriodicNoteController,
  type PeriodicConfig,
  type PeriodicNoteCachedMetadata,
} from "./types";
import {
  applyTemplateTransformations,
  getNoteCreationPath,
  getTemplateContents,
  isMetaPressed,
} from "./utils";

// obsidian-daily-notes-interface reads plugin.settings.daily/weekly/etc. as plain objects.
type LegacyConfig = PeriodicConfig & { template?: string };
type SettingsStore = Writable<ISettings> & {
  daily?: LegacyConfig;
  weekly?: LegacyConfig;
  monthly?: LegacyConfig;
  quarterly?: LegacyConfig;
  yearly?: LegacyConfig;
};

// Shape of the old calendarSets-based data.json (for migration)
interface LegacyCalendarSetData {
  id: string;
  day?: PeriodicConfig;
  week?: PeriodicConfig;
  month?: PeriodicConfig;
  quarter?: PeriodicConfig;
  year?: PeriodicConfig;
}

interface LegacyPeriodicitySettings {
  enabled: boolean;
  folder?: string;
  format?: string;
  template?: string;
}

interface LegacyPluginData {
  daily?: LegacyPeriodicitySettings;
  weekly?: LegacyPeriodicitySettings;
  monthly?: LegacyPeriodicitySettings;
  quarterly?: LegacyPeriodicitySettings;
  yearly?: LegacyPeriodicitySettings;
  calendarSets?: LegacyCalendarSetData[];
}

export default class PeriodicNotesPlugin extends Plugin implements IPeriodicNoteController {
  public settings!: SettingsStore;
  private ribbonEl: HTMLElement | null = null;

  private cache!: PeriodicNotesCache;
  private timelineManager!: TimelineManager;
  private settingsTab!: PeriodicNotesSettingsTab;

  unload(): void {
    this.settingsTab?.hide();
    this.timelineManager?.cleanup();
    super.unload();
  }

  async onload(): Promise<void> {
    addIcon("calendar-day", calendarDayIcon);
    addIcon("calendar-week", calendarWeekIcon);
    addIcon("calendar-month", calendarMonthIcon);
    addIcon("calendar-quarter", calendarQuarterIcon);
    addIcon("calendar-year", calendarYearIcon);

    this.registerView(VIEW_TYPE_CALENDAR, (leaf) => new CalendarView(leaf, this));

    this.settings = writable<ISettings>() as SettingsStore;
    this.addLegacySettingsCompat();
    await this.loadSettings();
    this.register(this.settings.subscribe(this.onUpdateSettings.bind(this)));

    initializeLocaleConfigOnce(this.app);

    this.ribbonEl = null;
    this.cache = new PeriodicNotesCache(this.app, this.settings);
    this.timelineManager = new TimelineManager(this.app, this, this.cache, this);

    this.openPeriodicNote = this.openPeriodicNote.bind(this);
    this.settingsTab = new PeriodicNotesSettingsTab(this.app, this);
    this.addSettingTab(this.settingsTab);

    this.configureRibbonIcons();
    this.configureCommands();

    this.addCommand({
      id: "show-date-switcher",
      name: "Show date switcher...",
      checkCallback: (checking: boolean) => {
        if (!this.app.plugins.getPlugin("nldates-obsidian")) {
          return false;
        }
        if (checking) {
          return !!this.app.workspace.activeLeaf;
        }
        new NLDNavigator(this.app, this).open();
      },
    });

    this.addCommand({
      id: "open-calendar",
      name: "Open calendar",
      callback: () => this.activateCalendarView(),
    });

    this.app.workspace.onLayoutReady(() => {
      const startupNoteConfig = findStartupNoteConfig(this.settings);
      if (startupNoteConfig) {
        this.openPeriodicNote(startupNoteConfig.granularity, window.moment());
      }
    });
  }

  private addLegacySettingsCompat(): void {
    // obsidian-daily-notes-interface reads plugin.settings.daily/weekly/monthly/quarterly/yearly
    const keyMap: Array<[string, Granularity]> = [
      ["daily", "day"],
      ["weekly", "week"],
      ["monthly", "month"],
      ["quarterly", "quarter"],
      ["yearly", "year"],
    ];
    for (const [legacyKey, granularity] of keyMap) {
      Object.defineProperty(this.settings, legacyKey, {
        get: (): LegacyConfig | undefined => {
          const s = get(this.settings);
          const config = s?.[granularity];
          return config ? { ...config, template: config.templatePath } : undefined;
        },
        enumerable: false,
        configurable: true,
      });
    }
  }

  private configureRibbonIcons() {
    this.ribbonEl?.detach();

    const activeGranularities = this.getActiveGranularities();
    if (activeGranularities.length) {
      const granularity = activeGranularities[0];
      const config = displayConfigs[granularity];
      this.ribbonEl = this.addRibbonIcon(
        `calendar-${granularity}`,
        config.labelOpenPresent,
        (e: MouseEvent) => {
          if (e.type !== "auxclick") {
            this.openPeriodicNote(granularity, window.moment(), {
              inNewSplit: isMetaPressed(e),
            });
          }
        }
      );
      this.registerDomEvent(this.ribbonEl, "contextmenu", (e: MouseEvent) => {
        e.preventDefault();
        showFileMenu(this, {
          x: e.pageX,
          y: e.pageY,
        });
      });
    }
  }

  private configureCommands() {
    const s = get(this.settings);

    // Remove disabled commands
    granularities
      .filter((granularity) => !s[granularity]?.enabled)
      .forEach((granularity: Granularity) => {
        getCommands(this.app, this, granularity).forEach((command) =>
          this.app.commands.removeCommand(`periodic-notes:${command.id}`)
        );
      });

    // Register enabled commands
    this.getActiveGranularities().forEach((granularity: Granularity) => {
      getCommands(this.app, this, granularity).forEach(this.addCommand.bind(this));
    });
  }

  async loadSettings(): Promise<void> {
    const savedData = (await this.loadData()) as LegacyPluginData & Partial<ISettings> | null;
    let settings: ISettings = Object.assign({}, DEFAULT_SETTINGS, savedData || {});

    // Migration 1: old calendarSets array → flat fields
    // Note: run BEFORE Object.assign so defaults don't mask real values
    if (savedData?.calendarSets?.length) {
      const set = savedData.calendarSets[0];
      for (const g of granularities) {
        if (set[g]) settings[g] = set[g];
      }
      // Remove the old keys to keep data.json clean on next save
      delete (settings as unknown as Record<string, unknown>).calendarSets;
      delete (settings as unknown as Record<string, unknown>).activeCalendarSet;
    }
    // Migration 2: very old daily/weekly/etc. format
    else if (
      savedData?.daily ||
      savedData?.weekly ||
      savedData?.monthly ||
      savedData?.quarterly ||
      savedData?.yearly
    ) {
      const migrateConfig = (src: LegacyPeriodicitySettings | undefined): PeriodicConfig => ({
        enabled: src?.enabled ?? false,
        format: src?.format || "",
        folder: src?.folder || "",
        openAtStartup: false,
        templatePath: src?.template,
      });
      if (savedData.daily) settings.day = migrateConfig(savedData.daily);
      if (savedData.weekly) settings.week = migrateConfig(savedData.weekly);
      if (savedData.monthly) settings.month = migrateConfig(savedData.monthly);
      if (savedData.quarterly) settings.quarter = migrateConfig(savedData.quarterly);
      if (savedData.yearly) settings.year = migrateConfig(savedData.yearly);
    }
    // Migration 3: very old Obsidian daily-notes plugin settings
    else if (!savedData?.day && hasLegacyDailyNoteSettings(this.app)) {
      settings.day = {
        ...DEFAULT_PERIODIC_CONFIG,
        enabled: true,
      };
    }

    this.settings.set(settings);
  }

  private async onUpdateSettings(newSettings: ISettings): Promise<void> {
    await this.saveData(newSettings);
    this.configureCommands();
    this.configureRibbonIcons();

    this.app.workspace.trigger("periodic-notes:settings-updated");
  }

  public async activateCalendarView(): Promise<void> {
    const { workspace } = this.app;
    const existing = workspace.getLeavesOfType(VIEW_TYPE_CALENDAR);
    if (existing.length > 0) {
      workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: VIEW_TYPE_CALENDAR, active: true });
      workspace.revealLeaf(leaf);
    }
  }

  public async createPeriodicNote(
    granularity: Granularity,
    date: Moment
  ): Promise<TFile> {
    const s = get(this.settings);
    const config = getConfig(s, granularity);
    const format = getFormat(s, granularity);
    const filename = date.format(format);
    const templateContents = await getTemplateContents(this.app, config.templatePath);
    const renderedContents = applyTemplateTransformations(
      filename,
      granularity,
      date,
      format,
      templateContents
    );
    const destPath = await getNoteCreationPath(this.app, filename, config);
    return this.app.vault.create(destPath, renderedContents);
  }

  public getPeriodicNote(granularity: Granularity, date: Moment): TFile | null {
    return this.cache.getPeriodicNote(granularity, date);
  }

  public getPeriodicNotes(
    granularity: Granularity,
    date: Moment,
    includeFinerGranularities = false
  ): PeriodicNoteCachedMetadata[] {
    return this.cache.getPeriodicNotes(granularity, date, includeFinerGranularities);
  }

  public isPeriodic(filePath: string, granularity?: Granularity): boolean {
    return this.cache.isPeriodic(filePath, granularity);
  }

  public findAdjacent(
    filePath: string,
    direction: "forwards" | "backwards"
  ): PeriodicNoteCachedMetadata | null {
    return this.cache.findAdjacent(filePath, direction);
  }

  public findInCache(filePath: string): PeriodicNoteCachedMetadata | null {
    return this.cache.find(filePath);
  }

  public async openPeriodicNote(
    granularity: Granularity,
    date: Moment,
    opts?: IOpenOpts
  ): Promise<void> {
    const { inNewSplit = false } = opts ?? {};
    const { workspace } = this.app;
    let file = this.cache.getPeriodicNote(granularity, date);
    if (!file) {
      file = await this.createPeriodicNote(granularity, date);
    }

    const leaf = inNewSplit ? workspace.getLeaf("split") : workspace.getLeaf(false);
    await leaf.openFile(file, { active: true });
  }

  public getActiveGranularities(): Granularity[] {
    const s = get(this.settings);
    return granularities.filter((g) => s[g]?.enabled);
  }

  public getActiveConfig(granularity: Granularity): PeriodicConfig {
    return getConfig(get(this.settings), granularity);
  }

  public getFormat(granularity: Granularity): string {
    return getFormat(get(this.settings), granularity);
  }
}
