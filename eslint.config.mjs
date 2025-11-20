import globals from "globals";
import lit from "eslint-plugin-lit";
import wc from "eslint-plugin-wc";
import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
        chrome: "readonly"
      },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module"
      }
    },
    plugins: {
      lit,
      wc
    },
    rules: {
      ...lit.configs.recommended.rules,
      ...wc.configs.recommended.rules,
      "no-unused-vars": "warn",
      "no-undef": "error"
    }
  },
  {
    files: ["webpack.config.js", "src/common/config.js", "src/common/lit-dev-warn-suppressor.js"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  {
    ignores: ["dist/", "node_modules/"]
  }
];
