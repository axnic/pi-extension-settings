/**
 * block.ts — Common interface for all TUI panel blocks.
 *
 * Each block is an independent, renderable unit. The width budget is passed at
 * render time so the layout composer can assign different widths to different
 * blocks (e.g. full terminal width for SearchBlock vs. left-column width for
 * SettingsBlock when a right-side DescriptionBlock is present).
 */

export interface Block {
  /**
   * Render this block and return one string per output line.
   *
   * `width` is the column budget allocated to this block by the layout
   * composer. Blocks must not produce lines wider than this value.
   */
  render(width: number): string[];
}
