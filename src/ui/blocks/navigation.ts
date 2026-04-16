/**
 * navigation.ts — NavigationBlock renders the bottom hint bar.
 *
 * The hint bar is context-sensitive: it shows different keybinding hints
 * depending on the current mode (edit, add form, search, navigation) and
 * the type of the focused row. Hint items are listed from most to least
 * important — the progressive truncation in renderNavigationHint drops
 * rightmost items when the available width is insufficient.
 */

import type { Theme } from "@mariozechner/pi-coding-agent";
import type { ControlBindings } from "../../settings.js";
import type { ViewRow } from "../model.js";
import type { UIState } from "../state.js";
import type { Block } from "./block.js";
import { renderNavigationHint } from "./utils.js";

export class NavigationBlock implements Block {
  constructor(
    private readonly rows: ViewRow[],
    private readonly state: UIState,
    private readonly theme: Theme,
    private readonly controls: ControlBindings,
  ) {}

  render(width: number): string[] {
    return [this.renderHintBar(width)];
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private renderHintBar(width: number): string {
    const { state, rows, theme, controls } = this;
    const dim = (t: string) => theme.fg("dim", t);
    const hint = (items: string[]) => dim(renderNavigationHint(items, width));

    if (state.addFormState) {
      return hint(["<tab> next field", "<enter> confirm", "<esc> cancel"]);
    }

    if (state.editState) {
      if (state.suggestions.length > 0) {
        return hint([
          "<enter> to confirm",
          "<esc> dismiss suggestions / exit edit",
          `<${controls.resetToDefault}> reset default`,
        ]);
      }
      const focusedRow = rows[state.focusedIndex];
      if (focusedRow?.type === "setting" && focusedRow.node._tag === "enum") {
        return hint([
          "<enter>/<space> to cycle",
          "<esc> to cancel",
          `<${controls.resetToDefault}> reset default`,
        ]);
      }
      return hint([
        "<enter> to confirm",
        "<esc> to cancel",
        `<${controls.resetToDefault}> reset default`,
      ]);
    }

    const focusedRow = rows[state.focusedIndex];
    const exitHint =
      state.scope.length > 0 ? "<esc> to exit scope" : "<esc> to cancel";

    if (state.searchActive) {
      return hint(["Type to search", "<esc> leave search"]);
    }

    if (focusedRow?.type === "list-item" || focusedRow?.type === "list-add") {
      return hint([
        "↑↓ navigate",
        `<${controls.reorderItemUp}>/<${controls.reorderItemDown}> reorder`,
        `<${controls.deleteItem}> delete`,
        "<enter> on [+]",
        "</> search",
        exitHint,
        `<${controls.collapseAll}> collapse all`,
      ]);
    }

    if (
      focusedRow?.type === "extension-header" ||
      focusedRow?.type === "group"
    ) {
      return hint([
        `<${controls.collapseExpand}> collapse/expand`,
        "<enter> to enter section",
        "</> search",
        exitHint,
        `<${controls.collapseAll}> collapse all`,
      ]);
    }

    if (focusedRow?.type === "setting") {
      const actionHint = (() => {
        switch (focusedRow.node._tag) {
          case "boolean":
            return "<enter> to toggle";
          case "enum":
            return "<enter> to cycle";
          case "list":
          case "dict":
            return "<enter> to expand/collapse";
          default:
            return "<enter> to edit";
        }
      })();
      const scrollHint = focusedRow.node.documentation
        ? `<${controls.scrollDescUp}>/<${controls.scrollDescDown}> scroll doc`
        : null;

      return hint([
        actionHint,
        `<${controls.resetToDefault}> reset default`,
        "</> search",
        exitHint,
        `<${controls.collapseAll}> collapse all`,
        ...(scrollHint ? [scrollHint] : []),
      ]);
    }

    return hint([
      "</> search",
      exitHint,
      `<${controls.collapseAll}> collapse all`,
    ]);
  }
}
