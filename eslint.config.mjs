import nextPlugin from "@next/eslint-plugin-next";
import js from "@eslint/js";

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "scripts/**", "next.config.js", "next-env.d.ts"],
  },
  js.configs.recommended,
  {
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];

export default eslintConfig;
