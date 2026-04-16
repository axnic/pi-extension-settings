/**
 * description.ts — DescriptionBlock renders the focused row's description
 * in the right column of the settings panel.
 *
 * Shows `node.documentation` when available, falls back to `node.description`.
 * Markdown in the `documentation` field is converted to ANSI-formatted terminal
 * output via `marked` + `marked-terminal`, using pi theme colours for visual
 * consistency. Rendered output is cached per row id + width to avoid
 * re-rendering on every panel redraw.
 *
 * Content is word-wrapped to the available width (less 2 chars for 1-space
 * horizontal padding on each side) and scrolled via `descScrollOffset`.
 */

import type { Theme } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import { Marked } from "marked";
import { markedTerminal } from "marked-terminal";
import type { ViewRow } from "../model.js";
import type { Block } from "./block.js";

/** Minimum right-column width needed to show the description panel. */
export const MIN_DESC_WIDTH = 20;

/** Module-level cache: maps "rowId:width" → rendered (padded) lines. */
const docRenderCache = new Map<string, string[]>();

/**
 * Build a fresh marked instance configured with pi theme colours.
 * A new instance is created per render because marked instances are stateful
 * after `.use()`; per-row caching in `renderContent` avoids the cost in practice.
 */
function buildMarkedInstance(theme: Theme, innerWidth: number): Marked {
  const identity = (text: string) => text;
  const instance = new Marked();
  instance.use(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (markedTerminal as any)({
      reflowText: true,
      width: innerWidth,
      showSectionPrefix: false,
      tab: 2,
      firstHeading: (text: string) =>
        theme.fg("mdHeading", theme.bold(theme.underline(text))),
      heading: (text: string) => theme.fg("mdHeading", theme.bold(text)),
      strong: (text: string) => theme.bold(text),
      em: (text: string) => theme.italic(text),
      codespan: (text: string) => theme.fg("mdCode", text),
      code: (text: string) => theme.fg("mdCodeBlock", text),
      link: (text: string) => theme.fg("mdLink", text),
      href: (text: string) => theme.fg("mdLinkUrl", theme.underline(text)),
      blockquote: (text: string) => theme.fg("mdQuote", text),
      hr: (text: string) => theme.fg("dim", text),
      paragraph: identity,
    }),
  );
  return instance;
}

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
    const cacheKey = this.focusedRow
      ? `${this.focusedRow.id}:${width}`
      : undefined;
    const allLines = this.renderContent(content, width, theme, cacheKey);

    // Clamp scroll offset so it never exceeds the last line index.
    // Without this, a terminal resize that produces fewer wrapped lines can
    // leave the offset pointing beyond the content, yielding an empty slice
    // and a misleading "No description available" message.
    const safeOffset = Math.min(
      descScrollOffset,
      Math.max(0, allLines.length - 1),
    );

    // Apply scroll offset
    return allLines.slice(safeOffset);
  }

  /**
   * Returns the total line count for this block at a given width, without
   * touching the shared render cache. Used by descriptionLineCount() to avoid
   * poisoning the cache with stub-themed (unstyled) content.
   */
  renderLineCount(width: number): number {
    if (width < MIN_DESC_WIDTH) return 0;
    const content = this.extractContent();
    return this.renderContent(content, width, this.theme).length;
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  /** Extract the raw description text from the focused row. */
  private extractContent(): string {
    const row = this.focusedRow;
    if (!row) return "";

    switch (row.type) {
      case "setting":
        return row.node.documentation ?? row.node.description ?? "";
      case "group":
        return row.description ?? "";
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
   * Convert Markdown text to ANSI-styled, word-wrapped TUI lines with
   * 1-space horizontal padding on each side.
   *
   * Uses `marked` + `marked-terminal` for rendering, with pi theme colours
   * applied to headings, bold, italic, code spans, links, etc.
   *
   * Results are cached under `cacheKey` (when provided) so re-renders during
   * rapid key navigation avoid redundant Markdown processing.
   */
  private renderContent(
    text: string,
    width: number,
    theme: Theme,
    cacheKey?: string,
  ): string[] {
    if (cacheKey && docRenderCache.has(cacheKey)) {
      return docRenderCache.get(cacheKey)!;
    }

    // Reserve 1-space padding on each side of the content.
    const innerWidth = width - 2;
    const pad = (s: string) => ` ${s} `;

    let lines: string[];
    if (!text) {
      lines = [
        pad(
          theme.fg(
            "dim",
            truncateToWidth("No description available", innerWidth, "…"),
          ),
        ),
        "",
      ];
    } else {
      const instance = buildMarkedInstance(theme, innerWidth);
      const rendered = instance.parse(text) as string;

      // Split into lines, strip trailing blank lines, then apply padding.
      const rawLines = rendered.split("\n");
      while (
        rawLines.length > 0 &&
        rawLines[rawLines.length - 1]!.trim() === ""
      ) {
        rawLines.pop();
      }

      lines = rawLines.map((line) => {
        if (line.trim() === "") return "";
        // Safety-clamp: truncate visible content to innerWidth before padding.
        const clamped =
          visibleWidth(line) > innerWidth
            ? truncateToWidth(line, innerWidth, "…")
            : line;
        return pad(clamped);
      });

      if (lines.length === 0) {
        lines = [
          pad(
            theme.fg(
              "dim",
              truncateToWidth("No description available", innerWidth, "…"),
            ),
          ),
        ];
      }

      // Append blank line before the column separator for vertical breathing room.
      lines.push("");
    }

    if (cacheKey) {
      docRenderCache.set(cacheKey, lines);
    }
    return lines;
  }
}

/** Compute the total number of rendered lines for a given description text and width. */
export function descriptionLineCount(
  focusedRow: ViewRow | undefined,
  width: number,
): number {
  // Use a minimal theme stub just for counting (no ANSI styling needed).
  // We call renderLineCount() instead of render() so the stub-themed output
  // never enters the shared docRenderCache and cannot poison real renders.
  const stub = {
    bold: (s: string) => s,
    italic: (s: string) => s,
    underline: (s: string) => s,
    fg: (_c: string, s: string) => s,
  } as Theme;
  const block = new DescriptionBlock(focusedRow, stub, 0);
  return block.renderLineCount(width);
}
