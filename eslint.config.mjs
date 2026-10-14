// Configuration ESLint 9 (flat config) — règles raisonnables pour un
// monorepo TypeScript + React. Le lint fait partie de verifier.bat.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/release/**",
      "**/renderer-dist/**",
      "**/electron-dist/**",
      "**/node_modules/**",
      "**/*.cjs",
      "**/*.mjs",
      "packages/*/dist/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "off",
      "no-console": "off",
      eqeqeq: ["error", "smart"],
    },
  },
  {
    files: ["apps/*/electron/**/*.ts"],
    rules: {
      // Le processus principal utilise console via son logger dédié.
      "no-console": "off",
    },
  },
);
