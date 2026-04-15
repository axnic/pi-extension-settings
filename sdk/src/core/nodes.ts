/**
 * core/nodes.ts — SettingNode type definitions for the pi-extension-settings SDK.
 *
 * All setting types are discriminated unions tagged with `_tag`. Consumer
 * extensions use the `S.*` builders from `core/schema.ts` to construct them.
 *
 * ## Field naming conventions
 * - `description` — required on every node; max 128 characters; brief, scannable
 *                   label shown inline next to the control in the settings panel.
 * - `documentation` — optional; full Markdown documentation for the setting.
 *                   Rendered in a sidebar or popover when space allows and only
 *                   when the user expands it — never truncated or clipped.
 *
 * ## Other naming conventions
 * - Node types are bare names (`Text`, `Boolean`, `Enum`, …).
 * - Hook function types end in `Fn` (`ValidationFn`, `TransformFn`, …).
 * - Value types end in `Value` or describe the concrete shape
 *   (`TextValue`, `BoolValue`, `ListItem`, `DictEntry`).
 * - Field names follow JSON Schema where applicable (`properties`, `default`, `items`).
 *
 * @module
 */

import type { Theme } from "@mariozechner/pi-coding-agent";

// ─── Value types ──────────────────────────────────────────────────────────────
// Runtime values produced by each node kind.
// Hook functions (validation, display, …) use these as their input types.

/** Runtime value of a `Text` or `Enum` node. */
export type TextValue = string;

/** Runtime value of a `Number` node. */
export type NumValue = number;

/** Runtime value of a `Boolean` node. */
export type BoolValue = boolean;

/**
 * Runtime value of a single item in a `List` node.
 * Keys are field names from the list's `Struct`; values are their scalar values.
 */
export type ListItem =
  | TextValue
  | NumValue
  | BoolValue
  | Record<string, TextValue | NumValue | BoolValue>;

/**
 * Runtime value of a single entry in a `Dict` node.
 * Dict values are always plain strings.
 */
export type DictEntry = { key: string; value: TextValue };

// ─── Hook function types ──────────────────────────────────────────────────────

/**
 * Returned by a `ValidationFn` to report success or failure.
 *
 * `reason` may be a single string or an array of strings.
 * An array is used by composition validators (e.g. `v.any()`) to list
 * each individual sub-validator failure on its own line in the UI.
 */
export type ValidationResult =
  | { valid: true }
  | { valid: false; reason: string | string[] };

/**
 * Validates a value. Returns `{ valid: true }` on success or
 * `{ valid: false; reason }` on failure.
 *
 * @typeParam T - The value type being validated:
 *   - `TextValue` for `Text` nodes
 *   - `NumValue` for `Number` nodes
 *   - `ListItem` for per-item validation on `List` nodes
 *   - `DictEntry` for per-entry validation on `Dict` nodes
 *
 * A single `ValidationFn` is accepted per node. Compose multiple rules with
 * `v.all(...)` (all must pass) or `v.any(...)` (at least one must pass).
 */
export type ValidationFn<
  T extends TextValue | NumValue | ListItem | DictEntry,
> = (value: T) => ValidationResult;

/**
 * Transforms a `TextValue` before it is written to storage.
 * Only meaningful on `Text` nodes.
 */
export type TransformFn = (value: TextValue) => TextValue;

/**
 * Provides autocomplete suggestions for a partial `TextValue` input.
 * Only meaningful on `Text` nodes.
 */
export type CompleteFn = (partial: TextValue) => Promise<TextValue[]>;

/**
 * Converts the stored value to a display string (ANSI escape sequences allowed).
 *
 * Receives both the stored `value` and the active editor `theme` so display
 * functions can use semantic colors (`theme.fg("accent", …)`, `theme.fg("dim", …)`)
 * instead of hard-coded ANSI sequences.
 *
 * @typeParam T - The value type being displayed:
 *   - `TextValue` — for `Text` / `Enum` nodes
 *   - `NumValue`  — for `Number` nodes
 *   - `BoolValue` — for `Boolean` nodes
 *   - `DictEntry` — for `Dict` nodes (renders a single key/value entry)
 *
 * @example
 * // Use a semantic theme color
 * const show: DisplayFn<TextValue> = (value,
 theme) =>
 *   theme.fg("accent", value.toUpperCase());
 */
