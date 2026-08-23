import next from "eslint-config-next";

export default [
  ...next,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "*.config.*",
      "eslint.config.*",
      "next-env.d.ts"
    ]
  }
];

