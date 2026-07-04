import type { Moment } from "moment";
import type { TFile, Vault } from "obsidian";

import { NUM_MAX_DOTS } from "../constants";
import type { CalendarDot, DotSource } from "../ui/types";

function clamp(num: number, lo: number, hi: number): number {
  return Math.min(Math.max(lo, num), hi);
}

function getWordCount(text: string): number {
  // \p{L} matches any Unicode letter (handles CJK, Arabic, Devanagari, etc.)
  // \p{N} includes digits so "42nd" counts as one word
  // CJK characters each count as one word via the alternation
  const words = text.match(/[\p{L}\p{N}]+/gu) ?? [];
  return words.length;
}

export function createWordCountSource(
  vault: Vault,
  getWordsPerDot: () => number
): DotSource {
  return {
    async getDots(_date: Moment, note: TFile | null): Promise<CalendarDot[]> {
      const wordsPerDot = getWordsPerDot();
      if (!note || wordsPerDot <= 0) return [];
      const text = await vault.cachedRead(note);
      const count = getWordCount(text);
      const numDots = clamp(Math.floor(count / wordsPerDot), 1, NUM_MAX_DOTS);
      return Array.from({ length: numDots }, () => ({ isFilled: true }));
    },
  };
}
