import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import-x";
import obsidianmd from "eslint-plugin-obsidianmd";

export default [
  {
    ignores: ["node_modules/**", "main.js", ".yarn/**", "undefined.obsidian/**", "vitest.config.ts"],
  },
  {
    files: ["**/*.ts"],
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin,
      obsidianmd,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: "./tsconfig.json" },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [2, { args: "all", argsIgnorePattern: "^_" }],
      "no-control-regex": 0,
      "import/no-unresolved": 0,
      "import/order": [
        "error",
        {
          groups: [
            "external",
            "internal",
            ["sibling", "parent"],
            "index",
            "object",
          ],
          pathGroups: [{ pattern: "src/**", group: "internal", position: "before" }],
          pathGroupsExcludedImportTypes: [],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      // obsidianmd recommended rules
      "obsidianmd/no-nodejs-modules": "warn",
      "obsidianmd/commands/no-command-in-command-id": "warn",
      "obsidianmd/commands/no-command-in-command-name": "warn",
      "obsidianmd/commands/no-default-hotkeys": "warn",
      "obsidianmd/commands/no-plugin-id-in-command-id": "warn",
      "obsidianmd/commands/no-plugin-name-in-command-name": "warn",
      "obsidianmd/settings-tab/no-manual-html-headings": "error",
      "obsidianmd/settings-tab/no-problematic-settings-headings": "error",
      "obsidianmd/settings-tab/require-display": "warn",
      "obsidianmd/settings-tab/prefer-setting-definitions": "warn",
      "obsidianmd/settings-tab/prefer-update-over-display": "warn",
      "obsidianmd/settings-tab/no-deprecated-display": "warn",
      "obsidianmd/vault/iterate": "warn",
      "obsidianmd/detach-leaves": "error",
      "obsidianmd/editor-drop-paste": "warn",
      "obsidianmd/hardcoded-config-path": "warn",
      "obsidianmd/no-forbidden-elements": "error",
      "obsidianmd/no-global-this": "warn",
      "obsidianmd/no-sample-code": "error",
      "obsidianmd/no-tfile-tfolder-cast": "warn",
      "obsidianmd/no-static-styles-assignment": "error",
      "obsidianmd/object-assign": "warn",
      "obsidianmd/platform": "error",
      "obsidianmd/prefer-get-language": "warn",
      "obsidianmd/prefer-abstract-input-suggest": "warn",
      "obsidianmd/prefer-window-timers": "warn",
      "obsidianmd/prefer-active-doc": "off",
      "obsidianmd/regex-lookbehind": "error",
      "obsidianmd/sample-names": "error",
      "obsidianmd/validate-manifest": "warn",
      "obsidianmd/validate-license": "warn",
      "obsidianmd/ui/sentence-case": ["warn", { enforceCamelCaseLower: true }],
      "obsidianmd/no-plugin-as-component": "error",
      "obsidianmd/no-view-references-in-plugin": "error",
      "obsidianmd/no-unsupported-api": "error",
      "obsidianmd/prefer-create-el": "warn",
      "obsidianmd/prefer-file-manager-trash-file": "warn",
      "obsidianmd/prefer-instanceof": "warn",
    },
  },
];
