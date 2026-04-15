/**
 * input.ts — Keyboard input handler for the settings panel.
 *
 * `handleInput()` is a reducer: takes current state + input → new state.
 * Side effects (saving, firing events) are performed via a callback.
 *
 * Keyboard map (from DESIGN.md):
 *   ↑ / ↓             Move focus (navigation mode)
 *   Space on header   Toggle collapse/expand (default binding)
 *   Enter on header   Enter scope
 *   Enter/Space on boolean  Toggle (live save)
 *   Enter/Space on enum     Cycle (live save)
 *   Enter on text/number    Open inline edit
 *   Enter on list/dict      Expand/collapse
 *   Esc (edit, valid)       Cancel edit
 *   Enter (edit, valid)     Confirm + save
 *   Esc (search mode)       Leave search mode
 *   / (navigation mode)     Return to search mode
 *   Enter (search mode)     Leave search mode (same as Esc)
 *   Esc (navigation, scoped) Exit one scope level
 *   Esc (navigation, global) Close panel (done callback)
 *   Backspace               Delete char in input
 *   ← / →                   Move cursor in input bar
 *   Ctrl+A / Ctrl+E         Home / End in input bar
 *   Ctrl+U                  Clear input bar
 *   r (default)             Reset focused setting to default (live save)
 *   Shift+Space (default)   Collapse all visible sections
 *   d (default, list item)  Delete item (live save)
 *   Shift+↑ / Shift+↓ (default) Reorder list item (live save)
 *   Tab (suggestions open)  Accept suggestion
 */

import { matchesKey } from "@mariozechner/pi-tui";
import type { LeafNode, ValidationResult } from "../../sdk/index.js";
import { defaultAsString, enumValues } from "../../sdk/src/core/nodes.js";
import {
  getExtensionSetting,
  setExtensionSetting,
} from "../../sdk/src/core/storage.js";
import { type ControlBindings, DEFAULT_CONTROL_BINDINGS } from "../settings.js";
import { matchesBinding } from "./keys.js";
import type { SettingRow, ViewRow } from "./model.js";
import { focusableIndices } from "./model.js";
import type { EditState, UIState } from "./state.js";
import {
  deleteBack,
  deleteForward,
  extCollapseKey,
  groupCollapseKey,
  insertChar,
  moveCursorLeft,
  moveCursorRight,
  toggleCollapse,
  toggleListExpand,
} from "./state.js";

// ─── Save callback ────────────────────────────────────────────────────────────

export type SaveCallback = (
  extension: string,
  key: string,
  value: string,
) => void;

// ─── Value conversion ─────────────────────────────────────────────────────────

/**
 * Convert a raw TUI string buffer value to the native JSON type for storage.
 * Mirrors the type information in the node schema.
 */
function rawStringToNative(node: LeafNode, raw: string): unknown {
  switch (node._tag) {
    case "boolean":
      return raw === "true";
    case "number": {
      const n = Number(raw);
      return Number.isFinite(n) ? n : node.default;
    }
    case "list":
    case "dict":
      try {
        return JSON.parse(raw);
      } catch {
        return node._tag === "list" ? [] : {};
      }
    default:
      return raw;
  }
}

// ─── Enum cycling ─────────────────────────────────────────────────────────────

function cycleEnum(row: SettingRow): string {
  if (row.node._tag !== "enum") return row.rawValue;
  const values = enumValues(row.node);
  const currentIdx = values.indexOf(row.rawValue);
  const nextIdx = (currentIdx + 1) % values.length;
  return values[nextIdx] ?? values[0] ?? row.rawValue;
}

function resetSettingToDefault(row: SettingRow, onSave: SaveCallback): void {
  const defaultValue = defaultAsString(row.node);
  setExtensionSetting(row.extensionName, row.settingKey, row.node.default);
  onSave(row.extensionName, row.settingKey, defaultValue);
}

