import moment from "moment";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { overrideGlobalMomentWeekStart } from "./localization";

// moment's built-in "en" week spec; the global locale is restored to it after each test.
const EN_WEEK = { dow: 0, doy: 6 };

function resetGlobalState() {
  moment.updateLocale("en", { week: EN_WEEK });
  delete (window as Partial<Window>)._bundledLocaleWeekSpec;
}

beforeEach(resetGlobalState);
afterEach(resetGlobalState);

describe("overrideGlobalMomentWeekStart", () => {
  it("starts the week on the chosen day", () => {
    overrideGlobalMomentWeekStart("monday");

    expect(moment.localeData().firstDayOfWeek()).toBe(1);
  });

  it("keeps the locale's day-of-year rule when overriding the first day", () => {
    overrideGlobalMomentWeekStart("friday");

    expect(moment.localeData().firstDayOfWeek()).toBe(5);
    expect(moment.localeData().firstDayOfYear()).toBe(EN_WEEK.doy);
  });

  it("restores the locale's own week start with 'locale'", () => {
    overrideGlobalMomentWeekStart("monday");
    overrideGlobalMomentWeekStart("locale");

    expect(moment.localeData().firstDayOfWeek()).toBe(EN_WEEK.dow);
    expect(moment.localeData().firstDayOfYear()).toBe(EN_WEEK.doy);
  });

  it("remembers the original spec across several overrides", () => {
    overrideGlobalMomentWeekStart("monday");
    overrideGlobalMomentWeekStart("saturday");
    overrideGlobalMomentWeekStart("locale");

    expect(moment.localeData().firstDayOfWeek()).toBe(EN_WEEK.dow);
  });

  it("saves the original spec once, as plain numbers", () => {
    overrideGlobalMomentWeekStart("monday");
    overrideGlobalMomentWeekStart("tuesday");

    expect(window._bundledLocaleWeekSpec).toEqual(EN_WEEK);
  });
});
