/**
 * utils.ts — Shared pure rendering utilities used by two or more blocks.
 *
 * All functions are ANSI-free or explicitly documented about ANSI handling.
 * None have side effects.
 */

import type { Theme } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

// ─── Tree prefix helpers ──────────────────────────────────────────────────────

/** Render a single tree character, dim-styled. */
export function dimChar(theme: Theme, char: string): string {
  return theme.fg("dim", char);
}

/**
 * Style the tree prefix characters, keeping the cursor slot unstyled.
 * The first char of prefix is the cursor slot (space or →).
 */
export function stylePrefix(
  prefix: string,
  isFocused: boolean,
  theme: Theme,
): string {
  if (prefix.length === 0) return "";

  const cursorSlot = isFocused ? theme.fg("accent", "→") : " ";

  if (prefix.length === 1) {
    // Depth-0 row: only a cursor slot
    return cursorSlot;
  }

  // Everything after the cursor slot contains tree characters
  const treeChars = prefix.slice(1);
  // Dim all tree characters (├, └, │) and keep spaces as-is
  const styledTree = treeChars
    .split("")
    .map((c) => (c === "├" || c === "└" || c === "│" ? dimChar(theme, c) : c))
    .join("");

  return cursorSlot + styledTree;
}

// ─── Text utilities ───────────────────────────────────────────────────────────

/**
 * Word-wrap plain (ANSI-free) text to fit within `maxWidth` visible columns.
 * The first line starts at column 0; every continuation line is prefixed with
 * `indent` (must be plain text so its visible width equals its byte length).
 *
 * IMPORTANT: `text` must be ANSI-free. Strings containing escape sequences
 * can be split mid-sequence, producing broken/bleeding terminal output. Apply
 * theme styling only after wrapping.
 *
 * Leading whitespace on the first line is preserved (e.g. "  · reason" keeps
 * its two-space bullet indent). Any single word wider than `maxWidth` is
 * hard-truncated with "…" so every returned line satisfies visibleWidth ≤ maxWidth.
 * When maxWidth ≤ 0 the result is a single empty string.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  indent: string,
): string[] {
  if (maxWidth <= 0) return [""];
  if (visibleWidth(text) <= maxWidth) return [text];

  // Extract leading whitespace so the first line's bullet/indent is preserved
  // even when splitting on spaces (which would otherwise collapse it).
  const leading = text.match(/^\s*/)?.[0] ?? "";
  const words = text.trimStart().split(" ").filter(Boolean);

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    // First word: prepend the original leading whitespace directly (no extra space).
    const candidate = current === "" ? leading + word : `${current} ${word}`;
    if (visibleWidth(candidate) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      // Hard-truncate a single word that alone exceeds the budget so no line
      // overflows, even with long URLs or hashes in tooltip/validation text.
      const indented = indent + word;
      current =
        visibleWidth(indented) > maxWidth
          ? truncateToWidth(indented, maxWidth, "…")
          : indented;
    }
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

/**
 * Render a navigation hint from ordered items joined by " · ".
 *
 * Items are listed from most to least important. If the joined result exceeds
 * `width`, the rightmost item is dropped and the attempt is repeated until the
 * string fits. Returns an empty string if even the first item alone overflows.
 */
export function renderNavigationHint(items: string[], width: number): string {
  for (let i = items.length; i > 0; i--) {
    const text = items.slice(0, i).join(" · ");
    if (visibleWidth(text) <= width) return text;
  }
  return "";
}