function enterScopedSection(
  state: UIState,
  nextScope: string[],
  collapseKey: string,
): UIState {
  const collapsed = new Map(state.collapsed);
  const previous = state.collapsed.get(collapseKey);
  collapsed.set(collapseKey, false);

  return {
    ...state,
    scope: nextScope,
    scopeHistory: [...state.scopeHistory, state.scope],
    scopeCollapseStack: [
      ...state.scopeCollapseStack,
      { key: collapseKey, previous },
    ],
    collapsed,
    inputValue: "",
    inputCursor: 0,
    focusedIndex: 0,
  };
}

function collapseAllVisible(
  state: UIState,
  rows: ViewRow[],
): Map<string, boolean> {
  const collapsed = new Map(state.collapsed);
  for (const row of rows) {
    if (row.type === "extension-header") {
      collapsed.set(extCollapseKey(row.extensionName), true);
    } else if (row.type === "group") {
      collapsed.set(groupCollapseKey(row.extensionName, row.groupKey), true);
    }
  }
  return collapsed;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function runValidation(node: LeafNode, value: string): ValidationResult | null {
  if (node._tag === "number") {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return { valid: false, reason: "must be a finite number" };
    }
    return node.validation ? node.validation(n) : { valid: true };
  }
  if (node._tag !== "text" || !node.validation) {
    return { valid: true };
  }
  return node.validation(value);
}

// ─── Trigger async completer ──────────────────────────────────────────────────

let completerTimer: ReturnType<typeof setTimeout> | null = null;

async function triggerCompleter(
  node: LeafNode,
  value: string,
  onSuggestions: (suggestions: string[]) => void,
): Promise<void> {
  if (node._tag !== "text" || !node.complete) return;

  if (completerTimer !== null) {
    clearTimeout(completerTimer);
  }

  completerTimer = setTimeout(async () => {
    completerTimer = null;
    try {
      const suggestions = await node.complete?.(value);
      onSuggestions(suggestions ?? []);
    } catch {
      onSuggestions([]);
    }
  }, 250);
}

// ─── List item deletion ───────────────────────────────────────────────────────

function deleteListItem(
  extension: string,
  settingKey: string,
  itemIndex: number,
  onSave: SaveCallback,
): void {
  const raw = getExtensionSetting(extension, settingKey);
  const items = (
    Array.isArray(raw) ? [...(raw as Record<string, string>[])] : []
  ) as Record<string, string>[];
  if (itemIndex < 0 || itemIndex >= items.length) return;
  items.splice(itemIndex, 1);
  setExtensionSetting(extension, settingKey, items);
  onSave(extension, settingKey, JSON.stringify(items));
}

function moveListItem(
  extension: string,
  settingKey: string,
  itemIndex: number,
  direction: "up" | "down",
  onSave: SaveCallback,
): void {
  const raw = getExtensionSetting(extension, settingKey);
  const items = (
    Array.isArray(raw) ? [...(raw as Record<string, string>[])] : []
  ) as Record<string, string>[];
  const targetIdx = direction === "up" ? itemIndex - 1 : itemIndex + 1;
  if (targetIdx < 0 || targetIdx >= items.length) return;
  if (itemIndex < 0 || itemIndex >= items.length) return;
  [items[itemIndex], items[targetIdx]] = [items[targetIdx]!, items[itemIndex]!];
  setExtensionSetting(extension, settingKey, items);
  onSave(extension, settingKey, JSON.stringify(items));
}

// ─── Main input handler ───────────────────────────────────────────────────────

export interface InputHandlerResult {
  state: UIState;
  /** Call this to close the panel (Esc in global mode with empty query). */
  close: boolean;
  /** If true, re-run buildRows (state changed structurally). */
  dirty: boolean;
  /** Pending suggestion callback (for async completers). */
  onSuggestions?: (suggestions: string[]) => void;
}

