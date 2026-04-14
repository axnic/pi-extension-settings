/**
 * settings.ts — SettingsBlock renders the scrollable settings list.
 *
 * Handles row rendering for all ViewRow types, inline autocomplete injection,
 * inline add-form injection, and scroll indicator when rows overflow the
 * visible viewport.
 */

import type { Theme } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import type { Enum } from "../../../sdk/index.js";
import { enumLabel, enumValues } from "../../../sdk/src/core/nodes.js";
import {
  type ExtensionHeaderRow,
  type GroupRow,
  type ListAddRow,
  type ListItemRow,
  parseListValue,
  type SettingRow,
  type ViewRow,
} from "../model.js";
import type { UIState } from "../state.js";
import type { Block } from "./block.js";
import { stylePrefix } from "./utils.js";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum number of rows shown in the viewport at once. */
export const MAX_VISIBLE_ROWS = 14;

/** Maximum width of the label column (padded to align values). */
const LABEL_COL_MAX = 32;

/** Separator between label and value columns. */
const LABEL_VALUE_SEP = "  ";

// ─── Block ────────────────────────────────────────────────────────────────────

export class SettingsBlock implements Block {
  constructor(
    private readonly rows: ViewRow[],
    private readonly state: UIState,
    private readonly theme: Theme,
  ) {}

