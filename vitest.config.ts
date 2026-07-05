/// <reference types="node" />
import { defineConfig } from "vitest/config";

import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    restoreMocks: true,
  },
  resolve: {
    alias: {
      obsidian: path.resolve(__dirname, "src/__mocks__/obsidian.ts"),
      src: path.resolve(__dirname, "src"),
    },
  },
});
