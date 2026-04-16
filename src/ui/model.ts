/**
 * model.ts — Flat row model for the settings panel.
 *
 * `buildRows()` converts the nested registry plus the current `UIState` into a
 * flat list of {@link ViewRow} objects ready for rendering. It is **pure** and
 * has **no dependency on a `Theme`**: every styling decision is left to the
 * renderer. The model only computes:
 *
 *   - which extensions / sections / leaves are visible at the current scope
 *   - whether each header is collapsed
 *   - the indentation tree prefix for every row
 *   - the raw stored value of each leaf (or its default) and a plain-string
 *     "summary" used as a fallback display value for list / dict rows
 *
 * It also exposes a couple of small parser helpers
 * ({@link parseListValue}, {@link parseDictValue}) so that input handlers and
 * other consumers don't need to repeat the same `JSON.parse(...) ?? fallback`
 * boilerplate.
 */

import type { LeafNode, ListItem, SettingNode } from "../../sdk/index.js";
import { defaultAsString } from "../../sdk/src/core/nodes.js";
import { getExtensionSetting } from "../../sdk/src/core/storage.js";
import type { Registry } from "../core/registry.js";
import { countSettings } from "../core/registry.js";
import {
  isExtCollapsed,
  isGroupCollapsed,
  isListExpanded,
  type UIState,
} from "./state.js";

// ─── Row types ────────────────────────────────────────────────────────────────

/** Fields shared by every row produced by {@link buildRows}. */
export interface BaseRow {
  /** Unique stable ID for focus tracking. */
  id: string;
  /** Nesting depth (0 = extension header, 1 = direct child, …). */
  depth: number;
  /**
   * Full tree prefix for this row (excluding the leading cursor slot).
   * Examples: `""` for depth 0; `" ├ "` for non-last depth-1; `" └ "` for last depth-1.
   *
   * The leading character is always a space — the renderer replaces it with
   * `→` when the row is focused.
   */
  prefix: string;
  /** Whether this row can receive focus. */
  focusable: boolean;
}

/** Top-level header row, one per registered extension. */
export interface ExtensionHeaderRow extends BaseRow {
  type: "extension-header";
  extensionName: string;
  isCollapsed: boolean;
  settingsCount: number;
}

/** Header row for a `Section` node — collapsible group of children. */
export interface GroupRow extends BaseRow {
  type: "group";
  extensionName: string;
  /**
   * Full dot-notation key relative to the extension root.
   * E.g. `"colors"` or `"colors.advanced"`.
   */
  groupKey: string;
  label: string;
  /** Section description; surfaced in the description area when this row is focused. */
  description?: string;
  isCollapsed: boolean;
  settingsCount: number;
}

/** Leaf row for an actual setting (text, boolean, enum, list, dict, …). */
export interface SettingRow extends BaseRow {
  type: "setting";
  extensionName: string;
  /** Full dotted key including any group prefix (e.g. `"colors.primary"`). */
  settingKey: string;
  label: string;
  /** The schema node for this setting — kept on the row so the renderer can apply hooks. */
  node: LeafNode;
  /** Description text from the schema node; surfaced in the description area. */
  description?: string;
  /** Raw stored value (string from storage, or serialised default). */
  rawValue: string;
  /**
   * Theme-free display string. For text / number / boolean / enum nodes this is
   * the same as `rawValue`; for list / dict nodes it is a `"N items configured"`
   * style summary used when no SDK display hook is provided.
   */
  displayValue: string;
  /** True if the stored value differs from the schema default. */
  isModified: boolean;
  /** True if this list / dict setting is currently expanded inline. */
  isExpanded: boolean;
}

/** A single inline row for an item inside an expanded list / dict. */
export interface ListItemRow extends BaseRow {
  type: "list-item";
  extensionName: string;
  settingKey: string;
  itemIndex: number;
  fields: Record<string, string>;
}

/** Visual separator drawn under the items of an expanded list / dict. */
export interface ListSeparatorRow extends BaseRow {
  type: "list-separator";
  extensionName: string;
  settingKey: string;
}

/** "+ Add item" affordance row at the bottom of an expanded list / dict. */
export interface ListAddRow extends BaseRow {
  type: "list-add";
  extensionName: string;
  settingKey: string;
  addLabel: string;
}

/** Discriminated union of every row kind produced by {@link buildRows}. */
export type ViewRow =
  | ExtensionHeaderRow
  | GroupRow
  | SettingRow
  | ListItemRow
  | ListSeparatorRow
  | ListAddRow;