  render(width: number): string[] {
    const { rows, state, theme } = this;
    const lines: string[] = [];

    const focusedRow = rows[state.focusedIndex];
    const totalRows = rows.length;
    const maxVisible = Math.min(MAX_VISIBLE_ROWS, totalRows);
    const scrollOffset = Math.max(
      0,
      Math.min(state.scrollOffset, Math.max(0, totalRows - maxVisible)),
    );

    const visibleRows = rows.slice(scrollOffset, scrollOffset + maxVisible);
    const labelWidth = this.computeLabelWidth();
    const listDisplayCache = this.buildListDisplayCache();
    const addForm = state.addFormState;

    for (const row of visibleRows) {
      const showPointer =
        !state.searchActive ||
        state.editState !== null ||
        state.addFormState !== null;
      const isFocused = showPointer && row.id === focusedRow?.id;
      const isEditing =
        state.editState !== null &&
        row.type === "setting" &&
        `setting:${state.editState.extension}:${state.editState.settingKey}` ===
          row.id;

      let line: string;

      switch (row.type) {
        case "extension-header":
          line = this.renderExtensionHeader(row, isFocused, width);
          break;
        case "group":
          line = this.renderGroupHeader(row, isFocused, width);
          break;
        case "setting":
          line = this.renderSettingRow(
            row,
            isFocused,
            isEditing,
            state.editState?.rawValue ?? "",
            labelWidth,
            width,
          );
          break;
        case "list-item": {
          const displayKey = `${row.extensionName}:${row.settingKey}`;
          const displayLine = listDisplayCache.get(displayKey)?.[row.itemIndex];
          line = this.renderListItemRow(row, isFocused, width, displayLine);
          break;
        }
        case "list-separator":
          line = this.renderSeparatorRow(row.prefix, width);
          break;
        case "list-add":
          line = this.renderListAddRow(row, isFocused, width);
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
      if (
        row.type === "list-add" &&
        addForm &&
        row.settingKey === addForm.settingKey
      ) {
        lines.push(this.renderSeparatorRow(row.prefix, width));
        for (const fieldKey of addForm.fieldKeys) {
          const value = addForm.values[fieldKey] ?? "";
          const isFocusedField =
            addForm.fieldKeys[addForm.focusedFieldIndex] === fieldKey;
          const valueDisplay = isFocusedField
            ? `[${value || " ".repeat(14)}]`
            : value;
          lines.push(
            truncateToWidth(
              `     ${theme.fg("dim", `${fieldKey}:`)}  ${isFocusedField ? theme.bold(valueDisplay) : theme.fg("dim", valueDisplay)}`,
              width,
              "…",
            ),
          );
        }
        lines.push(this.renderSeparatorRow(row.prefix, width));
      }
    }

    // Scroll indicator (only when rows overflow the viewport)
    if (scrollOffset > 0 || scrollOffset + maxVisible < totalRows) {
      const pos = `${state.focusedIndex + 1}/${totalRows}`;
      lines.push(truncateToWidth(theme.fg("dim", `  (${pos})`), width, "…"));
    }

    return lines;
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  /** Compute the label column width for alignment across all rows. */
  private computeLabelWidth(): number {
    let max = 0;
    for (const row of this.rows) {
      if (row.type === "setting") {
        const w = visibleWidth(row.label);
        if (w > max) max = w;
      }
    }
    return Math.min(max, LABEL_COL_MAX);
  }

  /**
   * Pre-compute display strings for all expanded list settings that have a
   * `display` function. Keyed by `"extensionName:settingKey"`.
   */
  private buildListDisplayCache(): Map<string, string[]> {
    const cache = new Map<string, string[]>();
    for (const row of this.rows) {
      if (
        row.type === "setting" &&
        row.node._tag === "list" &&
        row.node.display
      ) {
        const key = `${row.extensionName}:${row.settingKey}`;
        const items = parseListValue(row.rawValue);
        try {
          const lines = row.node.display(items, this.theme);
          cache.set(key, lines);
        } catch {
          // ignore display errors
        }
      }
    }
    return cache;
  }

  private renderExtensionHeader(
    row: ExtensionHeaderRow,
    isFocused: boolean,
    width: number,
  ): string {
    const { theme } = this;
    const cursor = stylePrefix(row.prefix, isFocused, theme);
    const marker = theme.fg("accent", row.isCollapsed ? "[+]" : "[-]");
    const name = theme.bold(theme.fg("accent", row.extensionName));

    if (row.isCollapsed) {
      const count = theme.fg("dim", ` (${row.settingsCount} settings)`);
      return truncateToWidth(`${cursor + marker} ${name}${count}`, width, "…");
    }
    return truncateToWidth(`${cursor + marker} ${name}`, width, "…");
  }

  private renderGroupHeader(
    row: GroupRow,
    isFocused: boolean,
    width: number,
  ): string {
    const { theme } = this;
    const cursor = stylePrefix(row.prefix, isFocused, theme);
    const marker = theme.fg("accent", row.isCollapsed ? "[+]" : "[-]");
    const name = theme.bold(theme.fg("accent", row.label));

    if (row.isCollapsed) {
      const count = theme.fg("dim", ` (${row.settingsCount} settings)`);
      return truncateToWidth(`${cursor + marker} ${name}${count}`, width, "…");
    }
    return truncateToWidth(`${cursor + marker} ${name}`, width, "…");
  }

  /**
   * Render the value column of a setting row.
   *
   * For text nodes, the schema-level `display` hook (if any) is applied here at
   * render time so the model layer can stay theme-free. For list / dict nodes
   * the renderer falls back to the model's plain summary (e.g. "3 items
   * configured") when no list-level `display` hook is registered — the cache
   * built by {@link buildListDisplayCache} handles the alternative path.
   */
  private renderValue(
    row: SettingRow,
    isEditing: boolean,
    editValue: string,
  ): string {
    const { theme } = this;
    const node = row.node;

    if (isEditing) return editValue;

    if (node._tag === "boolean") {
      return row.rawValue === "true" ? "true" : "false";
    }

    if (node._tag === "enum") {
      return this.renderEnumValue(node, row.rawValue);
    }

    if (node._tag === "list" || node._tag === "dict") {
      return theme.fg("dim", row.displayValue);
    }

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
  private renderEnumValue(node: Enum, currentValue: string): string {
    const { theme } = this;
    const allValues = enumValues(node);
    const parts: string[] = [];

    for (const v of allValues) {
      const label = enumLabel(node, v);
      if (v === currentValue) {
        parts.push(
          theme.fg("accent", "[") + theme.bold(label) + theme.fg("accent", "]"),
        );
      } else {
        parts.push(theme.fg("dim", label));
      }
    }

    return parts.join("  ");
  }

  private renderSettingRow(
    row: SettingRow,
    isFocused: boolean,
    isEditing: boolean,
    editValue: string,
    labelWidth: number,
    width: number,
  ): string {
    const { theme } = this;
    const cursor = stylePrefix(row.prefix, isFocused, theme);
    const prefixWidth = visibleWidth(cursor);

    // Clamp the label first so rows with keys exceeding LABEL_COL_MAX don't
    // blow through the column budget before the value even starts.
    const labelClamped = truncateToWidth(row.label, labelWidth, "…");
    const labelPadded =
      labelClamped +
      " ".repeat(Math.max(0, labelWidth - visibleWidth(labelClamped)));
    const modified = row.isModified ? ` ${theme.fg("accent", "•")}` : "";
    const value = this.renderValue(row, isEditing, editValue);

    // labelPadded always occupies exactly labelWidth visible columns.
    const usedWidth = prefixWidth + labelWidth + visibleWidth(LABEL_VALUE_SEP);
    const modifiedWidth = row.isModified ? 2 : 0;
    const valueMaxWidth = Math.max(0, width - usedWidth - modifiedWidth);

    const truncatedValue = truncateToWidth(value, valueMaxWidth, "…");
    return cursor + labelPadded + LABEL_VALUE_SEP + truncatedValue + modified;
  }

  private renderListItemRow(
    row: ListItemRow,
    isFocused: boolean,
    width: number,
    displayLine?: string,
  ): string {
    const { theme } = this;
    const cursor = isFocused ? theme.fg("accent", "→") : " ";
    const indent = row.prefix.length > 0 ? row.prefix.slice(1) : "";

    if (displayLine !== undefined) {
      return truncateToWidth(cursor + indent + displayLine, width, "…");
    }

    const fields = Object.entries(row.fields);

    if (fields.length === 0)
      return truncateToWidth(`${cursor + indent}(empty)`, width, "…");

    if (fields.length === 1) {
      const [_k, v] = fields[0]!;
      return truncateToWidth(cursor + indent + v, width, "…");
    }

    const valParts = fields.map(
      ([k, v]) => `${theme.fg("dim", `${k}:`)}  ${v}`,
    );
    return truncateToWidth(cursor + indent + valParts.join("   "), width, "…");
  }

  private renderSeparatorRow(prefix: string, width: number): string {
    const { theme } = this;
    const indent = prefix.length > 0 ? prefix.slice(1) : "";
    // Reserve 1 for the leading space + indent; cap so the line stays within width.
    const sepWidth = Math.max(
      0,
      Math.min(width - 1 - visibleWidth(indent), 40),
    );
    return truncateToWidth(
      ` ${indent}${theme.fg("dim", "─".repeat(sepWidth))}`,
      width,
      "…",
    );
  }

  private renderListAddRow(
    row: ListAddRow,
    isFocused: boolean,
    width: number,
  ): string {
    const { theme } = this;
    const cursor = isFocused ? theme.fg("accent", "→") : " ";
    const indent = row.prefix.length > 0 ? row.prefix.slice(1) : "";
    return truncateToWidth(
      cursor + indent + theme.fg("dim", `+ ${row.addLabel}`),
      width,
      "…",
    );
  }
}
