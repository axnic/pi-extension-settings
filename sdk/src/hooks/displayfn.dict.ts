/**
 * hooks/displayfn.dict.ts — Dictionary entry display function.
 *
 * Renders a single `DictEntry` as:
 *
 *   **key** → value
 *
 * Where:
 * - `key`  is displayed in **bold**
 * - `→`    is displayed **dim** (via the active theme)
 * - `value` is displayed in normal text
 *
 * @internal
 * This hook is used by the settings panel renderer for dict rows.
 * It is not valid to pass to `S.dict()` directly because `S.dict()` accepts
 * `DisplayFn<DictEntry>` but this file exports a factory — call
 * `d.dictEntry()` to obtain the actual `DisplayFn`.
 *
 * @module
 */
import type { Theme } from "@mariozechner/pi-coding-agent";
import type { DictEntry, DisplayFn } from "../core/nodes";

/** ANSI bold on/off sequences. */
const BOLD_ON = "\x1b[1m";
const BOLD_OFF = "\x1b[22m";

/**
 * Create a display function for `DictEntry` values.
 *
 * The returned function renders each entry as:
 *   **key** → value
 *
 * - The key is wrapped in ANSI bold escape sequences.
 * - The `→` separator is rendered dim using the active theme.
 * - The value is rendered in the terminal's default style.
 *
 * @example
 * // In the renderer:
 * display: d.dictEntry()
 * // { key: "PATH", value: "/usr/local/bin" }
 * // → "\x1b[1mPATH\x1b[22m [dim]→[/dim] /usr/local/bin"
 */
export function dictEntry(): DisplayFn<DictEntry> {
  return (entry: DictEntry, theme: Theme): string => {
    const boldKey = `${BOLD_ON}${entry.key}${BOLD_OFF}`;
    const arrow = theme.fg("dim", "→");
    return `${boldKey} ${arrow} ${entry.value}`;
  };
}
