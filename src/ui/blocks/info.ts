/**
 * info.ts — InfoBlock renders the pagination counter and tooltip area.
 *
 * Output structure:
 *   [pagination line]
 *   [empty line]
 *   [tooltip description line]
 *   [validation / type hint lines (may wrap)]
 *   [autocomplete hint line, if suggestions are open]
 */

import type { Theme, ThemeColor } from "@mariozechner/pi-coding-agent";
import { countSections, countVisibleSettings, type ViewRow } from "../model.js";
import type { UIState } from "../state.js";
import type { Block } from "./block.js";
import { renderNavigationHint, wrapText } from "./utils.js";

export class InfoBlock implements Block {
  constructor(
    private readonly rows: ViewRow[],
    private readonly state: UIState,
    private readonly theme: Theme,
  ) {}

  render(width: number): string[] {
    return [this.renderPagination(), "", ...this.renderTooltip(width)];
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private renderPagination(): string {
    const { rows, state, theme } = this;
    const visibleSettings = countVisibleSettings(rows);
    const totalSections = countSections(rows);
    const dim = (t: string) => theme.fg("dim", t);

    if (state.scope.length > 0) {
      return dim(`(${state.focusedIndex + 1}/${visibleSettings})`);
    }

    return dim(
      `(${visibleSettings} of ${totalSections} section${totalSections === 1 ? "" : "s"})`,
    );
  }

  /**
   * Render the tooltip area for the focused row.
   *
   * Returns a variable-length array of lines:
   *   - line 1: row description / tooltip
   *   - line 2+: validation result (may wrap across multiple lines)
   *   - last line: suggestions hint (when autocomplete is open)
   *
   * All lines are wrapped to `width` in a single final pass so that every output
   * line is safe to render regardless of content length.
   */
  private renderTooltip(width: number): string[] {
    const { rows, state, theme } = this;
    const focusedRow = rows[state.focusedIndex];

    if (!focusedRow) return ["", "", ""];

    const dim = (t: string) => theme.fg("dim", t);

    // Each pending line carries raw text, an optional color key, and an optional
    // continuation indent passed to wrapText so wrapped lines stay aligned.
    // Color is applied per wrapped line so ANSI codes are never split across lines.
    type PendingLine = { text: string; colorKey?: ThemeColor; indent?: string };
    const pending: PendingLine[] = [];

    // Line 1: description — may contain partial dim() annotations (short, safe to wrap as-is)
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
    pending.push({ text: line1 });

    // Line 2+: validation result OR type hint
    if (state.editState && state.validation !== null) {
      const { valid, reason } = state.validation as {
        valid: boolean;
        reason?: string | string[];
      };
      const colorKey = valid ? "success" : "error";

      if (!valid && Array.isArray(reason) && reason.length > 1) {
        // Multiple failures from v.any(): header + one line per reason
        pending.push({ text: "✗ none of the validations passed:", colorKey });
        for (const r of reason) {
          // "  · " = 4 visible columns → indent wrapped continuation by 4 spaces
          pending.push({ text: `  · ${r}`, colorKey, indent: "    " });
        }
      } else {
        // Single failure or success
        const message = Array.isArray(reason)
          ? (reason[0] ?? (valid ? "valid" : "invalid"))
          : (reason ?? (valid ? "valid" : "invalid"));
        // "✓ " / "✗ " = 2 visible columns → indent continuation lines by 2 spaces
        pending.push({
          text: `${valid ? "✓" : "✗"} ${message}`,
          colorKey,
          indent: "  ",
        });
      }
    } else if (focusedRow.type === "setting") {
      const node = focusedRow.node;
      if (node._tag === "text") {
        const items = [];
        if (node.validation) items.push("validated");
        if (node.complete) items.push("<tab> for suggestions");
        pending.push({
          text:
            items.length > 0
              ? renderNavigationHint(items, width)
              : "<enter> to edit",
          colorKey: "dim",
        });
      }
    } else if (state.addFormState) {
      pending.push({
        text: renderNavigationHint(
          ["<tab> next field", "<enter> confirm", "<esc> cancel"],
          width,
        ),
        colorKey: "dim",
      });
    }

    // Last line: autocomplete hint
    if (state.suggestions.length > 0) {
      pending.push({
        text: renderNavigationHint(
          ["↑↓ navigate", "Tab accept suggestion"],
          width,
        ),
        colorKey: "dim",
      });
    }

    // Single wrap pass: each raw line is word-wrapped to width, then colored per line.
    return pending.flatMap(({ text, colorKey, indent = "" }) => {
      const lines = wrapText(text, width, indent);
      return colorKey ? lines.map((l) => theme.fg(colorKey, l)) : lines;
    });
  }
}
