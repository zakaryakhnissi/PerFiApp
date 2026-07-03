import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.expo/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Plain-JS tool configs and scripts (jest.config.js, check-keys.js, …) run in Node/CommonJS.
    files: ["**/*.js", "**/*.cjs"],
    languageOptions: {
      globals: {
        module: "readonly",
        require: "readonly",
        process: "readonly",
        console: "readonly",
        __dirname: "readonly",
        jest: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // Principle II guard (research.md R2): money math is integer-only. Outside
    // packages/money, code must not parse floats or write fractional literals —
    // all cent/rate arithmetic goes through @perfiapp/money.
    files: ["apps/**/src/**/*.ts", "apps/**/src/**/*.tsx", "packages/recommender/src/**/*.ts", "packages/kb-schema/src/**/*.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        { object: "Number", property: "parseFloat", message: "Money math is integer-only; use @perfiapp/money." },
      ],
      "no-restricted-globals": [
        "error",
        { name: "parseFloat", message: "Money math is integer-only; use @perfiapp/money." },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[raw=/^\\d+\\.\\d+$/]",
          message: "Fractional numeric literals are banned near money code; represent values in integer minor units.",
        },
      ],
    },
  },
);