/**
 * Handle a raw keyboard input string and return updated state.
 *
 * @param data                - Raw terminal input byte(s).
 * @param state               - Current UI state.
 * @param rows                - Current flat row list (from `buildRows`).
 * @param onSave              - Called when a value is persisted (to fire pi events).
 * @param onSuggestionsUpdate - Called when async completer suggestions arrive.
 * @param controls            - Resolved keyboard bindings; defaults to
 *                              {@link DEFAULT_CONTROL_BINDINGS} so legacy
 *                              callers (and existing tests) don't have to
 *                              supply them.
 */
export function handleInput(
  data: string,
  state: UIState,
  rows: ViewRow[],
  onSave: SaveCallback,
  onSuggestionsUpdate: (suggestions: string[]) => void,
  controls: ControlBindings = DEFAULT_CONTROL_BINDINGS,
): { state: UIState; close: boolean; dirty: boolean } {
  // ── Add form mode ────────────────────────────────────────────────────────
  if (state.addFormState) {
    return handleAddFormInput(data, state, onSave);
  }

  // ── Edit mode ────────────────────────────────────────────────────────────
  if (state.editState) {
    return handleEditInput(data, state, rows, onSave, onSuggestionsUpdate);
  }

  // ── Navigation mode ──────────────────────────────────────────────────────
  return handleNavigationInput(data, state, rows, onSave, controls);
}

// ─── Add form input ───────────────────────────────────────────────────────────

function handleAddFormInput(
  data: string,
  state: UIState,
  onSave: SaveCallback,
): { state: UIState; close: boolean; dirty: boolean } {
  const form = state.addFormState!;
  const currentFieldKey = form.fieldKeys[form.focusedFieldIndex] ?? "";

  if (matchesKey(data, "escape")) {
    return {
      state: { ...state, addFormState: null },
      close: false,
      dirty: true,
    };
  }

  if (matchesKey(data, "tab") || matchesKey(data, "shift+tab")) {
    const delta = matchesKey(data, "shift+tab") ? -1 : 1;
    const nextIndex = Math.max(
      0,
      Math.min(form.fieldKeys.length - 1, form.focusedFieldIndex + delta),
    );
    return {
      state: {
        ...state,
        addFormState: { ...form, focusedFieldIndex: nextIndex },
      },
      close: false,
      dirty: false,
    };
  }

  if (matchesKey(data, "enter")) {
    const isLastField = form.focusedFieldIndex === form.fieldKeys.length - 1;
    if (isLastField) {
      // Confirm: save the new item
      const raw = getExtensionSetting(form.extension, form.settingKey);
      const items = (
        Array.isArray(raw) ? [...(raw as Record<string, string>[])] : []
      ) as Record<string, string>[];
      items.push({ ...form.values });
      setExtensionSetting(form.extension, form.settingKey, items);
      onSave(form.extension, form.settingKey, JSON.stringify(items));
      return {
        state: { ...state, addFormState: null },
        close: false,
        dirty: true,
      };
    }
    // Move to next field
    return {
      state: {
        ...state,
        addFormState: {
          ...form,
          focusedFieldIndex: form.focusedFieldIndex + 1,
        },
      },
      close: false,
      dirty: false,
    };
  }

  if (matchesKey(data, "backspace")) {
    const currentValue = form.values[currentFieldKey] ?? "";
    const newValues = {
      ...form.values,
      [currentFieldKey]: currentValue.slice(0, -1),
    };
    return {
      state: { ...state, addFormState: { ...form, values: newValues } },
      close: false,
      dirty: false,
    };
  }

  // Printable character
  if (data.length === 1 && data.charCodeAt(0) >= 32) {
    const currentValue = form.values[currentFieldKey] ?? "";
    const newValues = {
      ...form.values,
      [currentFieldKey]: currentValue + data,
    };
    return {
      state: { ...state, addFormState: { ...form, values: newValues } },
      close: false,
      dirty: false,
    };
  }

  return { state, close: false, dirty: false };
}