export type DisplayFn<T extends TextValue | NumValue | BoolValue | DictEntry> =
  (value: T, theme: Theme) => string;

/**
 * Converts the full list of items to an array of display strings (one per item).
 *
 * Called with all items so the function can compute column alignment across
 * the entire list. Receives the active editor `theme` for ANSI styling.
 *
 * @typeParam T - The list item type.
 *
 * @example
 * const showTips: ListDisplayFn<{ command: string; description: string }> =
 *   (items, theme) => {
 *     const maxLen = Math.max(...items.map(i => i.command.length));
 *     return items.map(i =>
 *       `${i.command.padEnd(maxLen)}  ${theme.fg("dim", i.description)}`
 *     );
 *   };
 */
export type ListDisplayFn<T extends ListItem> = (
  items: T[],
  theme: Theme,
) => string[];

// ─── Base node ────────────────────────────────────────────────────────────────

/**
 * Fields shared by every setting node and the `Struct` type.
 *
 * ### `description` (required)
 * A short, scannable label — **max 128 characters** — displayed inline next
 * to the control in the settings panel. It must be self-explanatory without
 * any surrounding context: imagine a user skimming the panel at a glance.
 *
 * ### `documentation` (optional)
 * Full Markdown documentation for the setting. Rendered in a sidebar or
 * expandable popover only when there is enough horizontal space, so it is safe
 * to be verbose. If omitted, the panel shows only the `description`.
 *
 * @example
 * // Minimal — description only
 * S.text({ description: "Gradient start color", default: "#ff930f" })
 *
 * // With extended documentation
 * S.text({
 *   description: "Gradient start color",
 *   documentation: [
 *     "## Gradient start color",
 *     "Accepts any valid CSS color string: hex (`#ff930f`), `rgb()`, `hsl()`, etc.",
 *     "The value is validated client-side before being saved.",
 *   ].join("\n"),
 *   default: "#ff930f",
 * })
 */
export interface BaseSettingNode {
  /**
   * Brief, inline label for the setting. **Required. Maximum 128 characters.**
   *
   * Displayed next to the control in the settings panel at all times.
   * Must be self-explanatory without surrounding context.
   */
  description: string;

  /**
   * Full Markdown documentation for the setting. **Optional.**
   *
   * Shown in a sidebar or expandable popover when horizontal space allows.
   * May be as long as needed — it is never truncated; it is simply hidden
   * when the panel is too narrow or when the user hasn't expanded it.
   */
  documentation?: string;
}

// ─── Struct (list item schema) ────────────────────────────────────────────────

/**
 * Describes the shape of each item in a `List` node.
 *
 * A `Struct` is NOT a `SettingNode` — it cannot appear at the top level of a
 * schema. It is exclusively used as the `items` field of a `List`.
 *
 * Properties are limited to scalar node types (`Text`, `Boolean`, `Enum`)
 * because list items must remain simple enough to render as table rows.
 *
 * @example
 * S.list({
 *   description: "SSH keys",
 *   items: S.struct({
 *     properties: {
 *       host: S.text({ description: "Hostname", default: "" }),
 *       key:  S.text({ description: "Private key path", default: "" }),
 *     },
 *   }),
 * })
 */
export interface Struct {
  _tag: "struct";
  /** Named scalar fields that make up each list item. */
  properties: Record<string, Text | Number | Boolean | Enum>;
}

// ─── Setting node types ───────────────────────────────────────────────────────

