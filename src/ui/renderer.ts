/**
 * renderer.ts — Layout composer for the settings panel.
 *
 * Assembles the four panel blocks into a single string array:
 *
 *   [top separator]
 *   SearchBlock        (full terminal width)
 *   [empty line]
 *   SettingsBlock      (left ~2/3 width) | DescriptionBlock (right ~1/3 width)
 *   [empty line]
 *   InfoBlock          (left ~2/3 width) | DescriptionBlock continued
 *   [empty line]
 *   NavigationBlock    (full terminal width)
 *
 * The description panel is only shown when the right column is at least
 * MIN_DESC_WIDTH columns wide; below that threshold the full width goes to
 * the settings list (same layout as before the panel was introduced).
 *
 * Width routing is the only concern here. All rendering logic lives in the
 * individual block classes under src/ui/blocks/.
 */

import type { Theme } from "@mariozechner/pi-coding-agent";
import { visibleWidth } from "@mariozechner/pi-tui";
import type { ControlBindings } from "../settings.js";
import {
  DescriptionBlock,
  descriptionLineCount,
  MIN_DESC_WIDTH,
} from "./blocks/description.js";
import { InfoBlock } from "./blocks/info.js";
import { NavigationBlock } from "./blocks/navigation.js";
import { SearchBlock } from "./blocks/search.js";
import { MAX_VISIBLE_ROWS, SettingsBlock } from "./blocks/settings.js";
import type { ViewRow } from "./model.js";
import type { UIState } from "./state.js";

// Re-export for panel.ts backward compatibility
export { MAX_VISIBLE_ROWS } from "./blocks/settings.js";

/**
 * Render the full settings panel to a string array (one string per line).
 *
 * The panel layer is responsible for keeping `state.scrollOffset` in sync with
 * the focused row before calling this function — see
 * `SettingsPanel#syncScrollOffset`. The renderer trusts that value and only
 * clamps it defensively against the current row count.
 */
export function renderPanel(
  rows: ViewRow[],
  state: UIState,
  theme: Theme,
  width: number,
  controls: ControlBindings,
  maxVisibleRows: number = MAX_VISIBLE_ROWS,
): string[] {
  // Compute column widths. The description panel takes ~1/2 on the right,
  // but only when there is enough room (rightWidth >= MIN_DESC_WIDTH).
  const candidateLeft = Math.floor(width / 2);
  const candidateRight = width - candidateLeft - 1; // 1 for gutter
  const showDesc = candidateRight >= MIN_DESC_WIDTH;
  const leftWidth = showDesc ? candidateLeft : width;

  const focusedRow = rows[state.focusedIndex];
  const leftLines = [
    ...new SettingsBlock(rows, state, theme).render(leftWidth, maxVisibleRows),
    "",
    ...new InfoBlock(rows, state, theme).render(leftWidth),
  ];
  const rightLines = showDesc
    ? new DescriptionBlock(focusedRow, theme, state.descScrollOffset).render(
        candidateRight,
      )
    : undefined;

  // The scroll hint and PageUp/PageDown are only useful when the description
  // content is taller than the visible left-column area. Below that threshold
  // the entire doc is already visible, so exposing the scroll controls would
  // be confusing.
  const descTotalLines = showDesc
    ? descriptionLineCount(focusedRow, candidateRight)
    : 0;
  const descScrollable = descTotalLines > leftLines.length;

  return [
    theme.fg("dim", "─".repeat(Math.max(0, width))),
    ...new SearchBlock(state, theme).render(width),
    "",
    ...zipColumns(leftLines, leftWidth, rightLines, theme),
    "",
    ...new NavigationBlock(rows, state, theme, controls, descScrollable).render(
      width,
    ),
  ];
}

/**
 * Combine a left-column line array with an optional right-column line array,
 * padding each left line to `leftWidth` (ANSI-aware) and appending the right
 * column separated by a single space gutter.
 *
 * When `rightLines` is undefined, returns `leftLines` unchanged.
 */
function zipColumns(
  leftLines: string[],
  leftWidth: number,
  rightLines: string[] | undefined,
  theme: Theme,
): string[] {
  if (!rightLines) return leftLines;

  const count = Math.max(leftLines.length, rightLines.length);
  return Array.from({ length: count }, (_, i) => {
    const leftLine = leftLines[i] ?? "";
    const padding = " ".repeat(Math.max(0, leftWidth - visibleWidth(leftLine)));
    return `${leftLine}${padding}${theme.fg("dim", "│")}${rightLines[i] ?? ""}`;
  });
}
