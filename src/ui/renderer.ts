/**
 * renderer.ts — Converts the flat row model into terminal lines.
 *
 * This module is a pure function: same rows + state → same output.
 * All styling goes through pi's Theme object.
 *
 * Layout:
 *   [input bar]
 *   [empty line]
 *   [rows…]  (scrolled, MAX_VISIBLE_ROWS shown)
 *   [empty line]
 *   [pagination counter]
 *   [empty line]
 *   [tooltip line 1]
 *   [tooltip line 2]
 *   [tooltip line 3]
 *   [empty line]
 *   [hint bar]
 */

import type { Theme } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import type { Enum } from "../../sdk/index.js";
import { enumLabel, enumValues } from "../../sdk/index.js";
import type { Registry } from "../core/registry.js";
import type { ControlBindings } from "../settings.js";
import {
  countSections,
  countVisibleSettings,
  type ExtensionHeaderRow,
  type GroupRow,
  type ListAddRow,
  type ListItemRow,
  parseListValue,
  type SettingRow,
  type ViewRow,
} from "./model.js";
import type { UIState } from "./state.js";

// ─── Constants ────────────────────────────────────────────────────────────────

export const MAX_VISIBLE_ROWS = 14;

function expandScopePath(scope: string[]): string[] {
  if (scope.length === 0) return [];
  const [extension, ...rest] = scope;
  const expanded: string[] = extension ? [extension] : [];
  for (const part of rest) {
    expanded.push(...part.split(".").filter((segment) => segment.length > 0));
  }
  return expanded;
}

// ─── Input bar rendering ──────────────────────────────────────────────────────

/**
 * Render the input bar line (first line of the panel).
 * Format:
 *   Search mode (global):   "> {query}█"
 *   Search mode (scoped):   "> (ext) {query}█"    ← parens and > are dim
 *   Edit mode:              "> ({ext}) {rawValue}█"
 */
function renderInputBar(state: UIState, theme: Theme, width: number): string {
  const dim = (t: string) => theme.fg("dim", t);

  let prefix = "> ";
  const scope = state.editState
    ? [state.editState.extension, ...state.scope.slice(1)]
    : state.scope;

  if (scope.length > 0) {
    const parts = expandScopePath(scope).join(dim(" > "));
    prefix = `> ${dim("(")}${parts}${dim(") ")}`;
  }

  const value = state.editState ? state.editState.rawValue : state.inputValue;
  const cursor = state.editState
    ? state.editState.cursor
    : Math.min(state.inputCursor, state.inputValue.length);
  const showCursor = state.editState !== null || state.searchActive;

  if (!showCursor) {
    return truncateToWidth(prefix + value, width, "…");
  }

  // Insert cursor character at position
  const before = value.slice(0, cursor);
  const after = value.slice(cursor);
  const cursorChar = after.length > 0 ? after[0]! : " ";
  const underlinedCursor = theme.inverse(cursorChar); // reverse video for cursor
  const line = prefix + before + underlinedCursor + after.slice(1);

  return truncateToWidth(line, width, "…");
}

// ─── Row rendering ────────────────────────────────────────────────────────────

/** The label column width (padded to align values). */
const LABEL_COL_MAX = 32;
const LABEL_VALUE_SEP = "  ";

/**
 * Compute the label column width for alignment across a set of rows.
 */
function computeLabelWidth(rows: ViewRow[]): number {
  let max = 0;
  for (const row of rows) {
    if (row.type === "setting") {
      const w = visibleWidth(row.label);
      if (w > max) max = w;
    }
  }
  return Math.min(max, LABEL_COL_MAX);
}

/** Render a single tree character, dim-styled. */
function dimChar(theme: Theme, char: string): string {
  return theme.fg("dim", char);
}

/**
 * Style the tree prefix characters, keeping the cursor slot unstyled.
 * The first char of prefix is the cursor slot (space or →).
 */
function stylePrefix(prefix: string, isFocused: boolean, theme: Theme): string {
  if (prefix.length === 0) return "";

  const cursorSlot = isFocused ? theme.fg("accent", "→") : " ";

  if (prefix.length === 1) {
    // Depth-0 row: only a cursor slot
    return cursorSlot;
  }

  // Everything after the cursor slot contains tree characters
  const treeChars = prefix.slice(1);
  // Dim all tree characters (├, └, │) and keep spaces as-is
  const styledTree = treeChars
    .split("")
    .map((c) => (c === "├" || c === "└" || c === "│" ? dimChar(theme, c) : c))
    .join("");

  return cursorSlot + styledTree;
}

