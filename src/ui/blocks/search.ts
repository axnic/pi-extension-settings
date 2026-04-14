/**
 * search.ts — SearchBlock renders the top input/search bar.
 *
 * Displays either the active search query or the current edit value, with a
 * blinking-cursor approximation (reverse-video character) and a scope breadcrumb.
 */

import type { Theme } from "@mariozechner/pi-coding-agent";
import { truncateToWidth } from "@mariozechner/pi-tui";
import type { UIState } from "../state.js";
import type { Block } from "./block.js";

export class SearchBlock implements Block {
  constructor(
    private readonly state: UIState,
    private readonly theme: Theme,
  ) {}

  render(width: number): string[] {
    return [this.renderInputBar(width)];
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private expandScopePath(scope: string[]): string[] {
    if (scope.length === 0) return [];
    const [extension, ...rest] = scope;
    const expanded: string[] = extension ? [extension] : [];
    for (const part of rest) {
      expanded.push(...part.split(".").filter((segment) => segment.length > 0));
    }
    return expanded;
  }

  /**
   * Render the input bar line.
   * Format:
   *   Search mode (global):   "> {query}█"
   *   Search mode (scoped):   "> (ext) {query}█"    ← parens and > are dim
   *   Edit mode:              "> ({ext}) {rawValue}█"
   */
  private renderInputBar(width: number): string {
    const { state, theme } = this;
    const dim = (t: string) => theme.fg("dim", t);

    let prefix = "> ";
    const scope = state.editState
      ? [state.editState.extension, ...state.scope.slice(1)]
      : state.scope;

    if (scope.length > 0) {
      const parts = this.expandScopePath(scope).join(dim(" > "));
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
}
