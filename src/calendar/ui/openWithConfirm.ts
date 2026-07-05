import type { Moment } from "moment";

import { HUMANIZE_FORMAT } from "../../constants";
import type { Granularity, IOpenOpts, INoteOps } from "../../types";

type ConfirmOps = Pick<INoteOps, "getPeriodicNote" | "openPeriodicNote">;

export async function openWithConfirm(
  granularity: Granularity,
  date: Moment,
  plugin: ConfirmOps,
  shouldConfirm: boolean,
  opts?: IOpenOpts
): Promise<boolean> {
  const exists = !!plugin.getPeriodicNote(granularity, date);
  if (!exists && shouldConfirm) {
    const label = date.format(HUMANIZE_FORMAT[granularity]);
    const ok = window.confirm(`Create ${granularity} note for ${label}?`);
    if (!ok) return false;
  }
  await plugin.openPeriodicNote(granularity, date, opts);
  return true;
}
