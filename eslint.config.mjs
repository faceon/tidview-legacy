import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import globals from "globals";
import tseslint from "typescript-eslint";

const nextConfig = nextPlugin.configs["core-web-vitals"] ?? {};
const nextFlatConfigs = Array.isArray(nextConfig)
  ? nextConfig
  : [nextConfig];

const tsRecommended = tseslint.configs.recommended.map((config) => ({
  ...config,
  files: config.files ?? ["**/*.ts", "**/*.tsx"],
}));

export default tseslint.config(
  {
    ignores: ["dist/**", ".next/**", "node_modules/**"],
  },
  js.configs.recommended,
  ...tsRecommended,
  ...nextFlatConfigs.map((config) => ({
    ...config,
    files: ["src/**/*.{ts,tsx,js,jsx}"],
  })),
  {
    files: [
      "src/background/**/*.js",
      "src/common/**/*.js",
      "src/portfolio/**/*.js",
      "chrome/**/*.js",
      "webpack.config.js",
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        chrome: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
    },
  },
);
