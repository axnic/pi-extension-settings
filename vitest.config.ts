import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/.trunk/**", "**/node_modules/**"],
  },
  resolve: {
    alias: {
      // Map the workspace package name to the repo root so that
      // `@axnic/pi-extension-settings/src/core/storage` resolves to the same
      // physical file as the relative `../../../src/core/storage` imports used
      // in test mocks.  Without this alias the two specifiers would be treated
      // as different modules and `vi.mock` would not intercept the import made
      // inside extension-settings.ts.
      "@axnic/pi-extension-settings": resolve(__dirname),
    },
  },
});
