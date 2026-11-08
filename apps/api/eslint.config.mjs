import tsParser from "@typescript-eslint/parser";

export default [
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: "module",
      },
    },
    ignores: ["dist/**", "node_modules/**"],
  },
];
