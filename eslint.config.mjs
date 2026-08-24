import next from "eslint-config-next";

export default [
  ...next,
  {
    ignores: [
      ".next/**",
      ".vercel/**",
      "node_modules/**",
      "*.config.*",
      "eslint.config.*",
      "next-env.d.ts"
    ]
  }
];

