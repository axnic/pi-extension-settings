/**
 * renderer.ts — Layout composer for the settings panel.
 *
 * Assembles the four panel blocks into a single string array:
 *
 *   [top separator]
 *   SearchBlock        (full terminal width)
 *   [empty line]
 *   SettingsBlock      (left width)  ← future: | DescriptionBlock (right width)
 *   [empty line]
 *   InfoBlock          (left width)  ← future: | DescriptionBlock continued
 *   [empty line]
 *   NavigationBlock    (full terminal width)
 *
 * Width routing is the only concern here. All rendering logic lives in the
 * individual block classes under src/ui/blocks/.
 */

import type { Theme } from "@mariozechner/pi-coding-agent";
import type { Registry } from "../core/registry.js";
import type { ControlBindings } from "../settings.js";
import type { Block } from "./blocks/block.js";
import { InfoBlock } from "./blocks/info.js";
import { NavigationBlock } from "./blocks/navigation.js";
import { SearchBlock } from "./blocks/search.js";
import { SettingsBlock } from "./blocks/settings.js";
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
): string[] {
  // leftWidth equals total width today.
  // When DescriptionBlock is introduced:
  //   const leftWidth = Math.floor(width * 0.55);
  const leftWidth = width;

  return [
    theme.fg("dim", "─".repeat(width)),
    ...new SearchBlock(state, theme).render(width),
    "",
    ...zipColumns(
      [
        ...new SettingsBlock(rows, state, theme).render(leftWidth),
        "",
        ...new InfoBlock(rows, state, theme).render(leftWidth),
      ],
      leftWidth,
      width,
      // future: new DescriptionBlock(rows, state, theme)
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
 * Today (no right panel): returns `leftLines` unchanged.
 * Future: pads each left line to `leftWidth`, appends " " separator,
 *         then appends the corresponding right line (or trailing spaces).
 */
function zipColumns(
  leftLines: string[],
  leftWidth: number,
  totalWidth: number,
  rightBlock?: Block,
): string[] {
  if (!rightBlock) return leftLines;

  const rightWidth = totalWidth - leftWidth - 1; // 1 for the gutter
  const rightLines = rightBlock.render(rightWidth);
  const count = Math.max(leftLines.length, rightLines.length);

  return Array.from({ length: count }, (_, i) => {
    const left = (leftLines[i] ?? "").padEnd(leftWidth);
    return `${left} ${rightLines[i] ?? ""}`;
  });
}