// ─── Edit mode input ──────────────────────────────────────────────────────────

function handleEditInput(
  data: string,
  state: UIState,
  _rows: ViewRow[],
  onSave: SaveCallback,
  onSuggestionsUpdate: (suggestions: string[]) => void,
): { state: UIState; close: boolean; dirty: boolean } {
  const edit = state.editState!;

  // Dismiss autocomplete with Esc (first Esc), then cancel edit (second Esc)
  if (matchesKey(data, "escape")) {
    if (state.suggestions.length > 0) {
      return {
        state: { ...state, suggestions: [], focusedSuggestion: -1 },
        close: false,
        dirty: false,
      };
    }
    // Cancel edit — restore previous value
    return {
      state: {
        ...state,
        editState: null,
        validation: null,
        suggestions: [],
        focusedSuggestion: -1,
      },
      close: false,
      dirty: true,
    };
  }

  // Accept autocomplete suggestion with Tab
  if (matchesKey(data, "tab") && state.suggestions.length > 0) {
    const idx = state.focusedSuggestion >= 0 ? state.focusedSuggestion : 0;
    const suggestion = state.suggestions[idx];
    if (suggestion) {
      const newEdit: EditState = {
        ...edit,
        rawValue: suggestion,
        cursor: suggestion.length,
      };
      const validation = runValidation(edit.node, suggestion);
      return {
        state: {
          ...state,
          editState: newEdit,
          validation,
          suggestions: [],
          focusedSuggestion: -1,
        },
        close: false,
        dirty: true,
      };
    }
  }

  // Navigate autocomplete suggestions with ↑/↓
  if (state.suggestions.length > 0) {
    if (matchesKey(data, "up")) {
      const idx = Math.max(-1, state.focusedSuggestion - 1);
      return {
        state: { ...state, focusedSuggestion: idx },
        close: false,
        dirty: false,
      };
    }
    if (matchesKey(data, "down")) {
      const idx = Math.min(
        state.suggestions.length - 1,
        state.focusedSuggestion + 1,
      );
      return {
        state: { ...state, focusedSuggestion: idx },
        close: false,
        dirty: false,
      };
    }
  }

  // Confirm edit with Enter (only if validation passes)
  if (matchesKey(data, "enter")) {
    const validation = runValidation(edit.node, edit.rawValue);
    if (validation && !validation.valid) {
      // Block confirmation — show validation error
      return { state: { ...state, validation }, close: false, dirty: false };
    }

    // Run transform if available
    let finalValue = edit.rawValue;
    if (edit.node._tag === "text" && edit.node.transform) {
      try {
        finalValue = edit.node.transform(finalValue);
      } catch {
        // ignore transform errors
      }
    }

    // Save
    setExtensionSetting(
      edit.extension,
      edit.settingKey,
      rawStringToNative(edit.node, finalValue),
    );
    onSave(edit.extension, edit.settingKey, finalValue);

    return {
      state: {
        ...state,
        editState: null,
        validation: null,
        suggestions: [],
        focusedSuggestion: -1,
      },
      close: false,
      dirty: true,
    };
  }

  // Cursor movement (← →)
  if (matchesKey(data, "left")) {
    const cursor = moveCursorLeft(edit.cursor);
    return {
      state: { ...state, editState: { ...edit, cursor } },
      close: false,
      dirty: false,
    };
  }
  if (matchesKey(data, "right")) {
    const cursor = moveCursorRight(edit.cursor, edit.rawValue.length);
    return {
      state: { ...state, editState: { ...edit, cursor } },
      close: false,
      dirty: false,
    };
  }
  if (matchesKey(data, "home") || matchesKey(data, "ctrl+a")) {
    return {
      state: { ...state, editState: { ...edit, cursor: 0 } },
      close: false,
      dirty: false,
    };
  }
  if (matchesKey(data, "end") || matchesKey(data, "ctrl+e")) {
    return {
      state: { ...state, editState: { ...edit, cursor: edit.rawValue.length } },
      close: false,
      dirty: false,
    };
  }

  // Backspace
  if (matchesKey(data, "backspace")) {
    const [newValue, newCursor] = deleteBack(edit.rawValue, edit.cursor);
    const newEdit: EditState = {
      ...edit,
      rawValue: newValue,
      cursor: newCursor,
    };
    const validation = runValidation(edit.node, newValue);
    // Trigger completer
    triggerCompleter(edit.node, newValue, onSuggestionsUpdate);
    return {
      state: { ...state, editState: newEdit, validation },
      close: false,
      dirty: true,
    };
  }

  // Forward delete
  if (matchesKey(data, "delete")) {
    const [newValue, newCursor] = deleteForward(edit.rawValue, edit.cursor);
    const newEdit: EditState = {
      ...edit,
      rawValue: newValue,
      cursor: newCursor,
    };
    const validation = runValidation(edit.node, newValue);
    return {
      state: { ...state, editState: newEdit, validation },
      close: false,
      dirty: true,
    };
  }

  // Ctrl+U — clear input
  if (matchesKey(data, "ctrl+u")) {
    const newEdit: EditState = { ...edit, rawValue: "", cursor: 0 };
    return {
      state: {
        ...state,
        editState: newEdit,
        validation: null,
        suggestions: [],
      },
      close: false,
      dirty: true,
    };
  }

  // Printable character (including Kitty protocol decoded chars)
  const char = decodePrintable(data);
  if (char) {
    const [newValue, newCursor] = insertChar(edit.rawValue, edit.cursor, char);
    const newEdit: EditState = {
      ...edit,
      rawValue: newValue,
      cursor: newCursor,
    };
    const validation = runValidation(edit.node, newValue);
    // Trigger completer async
    triggerCompleter(edit.node, newValue, onSuggestionsUpdate);
    return {
      state: { ...state, editState: newEdit, validation },
      close: false,
      dirty: true,
    };
  }

  return { state, close: false, dirty: false };
}