/** Render an extension header row. */
function renderExtensionHeader(row: ExtensionHeaderRow, isFocused: boolean, theme: Theme): string {
  const cursor = stylePrefix(row.prefix, isFocused, theme);
  const marker = theme.fg("accent", row.isCollapsed ? "[+]" : "[-]");
  const name = theme.bold(theme.fg("accent", row.extensionName));

  if (row.isCollapsed) {
    const count = theme.fg("dim", ` (${row.settingsCount} settings)`);
    return `${cursor + marker} ${name}${count}`;
  }
  return `${cursor + marker} ${name}`;
}

/** Render a group header row. */
function renderGroupHeader(row: GroupRow, isFocused: boolean, theme: Theme): string {
  const cursor = stylePrefix(row.prefix, isFocused, theme);
  const marker = theme.fg("accent", row.isCollapsed ? "[+]" : "[-]");
  const name = theme.bold(theme.fg("accent", row.label));

  if (row.isCollapsed) {
    const count = theme.fg("dim", ` (${row.settingsCount} settings)`);
    return `${cursor + marker} ${name}${count}`;
  }
  return `${cursor + marker} ${name}`;
}

/**
 * Render the value column of a setting row.
 *
 * For text nodes, the schema-level `display` hook (if any) is applied here at
 * render time so the model layer can stay theme-free. For list / dict nodes
 * the renderer falls back to the model's plain summary (e.g. `"3 items
 * configured"`) when no list-level `display` hook is registered — the cache
 * built by {@link buildListDisplayCache} handles the alternative path.
 */
function renderValue(row: SettingRow, isEditing: boolean, editValue: string, theme: Theme): string {
  const node = row.node;

  // In edit mode: show the current edit value (raw, unstyled).
  if (isEditing) {
    return editValue;
  }

  if (node._tag === "boolean") {
    return row.rawValue === "true" ? "true" : "false";
  }

  if (node._tag === "enum") {
    return renderEnumValue(node, row.rawValue, theme);
  }

  if (node._tag === "list" || node._tag === "dict") {
    return theme.fg("dim", row.displayValue);
  }

  // Text node: apply the schema's display hook (if any) at render time so the
  // model never has to know about themes.
  if (node._tag === "text" && node.display) {
    try {
      return node.display(row.rawValue, theme);
    } catch {
      // Fall through to the unstyled raw value on hook failure.
    }
  }
  return row.rawValue;
}

/** Render enum value: current + all options with brackets around active. */
function renderEnumValue(node: Enum, currentValue: string, theme: Theme): string {
  const allValues = enumValues(node);
  const parts: string[] = [];

  for (const v of allValues) {
    const label = enumLabel(node, v);
    if (v === currentValue) {
      // Active option: [value] bold
      parts.push(theme.fg("accent", "[") + theme.bold(label) + theme.fg("accent", "]"));
    } else {
      parts.push(theme.fg("dim", label));
    }
  }

  return parts.join("  ");
}

/** Render a setting row. */
function renderSettingRow(
  row: SettingRow,
  isFocused: boolean,
  isEditing: boolean,
  editValue: string,
  labelWidth: number,
  width: number,
  theme: Theme
): string {
  const cursor = stylePrefix(row.prefix, isFocused, theme);
  const prefixWidth = visibleWidth(cursor);

  // Label (padded to label column width)
  const labelPadded = row.label + " ".repeat(Math.max(0, labelWidth - visibleWidth(row.label)));
  const label = labelPadded;

  // Modified marker
  const modified = row.isModified ? ` ${theme.fg("accent", "•")}` : "";

  // Value
  const value = renderValue(row, isEditing, editValue, theme);

  // Calculate available width for value
  const usedWidth = prefixWidth + visibleWidth(label) + visibleWidth(LABEL_VALUE_SEP);
  const modifiedWidth = row.isModified ? 2 : 0;
  const valueMaxWidth = Math.max(0, width - usedWidth - modifiedWidth - 2);

  const truncatedValue = truncateToWidth(value, valueMaxWidth, "…");

  return cursor + label + LABEL_VALUE_SEP + truncatedValue + modified;
}

/** Render a list item row (no tree chars, plain indented). */
function renderListItemRow(
  row: ListItemRow,
  isFocused: boolean,
  theme: Theme,
  width: number,
  displayLine?: string
): string {
  const cursor = isFocused ? theme.fg("accent", "→") : " ";
  const indent = row.prefix.length > 0 ? row.prefix.slice(1) : "";

  if (displayLine !== undefined) {
    return truncateToWidth(cursor + indent + displayLine, width, "…");
  }

  const fields = Object.entries(row.fields);

  if (fields.length === 0) return `${cursor + indent}(empty)`;

  if (fields.length === 1) {
    const [_k, v] = fields[0]!;
    return truncateToWidth(cursor + indent + v, width, "…");
  }

  // Multiple fields: show as "key:  value   key:  value"
  const valParts = fields.map(([k, v]) => `${theme.fg("dim", `${k}:`)}  ${v}`);
  return truncateToWidth(cursor + indent + valParts.join("   "), width, "…");
}

