/**
 * panel.ts — `SettingsPanel`: the main TUI Component for the settings panel.
 *
 * Owns the {@link UIState}, delegates row building to {@link buildRows}
 * (`./model.js`), rendering to {@link renderPanel} (`./renderer.js`) and
 * keyboard handling to {@link processKeyInput} (`./input.js`).
 *
 * The panel is a thin orchestrator: it pulls the latest configured keyboard
 * controls and the start-mode flag from a {@link SettingsReader} (which is
 * itself backed by an `ExtensionSettings` instance — the extension dog-foods
 * its own SDK), then forwards them to the rendering / input layers.
 *
 * It also owns the add-form lifecycle, which requires resolving the underlying
 * `List` node from the registry — something the pure input handler can't do
 * on its own.
 */

import type { ExtensionAPI, Theme } from "@mariozechner/pi-coding-agent";
import { type Component, matchesKey } from "@mariozechner/pi-tui";
import type { List, ListItem, SettingNode } from "../../sdk/index.js";
import type { Registry } from "../core/registry.js";
import type { SettingsReader } from "../settings.js";
import { descriptionLineCount } from "./blocks/description.js";
import { handleInput as processKeyInput } from "./input.js";
import { buildRows, type ViewRow } from "./model.js";
import { MAX_VISIBLE_ROWS, renderPanel } from "./renderer.js";
import type { AddFormState, UIState } from "./state.js";
import { createInitialState } from "./state.js";

export class SettingsPanel implements Component {
  private state: UIState;
  private rows: ViewRow[] = [];
  private readonly pi: ExtensionAPI;
  private readonly registry: Registry;
  private readonly getTheme: () => Theme;
  private readonly settingsReader: SettingsReader;
  private done: ((result?: unknown) => void) | null = null;

  constructor(
    registry: Registry,
    pi: ExtensionAPI,
    getTheme: () => Theme,
    settingsReader: SettingsReader,
  ) {
    this.registry = registry;
    this.pi = pi;
    this.getTheme = getTheme;
    this.settingsReader = settingsReader;
    this.state = createInitialState(settingsReader.startInSearchMode);
    this.rows = buildRows(registry, this.state);
    if (this.rows.length > 0) this.state = { ...this.state, focusedIndex: 0 };
  }

  /** Set the done callback (called when panel should close). */
  setDone(done: (result?: unknown) => void): void {
    this.done = done;
  }

  invalidate(): void {
    this.rows = buildRows(this.registry, this.state);
  }

  render(width: number): string[] {
    // Rebuild rows every render to reflect latest storage state.
    this.rows = buildRows(this.registry, this.state);
    const maxVisibleRows = this.settingsReader.maxVisibleRows;
    // Sync scroll offset before handing over to the renderer.
    this.state = this.syncScrollOffset(this.state, this.rows, maxVisibleRows);

    return renderPanel(
      this.rows,
      this.state,
      this.registry,
      this.getTheme(),
      width,
      this.settingsReader.controls,
      maxVisibleRows,
    );
  }

