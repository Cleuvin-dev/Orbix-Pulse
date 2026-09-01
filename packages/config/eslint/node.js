import { baseConfig } from "./base.js";

/** @type {import("eslint").Linter.Config[]} */
export const nodeConfig = [
  ...baseConfig,
  {
    rules: {
      "@typescript-eslint/no-extraneous-class": "off",
    },
  },
];

export default nodeConfig;