/** Render a list separator row (─────). */
function renderSeparatorRow(prefix: string, theme: Theme, width: number): string {
  const sepWidth = Math.max(0, Math.min(width - 6, 40));
  const indent = prefix.length > 0 ? prefix.slice(1) : "";
  return ` ${indent}${theme.fg("dim", "─".repeat(sepWidth))}`;
}

/** Render a list add row (+ Add ...). */
function renderListAddRow(row: ListAddRow, isFocused: boolean, theme: Theme): string {
  const cursor = isFocused ? theme.fg("accent", "→") : " ";
  const indent = row.prefix.length > 0 ? row.prefix.slice(1) : "";
  return cursor + indent + theme.fg("dim", `+ ${row.addLabel}`);
}

// ─── Tooltip rendering ────────────────────────────────────────────────────────

/**
 * Word-wrap plain (ANSI-free) text to fit within `maxWidth` visible columns.
 * The first line starts at column 0; every continuation line is prefixed with
 * `indent` (must be plain text so its visible width equals its byte length).
 */
function wrapText(text: string, maxWidth: number, indent: string): string[] {
  if (maxWidth <= 0) return [text];
  if (visibleWidth(text) <= maxWidth) return [text];

  const lines: string[] = [];
  const words = text.split(" ");
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (visibleWidth(candidate) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      // Start next line with indent; if a single word is still too wide, keep it anyway.
      current = indent + word;
    }
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}

/** Render the tooltip area for the focused row.
 *
 * Returns a variable-length array of lines:
 *   - line 1: row description / tooltip
 *   - line 2+: validation result (may wrap across multiple lines)
 *   - last line: suggestions hint (when autocomplete is open)
 */