/**
 * Returns `true` when the focused row has meaningful documentation to show in
 * the description panel — i.e., when displaying a scroll hint is warranted.
 *
 * - `extension-header`: always true (shows extension name + settings count).
 * - `group` rows qualify when they have a non-empty `description`.
 * - `setting`: true when the node has a non-empty `documentation` or `description`.
 * - `list-item`, `list-add`, `list-separator`: false (no scrollable content).
 */
export function rowHasDocumentation(row: ViewRow | undefined): boolean {
  if (!row) return false;
  switch (row.type) {
    case "extension-header":
      return true;
    case "group":
      return Boolean(row.description?.trim());
    case "setting":
      return Boolean(
        row.node.documentation?.trim() || row.node.description?.trim(),
      );
    default:
      return false;
  }
}

// ─── Parse helpers (shared between model + input + renderer) ──────────────────

/**
 * Parse a list-shaped raw storage value into an array of items, returning
 * an empty array on any parse failure.
 *
 * Defined here rather than in each consumer so the same fallback behaviour is
 * applied everywhere we read a list setting.
 */
export function parseListValue(raw: string | undefined): ListItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ListItem[]) : [];
  } catch {
    return [];
  }
}

/**
 * Parse a dict-shaped raw storage value into a string→string map, returning
 * an empty object on any parse failure.
 */
export function parseDictValue(
  raw: string | undefined,
): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
    return {};
  } catch {
    return {};
  }
}

// ─── Tree prefix computation ──────────────────────────────────────────────────

/**
 * Build the full tree prefix for a row at a given depth.
 *
 * Rules:
 *   - Depth 0 (extension header): no tree chars, just one cursor-slot space.
 *   - Depth ≥ 1: ancestor continuations (`"  │ "` or four spaces) followed by
 *     the row's own connector (`" ├ "` for non-last, `" └ "` for last).
 *
 * @param ancestorIsLast - For each ancestor level, whether that ancestor was
 *                         the last child at its level.
 * @param isLast         - Whether this row is the last child at its own level.
 */
function buildPrefix(ancestorIsLast: boolean[], isLast: boolean): string {
  if (ancestorIsLast.length === 0) {
    // First level under an extension: keep one extra left pad so tree aligns
    // with deeper levels when the cursor marker is shown.
    return isLast ? "  └ " : "  ├ ";
  }
  // Ancestor continuations (each 4 chars wide).
  const continuations = ancestorIsLast
    .map((last) => (last ? "    " : "  │ "))
    .join("");
  // Own tree char.
  const own = isLast ? " └ " : " ├ ";
  return continuations + own;
}

// ─── Value helpers ────────────────────────────────────────────────────────────

/** Convert a native stored value to the raw string used in the TUI editing buffer. */
function nativeToRawString(node: LeafNode, value: unknown): string {
  if (node._tag === "list" || node._tag === "dict") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") return value;
  return String(value);
}

/**
 * Get the raw stored string for a setting key, falling back to the schema's
 * default-as-string when the value is unset.
 */
function getRawValue(
  extensionName: string,
  key: string,
  node: LeafNode,
): string {
  const stored = getExtensionSetting(extensionName, key);
  if (stored !== undefined) return nativeToRawString(node, stored);
  return defaultAsString(node);
}

/**
 * Compute a theme-free fallback display string for a leaf node.
 *
 * For text-like nodes this is just the raw value — the renderer is free to
 * apply the schema's `display` hook on top at render time when a theme is
 * available. For collections it returns a `"N items configured"` style
 * summary so the row can show something useful even when no display hook is
 * registered.
 */
function summarizeValue(node: LeafNode, rawValue: string): string {
  if (node._tag === "list") {
    const items = parseListValue(rawValue);
    return items.length === 0
      ? "empty"
      : `${items.length} item${items.length === 1 ? "" : "s"} configured`;
  }
  if (node._tag === "dict") {
    const entries = Object.keys(parseDictValue(rawValue));
    return entries.length === 0
      ? "empty"
      : `${entries.length} entr${entries.length === 1 ? "y" : "ies"}`;
  }
  return rawValue;
}

/** True if the stored raw value differs from the schema default. */
function isModified(node: LeafNode, rawValue: string): boolean {
  return rawValue !== defaultAsString(node);
}

// ─── Row builders ─────────────────────────────────────────────────────────────

/**
 * Recursively build rows for the children of an extension (or section).
 *
 * @param extensionName  - The owning extension's name.
 * @param nodes          - Current level of schema nodes.
 * @param keyPrefix      - Dot-notation prefix for building full keys.
 * @param ancestorIsLast - `isLast` flags for all ancestors above this level.
 * @param state          - Current UI state.
 * @param searchQuery    - Lowercased search query (`""` = no filter).
 * @param scope          - Active scope (`[]` = global).
 */
