/**
 * Example 02 — Code Formatter spec
 *
 * Tests `createCodeFormatter()` in isolation.
 *
 * Mocking strategy
 * ────────────────
 *   - `pi.events.on / emit`         → captured in a local Map so tests can
 *                                     replay panel events via `emitChange()`
 *   - `getExtensionSetting`         → controls what individual `get()` calls see
 *   - `setExtensionSetting`         → lets us assert storage writes
 *   - `getAllSettingsForExtension`  → controls what `getAll()` / `buildConfig()` sees
 *
 * Covers
 * ──────
 *   isReady()         — depends on the `enabled` boolean
 *   buildConfig()     — assembles a typed config; parses numeric text fields
 *   shouldFormat()    — glob ignore list + enabled guard
 *   onConfigChange()  — fires for every one of the ten tracked keys
 *   settings.set()    — section dot-notation keys written to storage
 *   settings.getAll() — full typed snapshot
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCodeFormatter, schema } from "./extension.ts";

// ─── Mock: storage ────────────────────────────────────────────────────────────

vi.mock("@axnic/pi-extension-settings/src/core/storage", () => ({
  getExtensionSetting: vi.fn(),
  setExtensionSetting: vi.fn(),
  getAllSettingsForExtension: vi.fn(),
}));

import {
  getAllSettingsForExtension,
  getExtensionSetting,
  setExtensionSetting,
} from "@axnic/pi-extension-settings/src/core/storage";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePi() {
  const listeners = new Map<string, Array<(data: unknown) => void>>();

  return {
    events: {
      on: vi.fn((event: string, cb: (data: unknown) => void) => {
        const bucket = listeners.get(event) ?? [];
        bucket.push(cb);
        listeners.set(event, bucket);
      }),
      emit: vi.fn((event: string, data?: unknown) => {
        for (const cb of listeners.get(event) ?? []) cb(data!);
      }),
    },
    triggerEvent(event: string, data?: unknown) {
      for (const cb of listeners.get(event) ?? []) cb(data!);
    },
  };
}

/** Simulate the settings panel saving a change for "code-formatter". */
function emitChange(pi: ReturnType<typeof makePi>, key: string, value: string) {
  vi.mocked(getExtensionSetting).mockImplementation((_, k) =>
    k === key ? value : undefined,
  );
  pi.triggerEvent(`pi-extension-settings:code-formatter:changed`, { key });
}

/**
 * Build a full storage snapshot from explicit overrides + schema defaults.
 * Used to drive `getAllSettingsForExtension` in `buildConfig()` tests.
 */
