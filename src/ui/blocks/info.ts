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
import { truncateToWidth } from "@mariozechner/pi-tui";
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
    return [this.renderPagination(width), "", ...this.renderTooltip(width)];
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private renderPagination(width: number): string {
    const { rows, state, theme } = this;
    const visibleSettings = countVisibleSettings(rows);
    const totalSections = countSections(rows);
    const dim = (t: string) => theme.fg("dim", t);

    const text =
      state.scope.length > 0
        ? dim(`(${state.focusedIndex + 1}/${visibleSettings})`)
        : dim(
            `(${visibleSettings} of ${totalSections} section${totalSections === 1 ? "" : "s"})`,
          );

    return truncateToWidth(text, width, "…");
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
    //
    // `truncate: true` skips wrapText and uses truncateToWidth instead — required
    // for lines that already contain ANSI sequences (dim/bold spans), which wrapText
    // cannot safely split (it is documented as ANSI-free).
    type PendingLine = {
      text: string;
      colorKey?: ThemeColor;
      indent?: string;
      truncate?: boolean;
    };
    const pending: PendingLine[] = [];

    // Line 1: description.
    // extension-header and group lines embed dim() ANSI spans with spaces inside
    // (e.g. "(12 settings)"), so they must be truncated rather than word-wrapped.
    // Setting tooltips are plain strings supplied by the schema author — safe to wrap.
    switch (focusedRow.type) {
      case "extension-header": {
        const total = focusedRow.settingsCount;
        pending.push({
          text: `${dim("[extension]")} ${focusedRow.extensionName} ${dim(`(${total} setting${total === 1 ? ")" : "s)"}`)}`,
          truncate: true,
        });
        break;
      }
      case "group": {
        const total = focusedRow.settingsCount;
        pending.push({
          text: `${focusedRow.description ?? `${focusedRow.label} group`} ${dim(`(${total} setting${total === 1 ? ")" : "s)"}`)}`,
          truncate: true,
        });
        break;
      }
      case "setting":
        pending.push({ text: focusedRow.node.description ?? "" });
        break;
      case "list-add":
        pending.push({ text: "Add a new item to the list" });
        break;
      case "list-item":
        pending.push({ text: "List item" });
        break;
    }

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

    // Final render pass: truncate ANSI-bearing lines, word-wrap plain lines.
    return pending.flatMap(
      ({ text, colorKey, indent = "", truncate = false }) => {
        const lines = truncate
          ? [truncateToWidth(text, width, "…")]
          : wrapText(text, width, indent);
        return colorKey ? lines.map((l) => theme.fg(colorKey, l)) : lines;
      },
    );
  }
}
