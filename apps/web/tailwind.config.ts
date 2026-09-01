import uiPreset from "@orbix/ui/tailwind.config";
import type { Config } from "tailwindcss";

const config: Config = {
  presets: [uiPreset],
  content: [
    "./app/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};

export default config;