function makeSnapshot(
  overrides: Record<string, string> = {},
): Record<string, string> {
  return {
    parser: "prettier",
    enabled: "true",
    formatOnSave: "true",
    "formatting.indentStyle": "spaces",
    "formatting.indentWidth": "2",
    "formatting.lineWidth": "80",
    "formatting.semicolons": "always",
    "formatting.singleQuote": "false",
    "formatting.trailingComma": "all",
    ignore: JSON.stringify([
      { pattern: "node_modules/**" },
      { pattern: "dist/**" },
    ]),
    ...overrides,
  };
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe("CodeFormatter — createCodeFormatter()", () => {
  let pi: ReturnType<typeof makePi>;
  let formatter: ReturnType<typeof createCodeFormatter>;

  beforeEach(() => {
    vi.clearAllMocks();
    pi = makePi();
    formatter = createCodeFormatter(pi as any);
  });

  // ── pi event wiring ──────────────────────────────────────────────────────────

  describe("pi event wiring", () => {
    it("registers a listener for pi-extension-settings:ready", () => {
      expect(pi.events.on).toHaveBeenCalledWith(
        "pi-extension-settings:ready",
        expect.any(Function),
      );
    });

    it("registers a listener for pi-extension-settings:code-formatter:changed", () => {
      expect(pi.events.on).toHaveBeenCalledWith(
        "pi-extension-settings:code-formatter:changed",
        expect.any(Function),
      );
    });

    it("emits pi-extension-settings:register with the schema when ready fires", () => {
      pi.triggerEvent("pi-extension-settings:ready");

      expect(pi.events.emit).toHaveBeenCalledWith(
        "pi-extension-settings:register",
        {
          extension: "code-formatter",
          nodes: schema,
        },
      );
    });
  });

  // ── isReady() ────────────────────────────────────────────────────────────────

  describe("isReady()", () => {
    it("returns true when enabled is the default (true)", () => {
      vi.mocked(getExtensionSetting).mockReturnValue(undefined);
      expect(formatter.isReady()).toBe(true);
    });

    it("returns true when enabled is stored as 'true'", () => {
      vi.mocked(getExtensionSetting).mockReturnValue("true");
      expect(formatter.isReady()).toBe(true);
    });

    it("returns false when enabled is stored as 'false'", () => {
      vi.mocked(getExtensionSetting).mockReturnValue("false");
      expect(formatter.isReady()).toBe(false);
    });

    it("reads the 'enabled' key from the 'code-formatter' extension", () => {
      vi.mocked(getExtensionSetting).mockReturnValue(undefined);
      formatter.isReady();
      expect(getExtensionSetting).toHaveBeenCalledWith(
        "code-formatter",
        "enabled",
      );
    });
  });

  // ── buildConfig() ────────────────────────────────────────────────────────────

  describe("buildConfig()", () => {
    it("returns all default values when storage is empty", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue({});

      const config = formatter.buildConfig();

      expect(config.parser).toBe("prettier");
      expect(config.indentStyle).toBe("spaces");
      expect(config.indentWidth).toBe(2);
      expect(config.lineWidth).toBe(80);
      expect(config.semicolons).toBe("always");
      expect(config.singleQuote).toBe(false);
      expect(config.trailingComma).toBe("all");
    });

    it("parses indentWidth from string to number", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ "formatting.indentWidth": "4" }),
      );
      expect(formatter.buildConfig().indentWidth).toBe(4);
      expect(typeof formatter.buildConfig().indentWidth).toBe("number");
    });

    it("parses lineWidth from string to number", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ "formatting.lineWidth": "120" }),
      );
      expect(formatter.buildConfig().lineWidth).toBe(120);
    });

    it("reflects a stored parser override", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ parser: "biome" }),
      );
      expect(formatter.buildConfig().parser).toBe("biome");
    });

    it("reflects stored formatting.indentStyle = tabs", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ "formatting.indentStyle": "tabs" }),
      );
      expect(formatter.buildConfig().indentStyle).toBe("tabs");
    });

    it("reflects stored formatting.semicolons = never", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ "formatting.semicolons": "never" }),
      );
      expect(formatter.buildConfig().semicolons).toBe("never");
    });

    it("reflects stored formatting.singleQuote = true", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ "formatting.singleQuote": "true" }),
      );
      expect(formatter.buildConfig().singleQuote).toBe(true);
    });

    it("reflects stored formatting.trailingComma = es5", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ "formatting.trailingComma": "es5" }),
      );
      expect(formatter.buildConfig().trailingComma).toBe("es5");
    });

    it("calls getAllSettingsForExtension with 'code-formatter'", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue({});
      formatter.buildConfig();
      expect(getAllSettingsForExtension).toHaveBeenCalledWith("code-formatter");
    });

    it("re-reads settings on every call — no stale cache", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ parser: "biome" }),
      );
      expect(formatter.buildConfig().parser).toBe("biome");

      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ parser: "dprint" }),
      );
      expect(formatter.buildConfig().parser).toBe("dprint");
    });
  });

  // ── shouldFormat() ───────────────────────────────────────────────────────────

  describe("shouldFormat()", () => {
    it("returns true for a normal source file when no ignore patterns match", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) => {
        if (key === "enabled") return "true";
        if (key === "ignore") return JSON.stringify([{ pattern: "dist/**" }]);
        return undefined;
      });
      expect(formatter.shouldFormat("src/components/Button.tsx")).toBe(true);
    });

    it("returns false when the file matches an exact ignore pattern", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) => {
        if (key === "enabled") return "true";
        if (key === "ignore")
          return JSON.stringify([{ pattern: "src/generated.ts" }]);
        return undefined;
      });
      expect(formatter.shouldFormat("src/generated.ts")).toBe(false);
    });

    it("returns false for node_modules/** (default ignore list)", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) => {
        if (key === "enabled") return "true";
        if (key === "ignore")
          return JSON.stringify([
            { pattern: "node_modules/**" },
            { pattern: "dist/**" },
          ]);
        return undefined;
      });
      expect(formatter.shouldFormat("node_modules/lodash/index.js")).toBe(
        false,
      );
    });

    it("returns false for dist/** (default ignore list)", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) => {
        if (key === "enabled") return "true";
        if (key === "ignore")
          return JSON.stringify([
            { pattern: "node_modules/**" },
            { pattern: "dist/**" },
          ]);
        return undefined;
      });
      expect(formatter.shouldFormat("dist/bundle.js")).toBe(false);
    });

    it("returns false when enabled is false, regardless of the path", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) => {
        if (key === "enabled") return "false";
        if (key === "ignore") return JSON.stringify([]);
        return undefined;
      });
      // A totally clean path — would normally be formatted
      expect(formatter.shouldFormat("src/index.ts")).toBe(false);
    });

    it("returns true when the ignore list is empty", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) => {
        if (key === "enabled") return "true";
        if (key === "ignore") return JSON.stringify([]);
        return undefined;
      });
      expect(formatter.shouldFormat("anything/at/all.ts")).toBe(true);
    });

    it("handles a wildcard pattern that matches only a single segment", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) => {
        if (key === "enabled") return "true";
        if (key === "ignore")
          return JSON.stringify([{ pattern: "*.config.js" }]);
        return undefined;
      });
      expect(formatter.shouldFormat("prettier.config.js")).toBe(false);
      expect(formatter.shouldFormat("src/prettier.config.js")).toBe(true); // deeper path → no match
    });

    it("multiple patterns: returns false when any one matches", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) => {
        if (key === "enabled") return "true";
        if (key === "ignore")
          return JSON.stringify([
            { pattern: "build/**" },
            { pattern: "coverage/**" },
            { pattern: "**/*.min.js" },
          ]);
        return undefined;
      });
      expect(formatter.shouldFormat("coverage/lcov-report/index.html")).toBe(
        false,
      );
      expect(formatter.shouldFormat("vendor/jquery.min.js")).toBe(false);
      expect(formatter.shouldFormat("src/app.ts")).toBe(true);
    });
  });

  // ── settings.set() with section dot-notation keys ────────────────────────────

  describe("settings.set() — section dot-notation keys", () => {
    it("writes 'parser' directly (top-level key)", () => {
      formatter.settings.set("parser", "biome");
      expect(setExtensionSetting).toHaveBeenCalledWith(
        "code-formatter",
        "parser",
        "biome",
      );
    });

    it("writes 'enabled' as a serialized boolean string", () => {
      formatter.settings.set("enabled", false);
      expect(setExtensionSetting).toHaveBeenCalledWith(
        "code-formatter",
        "enabled",
        "false",
      );
    });

    it("writes 'formatting.indentStyle' with the dotted section key", () => {
      formatter.settings.set("formatting.indentStyle", "tabs");
      expect(setExtensionSetting).toHaveBeenCalledWith(
        "code-formatter",
        "formatting.indentStyle",
        "tabs",
      );
    });

    it("writes 'formatting.indentWidth' as a plain string (not a number)", () => {
      formatter.settings.set("formatting.indentWidth", "4");
      expect(setExtensionSetting).toHaveBeenCalledWith(
        "code-formatter",
        "formatting.indentWidth",
        "4",
      );
    });

    it("writes 'formatting.singleQuote' serialized as 'true'", () => {
      formatter.settings.set("formatting.singleQuote", true);
      expect(setExtensionSetting).toHaveBeenCalledWith(
        "code-formatter",
        "formatting.singleQuote",
        "true",
      );
    });

    it("writes the ignore list as a JSON string", () => {
      const patterns = [{ pattern: "build/**" }, { pattern: ".cache/**" }];
      formatter.settings.set("ignore", patterns);
      expect(setExtensionSetting).toHaveBeenCalledWith(
        "code-formatter",
        "ignore",
        JSON.stringify(patterns),
      );
    });
  });

  // ── onConfigChange() ─────────────────────────────────────────────────────────

  describe("onConfigChange()", () => {
    it("fires when 'parser' changes via settings.set()", () => {
      const cb = vi.fn();
      formatter.onConfigChange(cb);
      formatter.settings.set("parser", "dprint");
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("fires when 'enabled' changes via settings.set()", () => {
      const cb = vi.fn();
      formatter.onConfigChange(cb);
      formatter.settings.set("enabled", false);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("fires when 'formatOnSave' changes via settings.set()", () => {
      const cb = vi.fn();
      formatter.onConfigChange(cb);
      formatter.settings.set("formatOnSave", false);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("fires when 'formatting.indentStyle' changes via settings.set()", () => {
      const cb = vi.fn();
      formatter.onConfigChange(cb);
      formatter.settings.set("formatting.indentStyle", "tabs");
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("fires when 'formatting.lineWidth' changes via settings.set()", () => {
      const cb = vi.fn();
      formatter.onConfigChange(cb);
      formatter.settings.set("formatting.lineWidth", "100");
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("fires when 'formatting.semicolons' changes via settings.set()", () => {
      const cb = vi.fn();
      formatter.onConfigChange(cb);
      formatter.settings.set("formatting.semicolons", "never");
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("fires when 'ignore' list changes via settings.set()", () => {
      const cb = vi.fn();
      formatter.onConfigChange(cb);
      formatter.settings.set("ignore", [{ pattern: "out/**" }]);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("fires when the panel emits a change for 'formatting.trailingComma'", () => {
      const cb = vi.fn();
      formatter.onConfigChange(cb);
      emitChange(pi, "formatting.trailingComma", "none");
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("fires when the panel emits a change for 'formatting.singleQuote'", () => {
      const cb = vi.fn();
      formatter.onConfigChange(cb);
      emitChange(pi, "formatting.singleQuote", "true");
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("fires when the panel emits a change for 'parser'", () => {
      const cb = vi.fn();
      formatter.onConfigChange(cb);
      emitChange(pi, "parser", "biome");
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("multiple onConfigChange callbacks all fire on the same change", () => {
      const a = vi.fn();
      const b = vi.fn();
      formatter.onConfigChange(a);
      formatter.onConfigChange(b);
      formatter.settings.set("parser", "dprint");
      expect(a).toHaveBeenCalledTimes(1);
      expect(b).toHaveBeenCalledTimes(1);
    });

    it("does NOT fire for a change from a different extension", () => {
      const cb = vi.fn();
      formatter.onConfigChange(cb);
      pi.triggerEvent("pi-extension-settings:other-extension:changed", {
        key: "parser",
      });
      expect(cb).not.toHaveBeenCalled();
    });

    it("accumulates call count across multiple settings changes", () => {
      const cb = vi.fn();
      formatter.onConfigChange(cb);

      formatter.settings.set("parser", "biome");
      formatter.settings.set("formatting.indentStyle", "tabs");
      formatter.settings.set("formatting.lineWidth", "120");
      emitChange(pi, "formatting.semicolons", "never");

      expect(cb).toHaveBeenCalledTimes(4);
    });
  });

  // ── settings.getAll() — full snapshot ────────────────────────────────────────

  describe("settings.getAll() — full snapshot", () => {
    it("returns all defaults when storage is empty", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue({});

      const all = formatter.settings.getAll();

      expect(all.parser).toBe("prettier");
      expect(all.enabled).toBe(true);
      expect(all.formatOnSave).toBe(true);
      expect(all["formatting.indentStyle"]).toBe("spaces");
      expect(all["formatting.indentWidth"]).toBe(2); // number node → native number
      expect(all["formatting.lineWidth"]).toBe(80); // number node → native number
      expect(all["formatting.semicolons"]).toBe("always");
      expect(all["formatting.singleQuote"]).toBe(false);
      expect(all["formatting.trailingComma"]).toBe("all");
    });

    it("snapshot contains a parsed array for 'ignore' (default two patterns)", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue({});

      const all = formatter.settings.getAll();
      expect(Array.isArray(all.ignore)).toBe(true);
      expect(all.ignore as Array<{ pattern: string }>).toHaveLength(2);
    });

    it("snapshot has exactly 10 leaf keys", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue({});
      const keys = Object.keys(formatter.settings.getAll());
      expect(keys).toHaveLength(10);
    });

    it("merges stored values over defaults", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({
          parser: "biome",
          "formatting.indentStyle": "tabs",
          "formatting.singleQuote": "true",
        }),
      );

      const all = formatter.settings.getAll();
      expect(all.parser).toBe("biome");
      expect(all["formatting.indentStyle"]).toBe("tabs");
      expect(all["formatting.singleQuote"]).toBe(true); // parsed to boolean
    });

    it("parses the stored ignore JSON array back into an array of objects", () => {
      const patterns = [{ pattern: "build/**" }, { pattern: ".cache/**" }];
      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ ignore: JSON.stringify(patterns) }),
      );

      const all = formatter.settings.getAll();
      expect(all.ignore).toEqual(patterns);
    });

    it("calls getAllSettingsForExtension with 'code-formatter'", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue({});
      formatter.settings.getAll();
      expect(getAllSettingsForExtension).toHaveBeenCalledWith("code-formatter");
    });
  });
});