function buildChildRows(
  extensionName: string,
  nodes: Record<string, SettingNode>,
  keyPrefix: string,
  ancestorIsLast: boolean[],
  state: UIState,
  searchQuery: string,
  scope: string[],
): ViewRow[] {
  const entries = Object.entries(nodes);
  const rows: ViewRow[] = [];
  const scopedGroupKey = scope.length >= 2 ? scope[1]! : null;

  for (let i = 0; i < entries.length; i++) {
    const [key, node] = entries[i]!;
    const isLast = i === entries.length - 1;
    const fullKey = keyPrefix ? `${keyPrefix}.${key}` : key;
    const prefix = buildPrefix(ancestorIsLast, isLast);
    const childAncestorIsLast = [...ancestorIsLast, isLast];
    const depth = ancestorIsLast.length + 1;

    if (node._tag === "section") {
      const groupKey = fullKey;

      // Scope check: keep only the scoped group branch (ancestors + descendants).
      if (scopedGroupKey) {
        const isAncestor =
          scopedGroupKey === groupKey ||
          scopedGroupKey.startsWith(`${groupKey}.`);
        const isDescendant = groupKey.startsWith(`${scopedGroupKey}.`);
        if (!isAncestor && !isDescendant) continue;
      }

      const groupCollapsed = isGroupCollapsed(state, extensionName, groupKey);
      const childCount = countSettings(node.children);

      // For search: check if any child matches.
      const matchesSearch =
        searchQuery === "" ||
        node.description.toLowerCase().includes(searchQuery) ||
        anyChildMatchesSearch(node.children, searchQuery);

      if (searchQuery !== "" && !matchesSearch) continue;

      rows.push({
        id: `group:${extensionName}:${groupKey}`,
        depth,
        prefix,
        focusable: true,
        type: "group",
        extensionName,
        groupKey,
        label: key,
        description: node.description,
        isCollapsed: groupCollapsed,
        settingsCount: childCount,
      });

      // When searching, always expand groups; otherwise respect collapse state.
      if (!groupCollapsed || searchQuery !== "") {
        const childRows = buildChildRows(
          extensionName,
          node.children,
          fullKey,
          childAncestorIsLast,
          state,
          searchQuery,
          scope,
        );
        rows.push(...childRows);
      }
    } else {
      // Leaf node.
      const leafNode = node as LeafNode;
      const rawValue = getRawValue(extensionName, fullKey, leafNode);
      const displayValue = summarizeValue(leafNode, rawValue);
      const modified = isModified(leafNode, rawValue);
      const expanded = isListExpanded(state, extensionName, fullKey);

      if (scopedGroupKey && !fullKey.startsWith(`${scopedGroupKey}.`)) {
        continue;
      }

      // Search filter.
      if (
        searchQuery !== "" &&
        !leafNode.description.toLowerCase().includes(searchQuery)
      ) {
        continue;
      }

      rows.push({
        id: `setting:${extensionName}:${fullKey}`,
        depth,
        prefix,
        focusable: true,
        type: "setting",
        extensionName,
        settingKey: fullKey,
        label: key,
        description: leafNode.description,
        node: leafNode,
        rawValue,
        displayValue,
        isModified: modified,
        isExpanded: expanded,
      });

      // If list/dict is expanded, add sub-rows.
      if (expanded && (leafNode._tag === "list" || leafNode._tag === "dict")) {
        const subRows = buildListSubRows(
          extensionName,
          fullKey,
          leafNode,
          rawValue,
          childAncestorIsLast,
        );
        rows.push(...subRows);
      }
    }
  }

  return rows;
}

/** Check whether any leaf in a node tree matches the (already-lowercased) search query. */
function anyChildMatchesSearch(
  nodes: Record<string, SettingNode>,
  query: string,
): boolean {
  for (const node of Object.values(nodes)) {
    if (node._tag === "section") {
      if (anyChildMatchesSearch(node.children, query)) return true;
    } else {
      if ((node as LeafNode).description.toLowerCase().includes(query))
        return true;
    }
  }
  return false;
}