// ─── Navigation mode input ────────────────────────────────────────────────────

function handleNavigationInput(
  data: string,
  state: UIState,
  rows: ViewRow[],
  onSave: SaveCallback,
  controls: ControlBindings,
): { state: UIState; close: boolean; dirty: boolean } {
  const focusableIdxs = focusableIndices(rows);
  const currentFocusablePos = focusableIdxs.indexOf(state.focusedIndex);
  const focusedRow = rows[state.focusedIndex];

  // Search mode: type/edit query only.
  if (state.searchActive) {
    // Esc exits search mode, preserving query.
    if (matchesKey(data, "escape")) {
      return {
        state: { ...state, searchActive: false },
        close: false,
        dirty: false,
      };
    }

    // Enter exits search mode (same as Esc), preserving the query.
    if (matchesKey(data, "enter")) {
      return {
        state: { ...state, searchActive: false },
        close: false,
        dirty: false,
      };
    }

    // Up/Down do nothing in search mode.
    if (matchesKey(data, "up") || matchesKey(data, "down")) {
      return { state, close: false, dirty: false };
    }

    // Cursor movement in search bar
    if (matchesKey(data, "left")) {
      return {
        state: { ...state, inputCursor: moveCursorLeft(state.inputCursor) },
        close: false,
        dirty: false,
      };
    }
    if (matchesKey(data, "right")) {
      return {
        state: {
          ...state,
          inputCursor: moveCursorRight(
            state.inputCursor,
            state.inputValue.length,
          ),
        },
        close: false,
        dirty: false,
      };
    }
    if (matchesKey(data, "home") || matchesKey(data, "ctrl+a")) {
      return {
        state: { ...state, inputCursor: 0 },
        close: false,
        dirty: false,
      };
    }
    if (matchesKey(data, "end") || matchesKey(data, "ctrl+e")) {
      return {
        state: { ...state, inputCursor: state.inputValue.length },
        close: false,
        dirty: false,
      };
    }

    // Backspace in search bar
    if (matchesKey(data, "backspace")) {
      const [newValue, newCursor] = deleteBack(
        state.inputValue,
        state.inputCursor,
      );
      return {
        state: {
          ...state,
          inputValue: newValue,
          inputCursor: newCursor,
          focusedIndex: 0,
        },
        close: false,
        dirty: true,
      };
    }

    // Ctrl+U — clear search bar
    if (matchesKey(data, "ctrl+u")) {
      return {
        state: { ...state, inputValue: "", inputCursor: 0, focusedIndex: 0 },
        close: false,
        dirty: true,
      };
    }

    // Printable character — type in search bar
    const char = decodePrintable(data);
    if (char) {
      const [newValue, newCursor] = insertChar(
        state.inputValue,
        state.inputCursor,
        char,
      );
      return {
        state: {
          ...state,
          inputValue: newValue,
          inputCursor: newCursor,
          focusedIndex: 0,
        },
        close: false,
        dirty: true,
      };
    }

    return { state, close: false, dirty: false };
  }

  // Navigation mode: "/" enters search mode without clearing query.
  if (decodePrintable(data) === "/") {
    return {
      state: {
        ...state,
        searchActive: true,
        inputCursor: Math.min(state.inputCursor, state.inputValue.length),
      },
      close: false,
      dirty: false,
    };
  }

  // ↑ Move focus up
  if (matchesKey(data, "up")) {
    if (focusableIdxs.length === 0)
      return { state, close: false, dirty: false };
    const prevPos =
      currentFocusablePos <= 0
        ? focusableIdxs.length - 1
        : currentFocusablePos - 1;
    const newFocusedIndex = focusableIdxs[prevPos] ?? 0;
    return {
      state: { ...state, focusedIndex: newFocusedIndex },
      close: false,
      dirty: false,
    };
  }

  // ↓ Move focus down
  if (matchesKey(data, "down")) {
    if (focusableIdxs.length === 0)
      return { state, close: false, dirty: false };
    const nextPos =
      currentFocusablePos >= focusableIdxs.length - 1
        ? 0
        : currentFocusablePos + 1;
    const newFocusedIndex = focusableIdxs[nextPos] ?? 0;
    return {
      state: { ...state, focusedIndex: newFocusedIndex },
      close: false,
      dirty: false,
    };
  }

  if (
    focusedRow?.type === "setting" &&
    matchesBinding(data, controls.resetToDefault)
  ) {
    resetSettingToDefault(focusedRow, onSave);
    return {
      state,
      close: false,
      dirty: true,
    };
  }

  if (matchesBinding(data, controls.collapseAll)) {
    return {
      state: {
        ...state,
        collapsed: collapseAllVisible(state, rows),
        focusedIndex: 0,
      },
      close: false,
      dirty: true,
    };
  }

  // Configured keys — reorder list items
  if (
    focusedRow?.type === "list-item" &&
    matchesBinding(data, controls.reorderItemUp)
  ) {
    moveListItem(
      focusedRow.extensionName,
      focusedRow.settingKey,
      focusedRow.itemIndex,
      "up",
      onSave,
    );
    // Move focus up by one to follow the item
    const prevPos = currentFocusablePos <= 0 ? 0 : currentFocusablePos - 1;
    const newFocusedIndex = focusableIdxs[prevPos] ?? state.focusedIndex;
    return {
      state: { ...state, focusedIndex: newFocusedIndex },
      close: false,
      dirty: true,
    };
  }
  if (
    focusedRow?.type === "list-item" &&
    matchesBinding(data, controls.reorderItemDown)
  ) {
    moveListItem(
      focusedRow.extensionName,
      focusedRow.settingKey,
      focusedRow.itemIndex,
      "down",
      onSave,
    );
    const nextPos =
      currentFocusablePos >= focusableIdxs.length - 1
        ? focusableIdxs.length - 1
        : currentFocusablePos + 1;
    const newFocusedIndex = focusableIdxs[nextPos] ?? state.focusedIndex;
    return {
      state: { ...state, focusedIndex: newFocusedIndex },
      close: false,
      dirty: true,
    };
  }

  // Configured key — delete list item
  if (
    matchesBinding(data, controls.deleteItem) &&
    focusedRow?.type === "list-item"
  ) {
    deleteListItem(
      focusedRow.extensionName,
      focusedRow.settingKey,
      focusedRow.itemIndex,
      onSave,
    );
    // Move focus to previous focusable row
    const prevPos = currentFocusablePos <= 0 ? 0 : currentFocusablePos - 1;
    const newFocusedIndex = focusableIdxs[prevPos] ?? 0;
    return {
      state: { ...state, focusedIndex: newFocusedIndex },
      close: false,
      dirty: true,
    };
  }

  // Configured collapse/expand key — toggle collapse on headers, toggle boolean/enum on settings
  if (matchesBinding(data, controls.collapseExpand)) {
    return handleSpaceKey(state, focusedRow, rows, onSave);
  }

  // Enter — main action key
  if (matchesKey(data, "enter")) {
    return handleEnterKey(state, focusedRow, rows, onSave);
  }

  // Esc — exit scope / close panel (search mode handled earlier)
  if (matchesKey(data, "escape")) {
    // If scoped, exit one scope level
    if (state.scope.length > 0) {
      const newScope =
        state.scopeHistory.length > 0
          ? state.scopeHistory[state.scopeHistory.length - 1]!
          : state.scope.slice(0, -1);
      const newScopeHistory =
        state.scopeHistory.length > 0 ? state.scopeHistory.slice(0, -1) : [];
      let collapsed = state.collapsed;
      let scopeCollapseStack = state.scopeCollapseStack;
      if (state.scopeCollapseStack.length > 0) {
        const restore =
          state.scopeCollapseStack[state.scopeCollapseStack.length - 1]!;
        collapsed = new Map(state.collapsed);
        if (restore.previous === undefined) {
          collapsed.delete(restore.key);
        } else {
          collapsed.set(restore.key, restore.previous);
        }
        scopeCollapseStack = state.scopeCollapseStack.slice(0, -1);
      }
      return {
        state: {
          ...state,
          scope: newScope,
          scopeHistory: newScopeHistory,
          collapsed,
          scopeCollapseStack,
          focusedIndex: 0,
        },
        close: false,
        dirty: true,
      };
    }
    // Close panel
    return { state, close: true, dirty: false };
  }

  return { state, close: false, dirty: false };
}

