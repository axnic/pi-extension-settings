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
import type { Registry } from "../core/registry.js";
import type { ControlBindings } from "../settings.js";
import type { Block } from "./blocks/block.js";
import { DescriptionBlock, MIN_DESC_WIDTH } from "./blocks/description.js";
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
  _registry: Registry,
  theme: Theme,
  width: number,
  controls: ControlBindings,
  maxVisibleRows: number = MAX_VISIBLE_ROWS,
): string[] {
  // Compute left/right column widths.
  // The description panel appears on the right at ~1/3 of the total width,
  // but only when there is enough room (rightWidth >= MIN_DESC_WIDTH).
  const candidateLeft = Math.floor((width * 2) / 3);
  const candidateRight = width - candidateLeft - 1; // 1 for gutter
  const showDesc = candidateRight >= MIN_DESC_WIDTH;
  const leftWidth = showDesc ? candidateLeft : width;

  const focusedRow = rows[state.focusedIndex];
  const descBlock = showDesc
    ? new DescriptionBlock(focusedRow, theme, state.descScrollOffset)
    : undefined;

  return [
    theme.fg("dim", "─".repeat(Math.max(0, width))),
    ...new SearchBlock(state, theme).render(width),
    "",
    ...zipColumns(
      [
        ...new SettingsBlock(rows, state, theme).render(
          leftWidth,
          maxVisibleRows,
        ),
        "",
        ...new InfoBlock(rows, state, theme).render(leftWidth),
      ],
      leftWidth,
      width,
      descBlock,
    ),
    "",
    ...new NavigationBlock(rows, state, theme, controls).render(width),
  ];
}

/**
 * Combine a left-column line array with an optional right-column block,
 * padding each left line to `leftWidth` and appending the right column
 * separated by a single space gutter.
 *
 * When no right block is provided, returns `leftLines` unchanged.
 */
function zipColumns(
  leftLines: string[],
  leftWidth: number,
  totalWidth: number,
  rightBlock?: Block,
): string[] {
  if (!rightBlock) return leftLines;

  const rightWidth = totalWidth - leftWidth - 1; // 1 for the gutter
  if (rightWidth <= 0) return leftLines;
  const rightLines = rightBlock.render(rightWidth);
  const count = Math.max(leftLines.length, rightLines.length);

  return Array.from({ length: count }, (_, i) => {
    const leftLine = leftLines[i] ?? "";
    // Pad based on visible width (ANSI-aware) so the right column stays aligned
    // even when left lines contain escape sequences.
    const padding = " ".repeat(Math.max(0, leftWidth - visibleWidth(leftLine)));
    return `${leftLine}${padding} ${rightLines[i] ?? ""}`;
  });
}