/** Build sub-rows (item rows + separator + add affordance) for an expanded list or dict. */
function buildListSubRows(
  extensionName: string,
  settingKey: string,
  node: LeafNode,
  rawValue: string,
  ancestorIsLast: boolean[],
): ViewRow[] {
  const rows: ViewRow[] = [];
  const depth = ancestorIsLast.length + 1; // items are indented below the list row
  const indentPrefix = buildPrefix(ancestorIsLast, false).replace(
    /[├└│]/g,
    " ",
  );

  if (node._tag === "list") {
    const items = parseListValue(rawValue) as Record<string, string>[];

    for (let i = 0; i < items.length; i++) {
      rows.push({
        id: `list-item:${extensionName}:${settingKey}:${i}`,
        depth: depth + 1,
        prefix: indentPrefix,
        focusable: true,
        type: "list-item",
        extensionName,
        settingKey,
        itemIndex: i,
        fields: items[i] ?? {},
      });
    }

    rows.push({
      id: `list-sep:${extensionName}:${settingKey}`,
      depth: depth + 1,
      prefix: indentPrefix,
      focusable: false,
      type: "list-separator",
      extensionName,
      settingKey,
    });

    const addLabel = node.addLabel ?? "Add item";
    rows.push({
      id: `list-add:${extensionName}:${settingKey}`,
      depth: depth + 1,
      prefix: indentPrefix,
      focusable: true,
      type: "list-add",
      extensionName,
      settingKey,
      addLabel,
    });
  } else if (node._tag === "dict") {
    const dict = parseDictValue(rawValue);
    const entries = Object.entries(dict);
    for (let i = 0; i < entries.length; i++) {
      const [k, v] = entries[i]!;
      rows.push({
        id: `list-item:${extensionName}:${settingKey}:${i}`,
        depth: depth + 1,
        prefix: indentPrefix,
        focusable: true,
        type: "list-item",
        extensionName,
        settingKey,
        itemIndex: i,
        fields: { key: k, value: v },
      });
    }

    rows.push({
      id: `list-sep:${extensionName}:${settingKey}`,
      depth: depth + 1,
      prefix: indentPrefix,
      focusable: false,
      type: "list-separator",
      extensionName,
      settingKey,
    });

    const addLabel = node.addLabel ?? "Add binding";
    rows.push({
      id: `list-add:${extensionName}:${settingKey}`,
      depth: depth + 1,
      prefix: indentPrefix,
      focusable: true,
      type: "list-add",
      extensionName,
      settingKey,
      addLabel,
    });
  }

  return rows;
}

// ─── Main builder ─────────────────────────────────────────────────────────────

/**
 * Build the complete flat row list from the registry and the current UI state.
 *
 * This is the single source of truth for what the renderer and the input
 * handler see. The function is **pure**: same inputs always produce the same
 * output, with no theme dependency and no observable side effects beyond
 * reading from the storage layer.
 */
export function buildRows(registry: Registry, state: UIState): ViewRow[] {
  const rows: ViewRow[] = [];
  const scope = state.scope;
  const searchQuery = state.inputValue.toLowerCase().trim();

  const sortedExtensions = Array.from(registry.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  for (const [extensionName, nodes] of sortedExtensions) {
    // Scope filter: if scoped, skip other extensions.
    if (scope.length > 0 && scope[0] !== extensionName) continue;

    const extCollapsed = isExtCollapsed(state, extensionName);
    const totalCount = countSettings(nodes);

    // For search: check if any setting in this extension matches.
    const extMatchesSearch =
      searchQuery === "" ||
      extensionName.toLowerCase().includes(searchQuery) ||
      anyChildMatchesSearch(nodes, searchQuery);

    if (searchQuery !== "" && !extMatchesSearch) continue;

    rows.push({
      id: `ext:${extensionName}`,
      depth: 0,
      prefix: " ", // just the cursor slot
      focusable: true,
      type: "extension-header",
      extensionName,
      isCollapsed: extCollapsed,
      settingsCount: totalCount,
    });

    if (!extCollapsed || searchQuery !== "") {
      const childRows = buildChildRows(
        extensionName,
        nodes,
        "",
        [], // no ancestors at depth 1
        state,
        searchQuery,
        scope,
      );
      rows.push(...childRows);
    }
  }

  return rows;
}

/** Find the index of a row by ID. Returns `-1` when no row matches. */
export function findRowIndex(rows: ViewRow[], id: string): number {
  return rows.findIndex((r) => r.id === id);
}

/** Indices of every focusable row, in display order. */
export function focusableIndices(rows: ViewRow[]): number[] {
  return rows.reduce<number[]>((acc, row, i) => {
    if (row.focusable) acc.push(i);
    return acc;
  }, []);
}

/** Number of leaf-setting rows currently visible. */
export function countVisibleSettings(rows: ViewRow[]): number {
  return rows.filter((r) => r.type === "setting").length;
}

/** Number of extension-header rows currently visible. */
export function countSections(rows: ViewRow[]): number {
  return rows.filter((r) => r.type === "extension-header").length;
}
