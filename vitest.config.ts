import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/.trunk/**", "**/node_modules/**"],
  },
});
