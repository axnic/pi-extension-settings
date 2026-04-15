/**
 * hooks/displayfn.keybinding.ts — Keyboard binding display function.
 *
 * Renders a binding like `"ctrl+shift+k"` as styled tokens separated by a
 * dim `" + "` so the individual parts are easy to read at a glance.
 *
 * @example
 * display: d.keybinding()
 * // "ctrl+k"         → "ctrl + k"   (the " + " is dim)
 * // "shift+up"       → "shift + up"
 * // "ctrl+shift+f5"  → "ctrl + shift + f5"
 *
 * @module
 */

import type { DisplayFn, TextValue } from "../core/nodes";

/**
 * Create a display function that renders a keyboard binding with spaced,
 * dim `" + "` separators between each part.
 *
 * @example
 * S.text({
 *   description: "Toggle panel",
 *   default: "ctrl+k",
 *   validation: v.keybinding(),
 *   display:    d.keybinding(),
 * })
 */
export function keybinding(): DisplayFn<TextValue> {
  return (value, theme) =>
    value
      .split("+")
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .join(theme.fg("dim", " + "));
}
