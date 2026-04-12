/**
 * Example 02 — Code Formatter extension
 *
 * A realistic extension that manages code formatting settings. It demonstrates:
 *
 *   - `S.section()`  → grouping related settings under named sections
 *   - `S.list()`     → a user-managed list of glob patterns to ignore
 *   - `S.enum()`     → fixed-choice values (parser, indent style)
 *   - `S.number()`   → numeric fields with range validation
 *   - `S.boolean()`  → simple toggles
 *   - `v.integer()`  → validate that a number has no fractional part
 *   - `v.range()`    → validate a number is within a numeric range
 *   - `InferConfig`  → inferred config type used in the public API
 *
 * Public API
 * ──────────
 *   createCodeFormatter(pi)  → factory; returns the formatter object
 *   formatter.buildConfig()  → assemble a FormatterConfig from current settings
 *   formatter.shouldFormat(filePath)
 *                            → true when the file is not on the ignore list
 *   formatter.isReady()      → true when at least one file extension is targeted
 *   formatter.onConfigChange(cb)
 *                            → subscribe to any setting change
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { ExtensionSettings, S } from "../../index.ts";
import { v } from "../../src/hooks/index.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

export const schema = S.settings({
  /** Which formatter engine to use. */
  parser: S.enum({
    tooltip: "Formatter engine",
    description: "The underlying formatter that will process your files.",
    default: "prettier",
    values: [
      { value: "prettier", label: "Prettier" },
      { value: "biome", label: "Biome" },
      { value: "dprint", label: "dprint" },
    ],
  }),

  /** Top-level toggle — disable everything without wiping settings. */
  enabled: S.boolean({
    tooltip: "Enable formatter",
    default: true,
  }),

  /** Save-hook toggle. */
  formatOnSave: S.boolean({
    tooltip: "Format on save",
    default: true,
  }),

  formatting: S.section({
    tooltip: "Formatting rules",
    description:
      "Low-level formatting options passed to the underlying engine.",
    children: {
      indentStyle: S.enum({
        tooltip: "Indent style",
        default: "spaces",
        values: [
          { value: "spaces", label: "Spaces" },
          { value: "tabs", label: "Tabs" },
        ],
      }),

      indentWidth: S.number({
        tooltip: "Indent width (spaces)",
        description:
          "Number of spaces per indent level. Ignored when using tabs.",
        default: 2,
        validation: v.all(v.integer(), v.range({ min: 1, max: 8 })),
      }),

      lineWidth: S.number({
        tooltip: "Print width (characters)",
        description:
          "Soft wrap column. Lines longer than this value will be wrapped.",
        default: 80,
        validation: v.all(v.integer(), v.range({ min: 40, max: 200 })),
      }),

      semicolons: S.enum({
        tooltip: "Semicolons",
        default: "always",
        values: [
          { value: "always", label: "Always" },
          { value: "never", label: "Never" },
          { value: "auto", label: "Auto" },
        ],
      }),

      singleQuote: S.boolean({
        tooltip: "Single quotes",
        description:
          "Use single quotes instead of double quotes where possible.",
        default: false,
      }),

      trailingComma: S.enum({
        tooltip: "Trailing commas",
        default: "all",
        values: [
          { value: "none", label: "None" },
          { value: "es5", label: "ES5" },
          { value: "all", label: "All" },
        ],
      }),
    },
  }),

  /** Glob patterns for paths the formatter should skip. */
  ignore: S.list({
    tooltip: "Ignored paths",
    description:
      "Glob patterns for files and directories to skip. Supports `*`, `**`, and `?`.",
    addLabel: "Add pattern",
    default: [{ pattern: "node_modules/**" }, { pattern: "dist/**" }],
    items: S.struct({
      properties: {
        pattern: S.text({ tooltip: "Glob pattern", default: "" }),
      },
    }),
  }),
});

export type FormatterConfig = {
  parser: string;
  indentStyle: "spaces" | "tabs";
  indentWidth: number;
  lineWidth: number;
  semicolons: "always" | "never" | "auto";
  singleQuote: boolean;
  trailingComma: "none" | "es5" | "all";
};

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createCodeFormatter(pi: ExtensionAPI) {
  const settings = new ExtensionSettings(pi, "code-formatter", schema);

  return {
    settings,

    /**
     * Returns true when formatting is enabled and the formatter is fully
     * initialised (i.e. at least one ignore pattern or a non-default parser
     * is present — in practice just checks the `enabled` flag here).
     */
    isReady(): boolean {
      return settings.get("enabled");
    },

    /**
     * Assemble a `FormatterConfig` from the current settings snapshot.
     * Parses numeric text fields to actual numbers.
     */
    buildConfig(): FormatterConfig {
      const all = settings.getAll();
      return {
        parser: all.parser,
        indentStyle: all["formatting.indentStyle"] as "spaces" | "tabs",
        indentWidth: all["formatting.indentWidth"] as number,
        lineWidth: all["formatting.lineWidth"] as number,
        semicolons: all["formatting.semicolons"] as "always" | "never" | "auto",
        singleQuote: all["formatting.singleQuote"] as boolean,
        trailingComma: all["formatting.trailingComma"] as
          | "none"
          | "es5"
          | "all",
      };
    },

    /**
     * Returns `true` when the given file path does NOT match any of the
     * ignore patterns. Uses a simple prefix / glob-lite check:
     * `*` matches any segment, `**` matches any path prefix.
     */
    shouldFormat(filePath: string): boolean {
      if (!settings.get("enabled")) return false;

      const patterns = settings.get("ignore") as Array<{ pattern: string }>;

      for (const { pattern } of patterns) {
        if (matchesGlob(pattern, filePath)) return false;
      }

      return true;
    },

    /**
     * Subscribe to any setting change. The callback receives no arguments —
     * callers should re-read the full config via `buildConfig()`.
     */
    onConfigChange(cb: () => void): void {
      const keys = [
        "parser",
        "enabled",
        "formatOnSave",
        "formatting.indentStyle",
        "formatting.indentWidth",
        "formatting.lineWidth",
        "formatting.semicolons",
        "formatting.singleQuote",
        "formatting.trailingComma",
        "ignore",
      ] as const;

      for (const key of keys) {
        settings.onChange(key, cb);
      }
    },
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Minimal glob matcher that handles the patterns typically found in ignore
 * lists: exact paths, `*` (single segment wildcard), `**` (multi-segment).
 *
 * Not a full glob implementation — sufficient for the examples.
 */
function matchesGlob(pattern: string, filePath: string): boolean {
  // Normalise separators
  const p = pattern.replace(/\\/g, "/");
  const f = filePath.replace(/\\/g, "/");

  // Exact match
  if (p === f) return true;

  // Convert glob to a regex:
  //   **  → matches any number of path segments (including none)
  //   *   → matches anything except a path separator
  //   .   → literal dot
  const regexStr = p
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "§DOUBLE§")
    .replace(/\*/g, "[^/]*")
    .replace(/§DOUBLE§/g, ".*");

  return new RegExp(`^${regexStr}$`).test(f);
}
