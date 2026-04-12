/**
 * state.ts — UI state for the settings panel.
 *
 * All mutable state lives here. The UI layer uses pure functions to derive
 * new state from old state + input events.
 */

import type { LeafNode, ValidationResult } from "../../sdk/index.js";

// ─── Add form state ───────────────────────────────────────────────────────────

export interface AddFormState {
  extension: string;
  settingKey: string;
  /** Ordered list of field keys from the list node's `fields`. */
  fieldKeys: string[];
  /** Current values typed into each field. */
  values: Record<string, string>;
  /** Index of the currently focused field. */
  focusedFieldIndex: number;
}

// ─── Edit state ───────────────────────────────────────────────────────────────

export interface EditState {
  extension: string;
  settingKey: string;
  node: LeafNode;
  /** Raw string value currently in the input bar. */
  rawValue: string;
  /** Cursor position within rawValue. */
  cursor: number;
}

// ─── Validation result ────────────────────────────────────────────────────────

export type { ValidationResult };

// ─── Main UI state ────────────────────────────────────────────────────────────

export interface UIState {
  /**
   * Current scope path.
   * [] = global; ["pi-welcome"] = scoped to that extension;
   * ["pi-statusbar", "Colors"] = scoped to a sub-group.
   */
  scope: string[];
  /**
   * Previous scopes (stack) used to restore exact scope on Esc.
   */
  scopeHistory: string[][];

  /**
   * Current search / edit input bar value.
   * In search mode: the filter query.
   * In edit mode: the raw value being edited (sync'd from editState).
   */
  inputValue: string;
  /** True when the search bar is active for typing. */
  searchActive: boolean;

  /** Cursor position in the input bar. */
  inputCursor: number;

  /**
   * Collapse state: key → true means collapsed.
   * Key format:
   *   "ext:{extensionName}"           → extension header
   *   "group:{extensionName}:{key}"   → group header (top-level group key)
   */
  collapsed: Map<string, boolean>;
  /**
   * Stack of collapse states to restore when exiting scope (Esc).
   */
  scopeCollapseStack: Array<{ key: string; previous: boolean | undefined }>;

  /**
   * Set of expanded list settings.
   * Key format: "{extensionName}:{settingKey}"
   */
  expandedLists: Set<string>;

  /**
   * Focus index within the current flat row list.
   */
  focusedIndex: number;

  /**
   * When non-null, the user is editing a text/color/etc. setting inline.
   */
  editState: EditState | null;

  /**
   * When non-null, the user is filling in a new list item form.
   */
  addFormState: AddFormState | null;

  /**
   * Latest validation result for the current edit (text fields only).
   * null when not editing or validation hasn't run yet.
   */
  validation: ValidationResult | null;

  /**
   * Current autocomplete suggestions.
   * Empty array when no suggestions are available.
   */
  suggestions: string[];

  /** Index of the focused autocomplete suggestion (-1 = none). */
  focusedSuggestion: number;

  /**
   * Scroll offset: first visible row index in the flat row list.
   */
  scrollOffset: number;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/** Create the initial UI state. */
export function createInitialState(searchActive = true): UIState {
  return {
    scope: [],
    scopeHistory: [],
    inputValue: "",
    searchActive,
    inputCursor: 0,
    collapsed: new Map(),
    scopeCollapseStack: [],
    expandedLists: new Set(),
    focusedIndex: 0,
    editState: null,
    addFormState: null,
    validation: null,
    suggestions: [],
    focusedSuggestion: -1,
    scrollOffset: 0,
  };
}

// ─── State helpers ────────────────────────────────────────────────────────────

/** Get the collapse-state key for an extension header. */
export function extCollapseKey(extensionName: string): string {
  return `ext:${extensionName}`;
}

/** Get the collapse-state key for a group. */
export function groupCollapseKey(
  extensionName: string,
  groupKey: string,
): string {
  return `group:${extensionName}:${groupKey}`;
}

/** Get the list-expand key for a list setting. */
export function listExpandKey(
  extensionName: string,
  settingKey: string,
): string {
  return `${extensionName}:${settingKey}`;
}

/** Check if an extension is collapsed. */
export function isExtCollapsed(state: UIState, extensionName: string): boolean {
  return state.collapsed.get(extCollapseKey(extensionName)) ?? false;
}

/** Check if a group is collapsed. */
export function isGroupCollapsed(
  state: UIState,
  extensionName: string,
  groupKey: string,
): boolean {
  return (
    state.collapsed.get(groupCollapseKey(extensionName, groupKey)) ?? false
  );
}

/** Check if a list setting is expanded. */
export function isListExpanded(
  state: UIState,
  extensionName: string,
  settingKey: string,
): boolean {
  return state.expandedLists.has(listExpandKey(extensionName, settingKey));
}

/** Toggle collapse state for a key. Returns a new collapsed Map. */
export function toggleCollapse(
  state: UIState,
  key: string,
): Map<string, boolean> {
  const next = new Map(state.collapsed);
  next.set(key, !(state.collapsed.get(key) ?? false));
  return next;
}

/** Toggle list expansion. Returns a new Set. */
export function toggleListExpand(
  state: UIState,
  extensionName: string,
  settingKey: string,
): Set<string> {
  const key = listExpandKey(extensionName, settingKey);
  const next = new Set(state.expandedLists);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

/** Insert a character at the current cursor position, advance cursor. */
export function insertChar(
  value: string,
  cursor: number,
  char: string,
): [string, number] {
  const next = value.slice(0, cursor) + char + value.slice(cursor);
  return [next, cursor + char.length];
}

/** Delete the character before the cursor (backspace). */
export function deleteBack(value: string, cursor: number): [string, number] {
  if (cursor === 0) return [value, 0];
  const next = value.slice(0, cursor - 1) + value.slice(cursor);
  return [next, cursor - 1];
}

/** Delete the character at the cursor (forward delete). */
export function deleteForward(value: string, cursor: number): [string, number] {
  if (cursor >= value.length) return [value, cursor];
  const next = value.slice(0, cursor) + value.slice(cursor + 1);
  return [next, cursor];
}

/** Move cursor left. */
export function moveCursorLeft(cursor: number): number {
  return Math.max(0, cursor - 1);
}

/** Move cursor right. */
export function moveCursorRight(cursor: number, length: number): number {
  return Math.min(length, cursor + 1);
}

/** Move cursor to start. */
export function moveCursorHome(cursor: number): number {
  return cursor === 0 ? 0 : 0;
}

/** Move cursor to end. */
export function moveCursorEnd(length: number): number {
  return length;
}