// ─── Space key handler ────────────────────────────────────────────────────────

function handleSpaceKey(
  state: UIState,
  focusedRow: ViewRow | undefined,
  _rows: ViewRow[],
  onSave: SaveCallback,
): { state: UIState; close: boolean; dirty: boolean } {
  if (!focusedRow) return { state, close: false, dirty: false };

  if (focusedRow.type === "extension-header") {
    const key = extCollapseKey(focusedRow.extensionName);
    const collapsed = toggleCollapse(state, key);
    return { state: { ...state, collapsed }, close: false, dirty: true };
  }

  if (focusedRow.type === "group") {
    const key = groupCollapseKey(focusedRow.extensionName, focusedRow.groupKey);
    const collapsed = toggleCollapse(state, key);
    return { state: { ...state, collapsed }, close: false, dirty: true };
  }

  if (focusedRow.type === "setting") {
    const { node, extensionName, settingKey } = focusedRow;

    if (node._tag === "boolean") {
      const nativeBool = focusedRow.rawValue !== "true";
      const displayValue = nativeBool ? "true" : "false";
      setExtensionSetting(extensionName, settingKey, nativeBool);
      onSave(extensionName, settingKey, displayValue);
      return { state, close: false, dirty: true };
    }

    if (node._tag === "enum") {
      const newValue = cycleEnum(focusedRow);
      setExtensionSetting(extensionName, settingKey, newValue);
      onSave(extensionName, settingKey, newValue);
      return { state, close: false, dirty: true };
    }
  }

  return { state, close: false, dirty: false };
}

