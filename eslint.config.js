import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";

export default [
  {
    ignores: ["node_modules/**", "main.js", ".yarn/**"],
  },
  {
    files: ["**/*.ts"],
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin,
    },
    languageOptions: {
      parser: tsParser,
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
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },
];