/**
 * A free-form text input.
 * All specialized inputs (color pickers, path browsers, …) build on this node.
 *
 * @example
 * S.text({
 *   description: "API base URL",
 *   documentation: "The root URL used for all outbound API requests.",
 *   default: "https://api.example.com",
 *   validation: v.url(),
 * })
 */
export interface Text extends BaseSettingNode {
  _tag: "text";
  /** Default value used when no stored value exists. */
  default: TextValue;
  /**
   * Validation applied to the user's input. Compose multiple rules with
   * `v.all(...)` or `v.any(...)`.
   */
  validation?: ValidationFn<TextValue>;
  /** Applied to the raw string before writing to storage. */
  transform?: TransformFn;
  /** Provides autocomplete suggestions as the user types. */
  complete?: CompleteFn;
  /** Converts the stored string to a display string. Receives the active theme. */
  display?: DisplayFn<TextValue>;
}

/**
 * A numeric input that stores and returns a native JS `number`.
 *
 * Prefer `S.number()` over `S.text()` + `v.integer()` / `v.float()` whenever
 * the value is semantically numeric: `settings.get()` returns a `number`
 * directly, so no `parseInt` / `parseFloat` call is needed at the use site.
 *
 * The validator receives the already-parsed `number`, so the numeric
 * validators (`v.integer`, `v.float`, `v.range`, …) work without conversion.
 *
 * @example
 * S.number({
 *   description: "Port number",
 *   default: 8080,
 *   validation: v.integer(1, 65535),
 * })
 */
export interface Number extends BaseSettingNode {
  _tag: "number";
  /** Default value used when no stored value exists. */
  default: NumValue;
  /**
   * Validation applied to the numeric value. Compose multiple rules with
   * `v.all(...)` or `v.any(...)`.
   *
   * The numeric validators (`v.integer`, `v.float`, `v.range`, `v.positive`,
   * `v.nonNegative`, `v.percentage`) all accept `TextValue | NumValue` and are
   * directly usable here.
   */
  validation?: ValidationFn<NumValue>;
  /** Converts the stored number to a display string. Receives the active theme. */
  display?: DisplayFn<NumValue>;
}

/**
 * A boolean toggle that flips between `true` and `false`.
 *
 * @example
 * S.boolean({
 *   description: "Enable dark mode",
 *   default: true,
 * })
 */
export interface Boolean extends BaseSettingNode {
  _tag: "boolean";
  /** Default value used when no stored value exists. */
  default: BoolValue;
  /** Converts the stored boolean to a display string. Receives the active theme. */
  display?: DisplayFn<BoolValue>;
}

/**
 * A cycling enum: the user steps through a fixed, ordered set of choices.
 *
 * @example
 * S.enum({
 *   description: "Color theme",
 *   default: "dark",
 *   values: ["dark", "light", "system"],
 * })
 */
export interface Enum extends BaseSettingNode {
  _tag: "enum";
  /** Default value; must be one of the declared `values`. */
  default: TextValue;
  /**
   * The ordered set of allowed values.
   * Each entry is either a plain string (stored value = display label) or an
   * object with separate `value` (stored) and `description` (shown in UI) fields.
   */
  values: Array<TextValue | { value: TextValue; label: string }>;
  /** Converts the stored enum value to a display string. Receives the active theme. */
  display?: DisplayFn<TextValue>;
}

/**
 * A growable list of structured objects.
 *
 * Each item has the shape described by `items` (a `Struct`). The optional
 * `display` function converts an entire `ListItem` to a compact summary line
 * shown in the collapsed row view.
 *
 * @example
 * S.list({
 *   description: "Allowed origins",
 *   items: S.struct({
 *     properties: {
 *       url:    S.text({ description: "URL", default: "" }),
 *       active: S.boolean({ description: "Enabled", default: true }),
 *     },
 *   }),
 *   display: (item, theme) =>
 *     `${theme.fg("dim", "→")} ${item.active ? "✓" : "✗"} ${item.url}`,
 * })
 */
