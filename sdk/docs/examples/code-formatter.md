# Example: Code Formatter

**Source:** `sdk/examples/02-code-formatter/extension.ts`

A settings integration for a code formatting extension. This example introduces `S.section` for grouping related settings, `S.list` with `S.struct` for user-managed ignore patterns, and `getAll()` for building a config snapshot.

**Concepts demonstrated:** `S.section`, `S.list`, `S.struct`, `v.integer`, `getAll()`, dot-notation keys

---

## Schema overview

```text
schema
├── parser          (Enum)      — formatter engine
├── enabled         (Boolean)   — master on/off toggle
├── formatOnSave    (Boolean)   — save-hook toggle
├── formatting      (Section)
│   ├── indentStyle (Enum)      — spaces or tabs
│   ├── indentWidth (Number)    — integer 1–8
│   ├── lineWidth   (Number)    — integer 40–200
│   ├── semicolons  (Enum)      — always / never / auto
│   ├── singleQuote (Boolean)   — use single quotes
│   └── trailingComma (Enum)    — none / es5 / all
└── ignore          (List)      — glob patterns to skip
    └── items: { pattern: Text }
```

---

## Imports

```ts
import { S, ExtensionSettings } from "pi-extension-settings/sdk";
import { v } from "pi-extension-settings/sdk/hooks";
```

---

## Sections

`S.section` groups related settings under a collapsible header. Children are accessed with dot notation:

```ts
formatting: S.section({
  tooltip: "Formatting rules",
  description: "Low-level formatting options passed to the underlying engine.",
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
      default: 2,
      validation: v.all(v.integer(), v.range({ min: 1, max: 8 })),
    }),
    lineWidth: S.number({
      tooltip: "Print width (characters)",
      default: 80,
      validation: v.all(v.integer(), v.range({ min: 40, max: 200 })),
    }),
    // ...
  },
});
```

Accessing nested keys:

```ts
settings.get("formatting.indentStyle"); // "spaces" | "tabs"
settings.get("formatting.indentWidth"); // 2 (number)
settings.get("formatting.lineWidth"); // 80 (number)
```

> `Number` nodes return a native `number` directly — no `parseInt()` needed. Use `S.number()` for any semantically numeric setting.

---

## List with Struct

`S.list` creates a growable table of structured rows. `S.struct` defines the shape of each row:

```ts
ignore: S.list({
  tooltip: "Ignored paths",
  description: "Glob patterns for files and directories to skip.",
  addLabel: "Add pattern",
  default: [{ pattern: "node_modules/**" }, { pattern: "dist/**" }],
  items: S.struct({
    properties: {
      pattern: S.text({ tooltip: "Glob pattern", default: "" }),
    },
  }),
});
```

Reading the list:

```ts
const patterns = settings.get("ignore") as Array<{ pattern: string }>;
// [{ pattern: "node_modules/**" }, { pattern: "dist/**" }]
```

---

## Numeric validation with `v.integer()` and `v.range()`

`v.integer()` validates that a `Number` node's value has no fractional part. Combine it with `v.range()` to enforce bounds:

```ts
S.number({
  tooltip: "Indent width (spaces)",
  default: 2,
  validation: v.all(v.integer(), v.range({ min: 1, max: 8 })),
  // Accepts: 1, 2, 4, 8
  // Rejects: 0, 9, 2.5
});
```

---

## `buildConfig()` — reading the full snapshot

`getAll()` returns a typed snapshot of all settings at once. The `buildConfig()` method uses it to assemble a typed `FormatterConfig`:

```ts
function buildConfig(): FormatterConfig {
  const all = settings.getAll();
  return {
    parser: all.parser,
    indentStyle: all["formatting.indentStyle"] as "spaces" | "tabs",
    indentWidth: all["formatting.indentWidth"],
    lineWidth: all["formatting.lineWidth"],
    semicolons: all["formatting.semicolons"] as "always" | "never" | "auto",
    singleQuote: all["formatting.singleQuote"] as boolean,
    trailingComma: all["formatting.trailingComma"] as "none" | "es5" | "all",
  };
}
```

Notice that `getAll()` returns all keys including nested ones using dot notation (e.g. `"formatting.indentStyle"`).

---

## `shouldFormat(filePath)` — using List values

```ts
function shouldFormat(filePath: string): boolean {
  if (!settings.get("enabled")) return false;
  const patterns = settings.get("ignore") as Array<{ pattern: string }>;
  for (const { pattern } of patterns) {
    if (matchesGlob(pattern, filePath)) return false;
  }
  return true;
}
```

The `ignore` list is read fresh on every call, so changes made in the settings panel take effect on the next file save without restarting the extension.

---

## `onConfigChange()` — subscribing to all keys

```ts
function onConfigChange(cb: () => void): void {
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
}
```

A common pattern: subscribe to every key and let the caller re-read the full config via `buildConfig()` rather than passing individual values to the callback.

---

## Usage

```ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createCodeFormatter } from "./extension.ts";

export function activate(pi: ExtensionAPI) {
  const formatter = createCodeFormatter(pi);

  pi.onFileSave(async (filePath) => {
    if (!formatter.isReady()) return;
    if (!formatter.shouldFormat(filePath)) return;

    const config = formatter.buildConfig();
    await runFormatter(filePath, config);
  });

  formatter.onConfigChange(() => {
    pi.statusBar.set(`Formatter: ${formatter.buildConfig().parser}`);
  });
}
```

---

<sup>Documentation drafted with AI assistance — Claude Opus 4.6 (Anthropic). Reviewed by a human maintainer before publishing.</sup>