  handleInput(data: string): void {
    // Scroll the description panel with Shift+Up / Shift+Down in navigation mode.
    if (
      !this.state.editState &&
      !this.state.addFormState &&
      !this.state.searchActive
    ) {
      if (matchesKey(data, "shift+up")) {
        this.state = {
          ...this.state,
          descScrollOffset: Math.max(0, this.state.descScrollOffset - 1),
        };
        return;
      }
      if (matchesKey(data, "shift+down")) {
        const focusedRow = this.rows[this.state.focusedIndex];
        const rightWidth = this.descColumnWidth();
        const totalLines =
          rightWidth > 0 ? descriptionLineCount(focusedRow, rightWidth) : 0;
        this.state = {
          ...this.state,
          descScrollOffset: Math.min(
            Math.max(0, totalLines - 1),
            this.state.descScrollOffset + 1,
          ),
        };
        return;
      }
    }

    const focusedRow = this.rows[this.state.focusedIndex];

    // Special case: Enter on list-add row — build the add form. This needs
    // the actual list node from the registry, which the pure input handler
    // doesn't have access to, so it has to live here.
    if (
      matchesKey(data, "enter") &&
      focusedRow?.type === "list-add" &&
      !this.state.editState &&
      !this.state.addFormState
    ) {
      const listNode = this.findListNode(
        focusedRow.extensionName,
        focusedRow.settingKey,
      );
      if (listNode) {
        const fieldKeys = Object.keys(listNode.items.properties);
        const addFormState: AddFormState = {
          extension: focusedRow.extensionName,
          settingKey: focusedRow.settingKey,
          fieldKeys,
          values: Object.fromEntries(fieldKeys.map((k) => [k, ""])),
          focusedFieldIndex: 0,
        };
        this.state = { ...this.state, addFormState };
        return;
      }
    }

    const { state, close, dirty } = processKeyInput(
      data,
      this.state,
      this.rows,
      // onSave: fire pi event (scoped to this extension) to notify consumers of the change.
      (extension, key, _value) => {
        this.pi.events.emit(`pi-extension-settings:${extension}:changed`, {
          key,
        });
      },
      // onSuggestionsUpdate: update state with new completer suggestions.
      (suggestions) => {
        this.state = { ...this.state, suggestions, focusedSuggestion: -1 };
      },
      this.settingsReader.controls,
    );

    // Reset description scroll when focus moves to a different row.
    const nextState =
      state.focusedIndex !== this.state.focusedIndex
        ? { ...state, descScrollOffset: 0 }
        : state;
    this.state = nextState;

    if (close && this.done) {
      this.done();
      return;
    }

    if (dirty) {
      this.rows = buildRows(this.registry, this.state);
      this.state = this.clampFocus(this.state, this.rows);
    }
  }

  /**
   * Estimate the right (description) column width for scroll-clamping purposes.
   *
   * The exact width is only known at render time; this uses a conservative
   * 80-column assumption which is acceptable since the result only affects the
   * upper bound of `descScrollOffset` clamping — a best-effort operation.
   */
  private descColumnWidth(): number {
    const assumedTotal = 80;
    const candidateLeft = Math.floor((assumedTotal * 2) / 3);
    const candidateRight = assumedTotal - candidateLeft - 1;
    // Mirror the MIN_DESC_WIDTH threshold used in renderer.ts
    return candidateRight >= 20 ? candidateRight : 0;
  }

  /** Find the `List` node for a given extension + dotted setting key. */
  private findListNode(
    extensionName: string,
    settingKey: string,
  ): List<ListItem> | null {
    const nodes = this.registry.get(extensionName);
    if (!nodes) return null;

    const parts = settingKey.split(".");
    let current: Record<string, SettingNode> = nodes;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      const node = current[part];
      if (!node || node._tag !== "section") return null;
      current = node.children;
    }

    const lastKey = parts[parts.length - 1]!;
    const node = current[lastKey];
    if (!node || node._tag !== "list") return null;
    return node as List<ListItem>;
  }

  /** Sync scroll offset to keep the focused row in the viewport. */
  private syncScrollOffset(
    state: UIState,
    rows: ViewRow[],
    maxVisibleRows: number = MAX_VISIBLE_ROWS,
  ): UIState {
    const totalRows = rows.length;
    const maxVisible = Math.min(maxVisibleRows, totalRows);
    let scrollOffset = state.scrollOffset;

    if (state.focusedIndex < scrollOffset) {
      scrollOffset = state.focusedIndex;
    } else if (state.focusedIndex >= scrollOffset + maxVisible) {
      scrollOffset = state.focusedIndex - maxVisible + 1;
    }
    scrollOffset = Math.max(
      0,
      Math.min(scrollOffset, Math.max(0, totalRows - maxVisible)),
    );

    if (scrollOffset !== state.scrollOffset) {
      return { ...state, scrollOffset };
    }
    return state;
  }

  /** Clamp the focus index to a valid focusable row. */
  private clampFocus(state: UIState, rows: ViewRow[]): UIState {
    if (rows.length === 0) return { ...state, focusedIndex: 0 };

    const focusable = rows.filter((r) => r.focusable);
    if (focusable.length === 0) return { ...state, focusedIndex: 0 };

    const currentFocused = rows[state.focusedIndex];
    if (currentFocused?.focusable) {
      return state;
    }

    let closest = 0;
    let minDist = Infinity;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i]?.focusable) {
        const dist = Math.abs(i - state.focusedIndex);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      }
    }

    return { ...state, focusedIndex: closest };
  }
}