export interface List<T extends ListItem = ListItem> extends BaseSettingNode {
  _tag: "list";
  /** Label for the "add item" button. Falls back to the UI's built-in default. */
  addLabel?: string | "Add item";
  /** Initial list contents used when no stored value exists. */
  default: T[];
  /** Schema describing the fields of each list item. */
  items: Struct;
  /**
   * Validates each item individually. Receives the full `ListItem` object.
   * Compose multiple rules with `v.all(...)` / `v.any(...)`.
   */
  validation?: ValidationFn<T>;
  /**
   * Converts all list items to an array of display strings (one per item).
   * Called at render time with the full list so the function can compute
   * column alignment. Receives the active theme for ANSI styling.
   */
  display?: ListDisplayFn<T>;
}

/**
 * A string → string dictionary of arbitrary key/value pairs.
 *
 * @example
 * S.dict({
 *   description: "Environment variables",
 *   documentation: "Key/value pairs injected into the process environment at startup.",
 * })
 */
export interface Dict extends BaseSettingNode {
  _tag: "dict";
  /** Label for the "add entry" button. Falls back to the UI's built-in default. */
  addLabel?: string | "Add entry";
  /** Initial dictionary contents used when no stored value exists. */
  default: Record<string, TextValue>;
  /**
   * Validates each entry individually. Receives a `DictEntry` with `key` and `value`.
   * Compose multiple rules with `v.all(...)` / `v.any(...)`.
   */
  validation?: ValidationFn<DictEntry>;
  /**
   * Converts a `DictEntry` to a display string. Receives the active theme.
   * Shown when rendering an individual key/value row in the panel.
   */
  display?: DisplayFn<DictEntry>;
}

/**
 * A named section that groups related settings under a collapsible header
 * in the settings panel.
 *
 * The `description` field doubles as the section header label.
 *
 * @example
 * S.section({
 *   description: "Appearance",
 *   documentation: "Controls the visual theme applied to the extension's UI.",
 *   children: {
 *     theme: S.enum({ description: "Color theme", default: "dark", values: ["dark", "light"] }),
 *   },
 * })
 */
export interface Section extends BaseSettingNode {
  _tag: "section";
  /** The child settings or nested sections grouped under this section. */
  children: Record<string, SettingNode>;
}

// ─── Union types ──────────────────────────────────────────────────────────────

/** Union of all top-level setting node types. */
export type SettingNode =
  | Text
  | Number
  | Boolean
  | Enum
  | List
  | Dict
  | Section;

/** Leaf nodes — setting nodes that hold a value directly (not containers). */
export type LeafNode = Text | Number | Boolean | Enum | List | Dict;

// ─── Node helpers ─────────────────────────────────────────────────────────────

/** Returns `true` if `node` is a leaf (holds a value, not a container). */
export function isLeafNode(node: SettingNode): node is LeafNode {
  return node._tag !== "section";
}

/** Returns `true` if `node` is a `Section` (groups child settings). */
export function isSectionNode(node: SettingNode): node is Section {
  return node._tag === "section";
}

/** Returns all enum choices as plain strings (stripping label metadata). */
export function enumValues(node: Enum): TextValue[] {
  return node.values.map((v) => (typeof v === "string" ? v : v.value));
}

/**
 * Returns the display label for a given enum value.
 * Falls back to the raw value string if no matching entry is found.
 */
export function enumLabel(node: Enum, value: TextValue): string {
  const entry = node.values.find(
    (v) => (typeof v === "string" ? v : v.value) === value,
  );
  if (!entry) return value;
  return typeof entry === "string" ? entry : entry.label;
}

/** Serializes the default value of a leaf node to a string (for storage comparison). */
export function defaultAsString(node: LeafNode): string {
  switch (node._tag) {
    case "boolean":
      return String(node.default);
    case "number":
      return String(node.default);
    case "list":
    case "dict":
      return JSON.stringify(node.default);
    default:
      return node.default;
  }
}