function renderTooltip(rows: ViewRow[], state: UIState, theme: Theme, width: number): string[] {
  const focusedRow = rows[state.focusedIndex];

  if (!focusedRow) return ["", "", ""];

  const dim = (t: string) => theme.fg("dim", t);

  // Line 1: description
  let line1 = "";
  switch (focusedRow.type) {
    case "extension-header": {
      const total = focusedRow.settingsCount;
      line1 = `${dim("[extension]")} ${focusedRow.extensionName} ${dim(`(${total} setting${total === 1 ? ")" : "s)"}`)}`;
      break;
    }
    case "group": {
      const total = focusedRow.settingsCount;
      line1 = `${focusedRow.tooltip ?? `${focusedRow.label} group`} ${dim(`(${total} setting${total === 1 ? ")" : "s)"}`)}`;
      break;
    }
    case "setting":
      line1 = focusedRow.node.tooltip ?? "";
      break;
    case "list-add":
      line1 = "Add a new item to the list";
      break;
    case "list-item":
      line1 = "List item";
      break;
  }

  // Line 2+: validation result OR type hint
  let validationLines: string[] = [];
  if (state.editState && state.validation !== null) {
    const { valid, reason } = state.validation as {
      valid: boolean;
      reason?: string | string[];
    };
    const color = valid ? "success" : "error";

    if (!valid && Array.isArray(reason) && reason.length > 1) {
      // Multiple failures from v.any(): header + one line per reason
      validationLines.push(theme.fg(color, "✗ none of the validations passed:"));
      for (const r of reason) {
        // "  · " = 4 visible columns → indent wrapped continuation by 4 spaces
        const wrapped = wrapText(`  · ${r}`, width, "    ");
        for (const l of wrapped) validationLines.push(theme.fg(color, l));
      }
    } else {
      // Single failure or success — single wrapped block
      const message = Array.isArray(reason)
        ? (reason[0] ?? (valid ? "valid" : "invalid"))
        : (reason ?? (valid ? "valid" : "invalid"));
      const prefix = valid ? "✓" : "✗";
      const fullText = `${prefix} ${message}`;
      // "✓ " / "✗ " = 2 visible columns → indent continuation lines by 2 spaces
      const wrapped = wrapText(fullText, width, "  ");
      validationLines = wrapped.map((l) => theme.fg(color, l));
    }
  } else if (focusedRow.type === "setting") {
    const node = focusedRow.node;
    if (node._tag === "text") {
      const hints: string[] = [];
      if (node.validation) {
        hints.push("validated");
      }
      if (node.complete) hints.push("<tab> for suggestions");
      validationLines = hints.length > 0 ? [dim(hints.join(" · "))] : [dim("<enter> to edit")];
    }
  } else if (state.addFormState) {
    validationLines = [dim("<tab> next field · <enter> confirm · <esc> cancel")];
  }

  // Last line: scope info OR autocomplete hint
  let hintLine = "";
  if (state.suggestions.length > 0) {
    hintLine = dim("↑↓ navigate · Tab accept suggestion");
  }

  return [line1, ...validationLines, ...(hintLine ? [hintLine] : [])];
}

// ─── Hint bar rendering ───────────────────────────────────────────────────────

/** Render the bottom hint bar based on current mode. */
function renderHintBar(
  state: UIState,
  rows: ViewRow[],
  theme: Theme,
  controls: ControlBindings
): string {
  const dim = (t: string) => theme.fg("dim", t);

  if (state.addFormState) {
    return dim("<tab> next field · <enter> confirm · <esc> cancel");
  }

  if (state.editState) {
    if (state.suggestions.length > 0) {
      return dim(
        `<enter> to confirm · <esc> to cancel / <esc> cancel suggestions · <${controls.resetToDefault}> reset default`
      );
    }
    const focusedRow = rows[state.focusedIndex];
    if (focusedRow?.type === "setting" && focusedRow.node._tag === "enum") {
      return dim(
        `<enter>/<space> to cycle · <esc> to cancel · <${controls.resetToDefault}> reset default`
      );
    }
    return dim(`<enter> to confirm · <esc> to cancel · <${controls.resetToDefault}> reset default`);
  }

  // Check if focused row is inside a list
  const focusedRow = rows[state.focusedIndex];
  const exitHint = state.scope.length > 0 ? "<esc> to exit scope" : "<esc> to cancel";

  if (state.searchActive) {
    return dim(`Type to search · <esc> leave search`);
  }

  if (focusedRow?.type === "list-item" || focusedRow?.type === "list-add") {
    return dim(
      `↑↓ navigate · <${controls.reorderItemUp}>/<${controls.reorderItemDown}> reorder · <${controls.deleteItem}> delete · <enter> on [+] · </> search · ${exitHint} · <${controls.collapseAll}> collapse all`
    );
  }

  if (focusedRow?.type === "extension-header" || focusedRow?.type === "group") {
    return dim(
      `<${controls.collapseExpand}> collapse/expand · <enter> to enter section · </> search · ${exitHint} · <${controls.collapseAll}> collapse all`
    );
  }

  if (focusedRow?.type === "setting") {
    const base = `<${controls.resetToDefault}> reset default · </> search · ${exitHint} · <${controls.collapseAll}> collapse all`;
    switch (focusedRow.node._tag) {
      case "boolean":
        return dim(`${base} · <enter> to toggle`);
      case "enum":
        return dim(`${base} · <enter> to cycle`);
      case "list":
      case "dict":
        return dim(`${base} · <enter> to expand/collapse`);
      default:
        return dim(`${base} · <enter> to edit`);
    }
  }

  return dim(`</> search · ${exitHint} · <${controls.collapseAll}> collapse all`);
}

// ─── Pagination counter ───────────────────────────────────────────────────────

function renderPagination(rows: ViewRow[], state: UIState, theme: Theme): string {
  const visibleSettings = countVisibleSettings(rows);
  const totalSections = countSections(rows);
  const dim = (t: string) => theme.fg("dim", t);

  if (state.scope.length > 0) {
    return dim(`(${state.focusedIndex + 1}/${visibleSettings})`);
  }

  return dim(`(${visibleSettings} of ${totalSections} section${totalSections === 1 ? "" : "s"})`);
}

// ─── List display cache ───────────────────────────────────────────────────────

/**
 * Pre-compute display strings for all expanded list settings that have a
 * `display` function. Keyed by `"extensionName:settingKey"`.
 */
function buildListDisplayCache(rows: ViewRow[], theme: Theme): Map<string, string[]> {
  const cache = new Map<string, string[]>();
  for (const row of rows) {
    if (row.type === "setting" && row.node._tag === "list" && row.node.display) {
      const key = `${row.extensionName}:${row.settingKey}`;
      const items = parseListValue(row.rawValue);
      try {
        const lines = row.node.display(items, theme);
        cache.set(key, lines);
      } catch {
        // ignore display errors
      }
    }
  }
  return cache;
}

// ─── Main render function ─────────────────────────────────────────────────────

/**
 * Render the full settings panel to a string array (one string per line).
 *
 * The panel layer is responsible for keeping `state.scrollOffset` in sync with
 * the focused row before calling this function — see
 * `SettingsPanel#syncScrollOffset`. The renderer trusts that value and only
 * clamps it defensively against the current row count.
 */
export function renderPanel(
  rows: ViewRow[],
  state: UIState,
  _registry: Registry,
  theme: Theme,
  width: number,
  controls: ControlBindings
): string[] {
  const lines: string[] = [];

  // 0. Top separator (like settings panel)
  lines.push(theme.fg("dim", "─".repeat(width)));

  // 1. Input bar
  lines.push(renderInputBar(state, theme, width));
  lines.push("");

  // 2. Visible rows (scroll offset is precomputed by the panel layer)
  const focusedRow = rows[state.focusedIndex];
  const totalRows = rows.length;
  const maxVisible = Math.min(MAX_VISIBLE_ROWS, totalRows);
  const scrollOffset = Math.max(
    0,
    Math.min(state.scrollOffset, Math.max(0, totalRows - maxVisible))
  );

  const visibleRows = rows.slice(scrollOffset, scrollOffset + maxVisible);

  // Compute label width across all visible rows
  const labelWidth = computeLabelWidth(rows);

  // Pre-compute list display strings for aligned rendering
  const listDisplayCache = buildListDisplayCache(rows, theme);

  // Is there an active add form to render inline?
  const addForm = state.addFormState;

  for (const row of visibleRows) {
    const showPointer =
      !state.searchActive || state.editState !== null || state.addFormState !== null;
    const isFocused = showPointer && row.id === focusedRow?.id;
    const isEditing =
      state.editState !== null &&
      row.type === "setting" &&
      `setting:${state.editState.extension}:${state.editState.settingKey}` === row.id;

    let line: string;

    switch (row.type) {
      case "extension-header":
        line = renderExtensionHeader(row, isFocused, theme);
        break;
      case "group":
        line = renderGroupHeader(row, isFocused, theme);
        break;
      case "setting":
        line = renderSettingRow(
          row,
          isFocused,
          isEditing,
          state.editState?.rawValue ?? "",
          labelWidth,
          width,
          theme
        );
        break;
      case "list-item": {
        const displayKey = `${row.extensionName}:${row.settingKey}`;
        const displayLine = listDisplayCache.get(displayKey)?.[row.itemIndex];
        line = renderListItemRow(row, isFocused, theme, width, displayLine);
        break;
      }
      case "list-separator":
        line = renderSeparatorRow(row.prefix, theme, width);
        break;
      case "list-add":
        line = renderListAddRow(row, isFocused, theme);
        break;
      default:
        line = "";
    }

    lines.push(line);

    // Inject autocomplete suggestions below the focused editing row
    if (isEditing && state.suggestions.length > 0) {
      for (let i = 0; i < state.suggestions.length; i++) {
        const suggestion = state.suggestions[i]!;
        const isSuggestionFocused = i === state.focusedSuggestion;
        const suggLine = isSuggestionFocused
          ? `     ${theme.bold(suggestion)}`
          : `     ${theme.fg("dim", suggestion)}`;
        lines.push(truncateToWidth(suggLine, width, "…"));
      }
    }

    // Inject add form below the list-add row
    if (row.type === "list-add" && addForm && row.settingKey === addForm.settingKey) {
      lines.push(renderSeparatorRow(row.prefix, theme, width));
      for (const fieldKey of addForm.fieldKeys) {
        const value = addForm.values[fieldKey] ?? "";
        const isFocusedField = addForm.fieldKeys[addForm.focusedFieldIndex] === fieldKey;
        const valueDisplay = isFocusedField ? `[${value || " ".repeat(14)}]` : value;
        lines.push(
          `     ${theme.fg("dim", `${fieldKey}:`)}  ${isFocusedField ? theme.bold(valueDisplay) : theme.fg("dim", valueDisplay)}`
        );
      }
      lines.push(renderSeparatorRow(row.prefix, theme, width));
    }
  }

  // Scroll indicators
  if (scrollOffset > 0 || scrollOffset + maxVisible < totalRows) {
    const pos = `${state.focusedIndex + 1}/${totalRows}`;
    lines.push(theme.fg("dim", `  (${pos})`));
  }

  lines.push("");

  // 3. Pagination counter
  lines.push(renderPagination(rows, state, theme));
  lines.push("");

  // 4. Tooltip (variable lines: description + wrapped validation + hint)
  const tooltipLines = renderTooltip(rows, state, theme, width);
  for (const tl of tooltipLines) {
    lines.push(tl);
  }

  lines.push("");

  // 5. Hint bar
  lines.push(renderHintBar(state, rows, theme, controls));

  return lines;
}
