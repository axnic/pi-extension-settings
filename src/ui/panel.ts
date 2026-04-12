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
    // Sync scroll offset before handing over to the renderer.
    this.state = this.syncScrollOffset(this.state, this.rows);

    return renderPanel(
      this.rows,
      this.state,
      this.registry,
      this.getTheme(),
      width,
      this.settingsReader.controls,
    );
  }

  handleInput(data: string): void {
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
      // onSave: fire pi event to notify consumers of the change.
      (extension, key, value) => {
        this.pi.events.emit("pi-extension-settings:changed", {
          extension,
          key,
          value,
        });
      },
      // onSuggestionsUpdate: update state with new completer suggestions.
      (suggestions) => {
        this.state = { ...this.state, suggestions, focusedSuggestion: -1 };
      },
      this.settingsReader.controls,
    );

    this.state = state;

    if (close && this.done) {
      this.done();
      return;
    }

    if (dirty) {
      this.rows = buildRows(this.registry, this.state);
      this.state = this.clampFocus(this.state, this.rows);
    }
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
  private syncScrollOffset(state: UIState, rows: ViewRow[]): UIState {
    const totalRows = rows.length;
    const maxVisible = Math.min(MAX_VISIBLE_ROWS, totalRows);
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