// ─── Enter key handler ────────────────────────────────────────────────────────

function handleEnterKey(
  state: UIState,
  focusedRow: ViewRow | undefined,
  _rows: ViewRow[],
  onSave: SaveCallback,
): { state: UIState; close: boolean; dirty: boolean } {
  if (!focusedRow) return { state, close: false, dirty: false };

  if (focusedRow.type === "extension-header") {
    if (state.scope.length > 0 && state.scope[0] === focusedRow.extensionName) {
      return { state, close: false, dirty: false };
    }
    return {
      state: enterScopedSection(
        state,
        [focusedRow.extensionName],
        extCollapseKey(focusedRow.extensionName),
      ),
      close: false,
      dirty: true,
    };
  }

  if (focusedRow.type === "group") {
    const newScope = [focusedRow.extensionName, focusedRow.groupKey];
    const isAlreadyScopedHere =
      state.scope.length >= 2 &&
      state.scope[0] === focusedRow.extensionName &&
      state.scope[1] === focusedRow.groupKey;

    if (isAlreadyScopedHere) {
      return { state, close: false, dirty: false };
    }

    return {
      state: enterScopedSection(
        state,
        newScope,
        groupCollapseKey(focusedRow.extensionName, focusedRow.groupKey),
      ),
      close: false,
      dirty: true,
    };
  }

  if (focusedRow.type === "setting") {
    const { node, extensionName, settingKey } = focusedRow;

    if (node._tag === "boolean") {
      const nativeBool = focusedRow.rawValue !== "true";
      const displayValue = nativeBool ? "true" : "false";
      setExtensionSetting(extensionName, settingKey, nativeBool);
      onSave(extensionName, settingKey, displayValue);
      return { state, close: false, dirty: true };
    }

    if (node._tag === "enum") {
      const newValue = cycleEnum(focusedRow);
      setExtensionSetting(extensionName, settingKey, newValue);
      onSave(extensionName, settingKey, newValue);
      return { state, close: false, dirty: true };
    }

    if (node._tag === "text" || node._tag === "number") {
      // Start inline edit
      const editState: EditState = {
        extension: extensionName,
        settingKey,
        node,
        rawValue: focusedRow.rawValue,
        cursor: focusedRow.rawValue.length,
      };
      return {
        state: {
          ...state,
          editState,
          validation: null,
          suggestions: [],
          focusedSuggestion: -1,
        },
        close: false,
        dirty: true,
      };
    }

    if (node._tag === "list" || node._tag === "dict") {
      // Toggle list expansion
      const expandedLists = toggleListExpand(state, extensionName, settingKey);
      return { state: { ...state, expandedLists }, close: false, dirty: true };
    }
  }

  if (focusedRow.type === "list-add") {
    // This case is intercepted by panel.ts before handleInput is called,
    // because opening the add form requires the list node from the registry.
    return { state, close: false, dirty: false };
  }

  return { state, close: false, dirty: false };
}

// ─── Printable character decoder ──────────────────────────────────────────────

/**
 * Decode a raw input byte to a printable character.
 * Handles plain ASCII and basic Kitty protocol sequences.
 */
function decodePrintable(data: string): string | undefined {
  if (data.length === 1) {
    const code = data.charCodeAt(0);
    // Printable ASCII (space = 32, but we exclude it in search mode)
    if (code >= 32 && code < 127) return data;
    return undefined;
  }

  // Multi-byte UTF-8 characters
  if (data.length > 1 && !data.startsWith("\x1b")) {
    return data;
  }

  return undefined;
}
