import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@axnic/pi-extension-settings-sdk/hooks": path.resolve(
        __dirname,
        "sdk/src/hooks/index.ts",
      ),
      "@axnic/pi-extension-settings-sdk": path.resolve(
        __dirname,
        "sdk/index.ts",
      ),
    },
  },
  test: {
    exclude: ["**/.trunk/**", "**/node_modules/**"],
  },
});
