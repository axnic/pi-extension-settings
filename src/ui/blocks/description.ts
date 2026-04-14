/**
 * description.ts — DescriptionBlock renders the focused row's description
 * in the right column of the settings panel.
 *
 * Shows `node.description` when available, falls back to `node.tooltip`.
 * Basic Markdown tokens are handled for TUI display:
 *   # Heading  → uppercase line
 *   ## Heading → uppercase line
 *   - item     → • item
 *   **text**   → strip markers (bold not supported in TUI)
 *   *text*     → strip markers (italic not supported in TUI)
 *   blank line → preserved as empty line
 *
 * Content is word-wrapped to the available width and scrolled via
 * `descScrollOffset`.
 */

import type { Theme } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import type { ViewRow } from "../model.js";
import type { Block } from "./block.js";
import { wrapText } from "./utils.js";

/** Minimum right-column width needed to show the description panel. */
export const MIN_DESC_WIDTH = 20;

export class DescriptionBlock implements Block {
  constructor(
    private readonly focusedRow: ViewRow | undefined,
    private readonly theme: Theme,
    private readonly descScrollOffset: number,
  ) {}

  render(width: number): string[] {
    if (width < MIN_DESC_WIDTH) return [];

    const { theme, descScrollOffset } = this;
    const content = this.extractContent();
    const allLines = this.renderContent(content, width, theme);

    // Apply scroll offset
    const visible = allLines.slice(descScrollOffset);

    // Pad to at least one line so zipColumns doesn't produce an empty right column
    if (visible.length === 0) {
      return [
        theme.fg(
          "dim",
          truncateToWidth("No description available", width, "…"),
        ),
      ];
    }
    return visible;
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  /** Extract the raw description text from the focused row. */
  private extractContent(): string {
    const row = this.focusedRow;
    if (!row) return "";

    switch (row.type) {
      case "setting":
        return row.node.description ?? row.node.tooltip ?? "";
      case "group":
        return row.tooltip ?? "";
      case "extension-header":
        return `Extension: ${row.extensionName}\n\n${row.settingsCount} setting${row.settingsCount === 1 ? "" : "s"} registered.`;
      case "list-item":
        return "List item";
      case "list-add":
        return "Add a new item to the list.";
      default:
        return "";
    }
  }

  /**
   * Convert raw Markdown-ish text into styled, word-wrapped TUI lines.
   *
   * Processes one source paragraph at a time. Each source line is classified
   * as a heading, bullet, blank, or plain text and converted accordingly.
   */
  private renderContent(text: string, width: number, theme: Theme): string[] {
    if (!text) {
      return [
        theme.fg(
          "dim",
          truncateToWidth("No description available", width, "…"),
        ),
      ];
    }

    // Strip **bold** and *italic* markers (TUI can't render them)
    const stripped = text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1");

    const lines: string[] = [];
    for (const rawLine of stripped.split("\n")) {
      const trimmed = rawLine.trim();

      // Blank line
      if (trimmed === "") {
        lines.push("");
        continue;
      }

      // Heading: # or ##
      const headingMatch = trimmed.match(/^#{1,2}\s+(.+)$/);
      if (headingMatch) {
        const title = headingMatch[1]!.toUpperCase();
        const wrapped = wrapText(title, width, "  ");
        for (const l of wrapped) {
          lines.push(theme.bold(truncateToWidth(l, width, "…")));
        }
        continue;
      }

      // Bullet: - item
      const bulletMatch = trimmed.match(/^-\s+(.+)$/);
      if (bulletMatch) {
        const item = `• ${bulletMatch[1]!}`;
        const wrapped = wrapText(item, width, "  ");
        for (const l of wrapped) {
          lines.push(truncateToWidth(l, width, "…"));
        }
        continue;
      }

      // Plain text
      const wrapped = wrapText(trimmed, width, "  ");
      for (const l of wrapped) {
        lines.push(truncateToWidth(l, width, "…"));
      }
    }

    // Trim trailing blank lines
    while (lines.length > 0 && lines[lines.length - 1] === "") {
      lines.pop();
    }

    return lines.length > 0
      ? lines
      : [
          theme.fg(
            "dim",
            truncateToWidth("No description available", width, "…"),
          ),
        ];
  }
}

/** Compute the total number of rendered lines for a given description text and width. */
export function descriptionLineCount(
  focusedRow: ViewRow | undefined,
  width: number,
): number {
  // Use a minimal theme stub just for counting (no ANSI styling needed)
  const stub = {
    bold: (s: string) => s,
    fg: (_c: string, s: string) => s,
  } as Theme;
  const block = new DescriptionBlock(focusedRow, stub, 0);
  return block.render(width).length;
}
