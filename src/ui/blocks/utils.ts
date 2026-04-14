/**
 * utils.ts — Shared pure rendering utilities used by two or more blocks.
 *
 * All functions are ANSI-free or explicitly documented about ANSI handling.
 * None have side effects.
 */

import type { Theme } from "@mariozechner/pi-coding-agent";
import { visibleWidth } from "@mariozechner/pi-tui";

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
 */
export function wrapText(
  text: string,
  maxWidth: number,
  indent: string,
): string[] {
  if (maxWidth <= 0) return [text];
  if (visibleWidth(text) <= maxWidth) return [text];

  const lines: string[] = [];
  const words = text.split(" ");
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (visibleWidth(candidate) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      // Start next line with indent; if a single word is still too wide, keep it anyway.
      current = indent + word;
    }
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
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
