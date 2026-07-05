import moment from "moment";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { openWithConfirm } from "./openWithConfirm";

const makePlugin = (noteExists: boolean) => ({
  getPeriodicNote: vi.fn().mockReturnValue(noteExists ? {} : null),
  openPeriodicNote: vi.fn().mockResolvedValue(undefined),
});

describe("openWithConfirm", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm");
  });

  it("opens immediately without a dialog when the note already exists", async () => {
    const plugin = makePlugin(true);
    const result = await openWithConfirm("day", moment(), plugin, true);
    expect(window.confirm).not.toHaveBeenCalled();
    expect(plugin.openPeriodicNote).toHaveBeenCalledOnce();
    expect(result).toBe(true);
  });

  it("opens when the note is absent and the user confirms", async () => {
    vi.mocked(window.confirm).mockReturnValue(true);
    const plugin = makePlugin(false);
    const result = await openWithConfirm("day", moment(), plugin, true);
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(plugin.openPeriodicNote).toHaveBeenCalledOnce();
    expect(result).toBe(true);
  });

  it("does not open when the note is absent and the user cancels", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    const plugin = makePlugin(false);
    const result = await openWithConfirm("day", moment(), plugin, true);
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(plugin.openPeriodicNote).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("skips the dialog when shouldConfirm is false, even for a new note", async () => {
    const plugin = makePlugin(false);
    const result = await openWithConfirm("day", moment(), plugin, false);
    expect(window.confirm).not.toHaveBeenCalled();
    expect(plugin.openPeriodicNote).toHaveBeenCalledOnce();
    expect(result).toBe(true);
  });

  it("uses the correct format label per granularity in the dialog message", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    const date = moment("2026-07-05");

    await openWithConfirm("day", date, makePlugin(false), true);
    expect(window.confirm).toHaveBeenCalledWith("Create day note for 2026-07-05?");

    await openWithConfirm("week", date, makePlugin(false), true);
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining("Create week note for W")
    );

    await openWithConfirm("month", date, makePlugin(false), true);
    expect(window.confirm).toHaveBeenCalledWith("Create month note for July 2026?");
  });
});
