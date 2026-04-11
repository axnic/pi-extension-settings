/**
 * hooks/displayfn.badge.ts — Fixed-color badge display function.
 *
 * Wraps the stored value in a `[value]` badge colored with a fixed hex color
 * specified at construction time — not derived from the value itself.
 * Use `d.color()` if you want the value itself to drive the color.
 *
 * @module
 */
import type { Theme } from "@mariozechner/pi-coding-agent";
import type { DisplayFn, TextValue } from "../core/nodes";

function isValidHex(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

function expandHex(hex: string): string {
  const v = hex.trim();
  if (v.length === 4 && v[0] === "#") {
    const [, r, g, b] = v;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return v;
}

function hexFg(hex: string, text: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return text;
  return `\x1b[38;2;${r};${g};${b}m${text}\x1b[39m`;
}

/**
 * Wrap the stored value in a fixed-color bracketed badge `[value]`.
 *
 * @param color - Hex color for the badge (`#rgb` or `#rrggbb`).
 *   Falls back to dim theme styling if the color is invalid.
 *
 * @example
 * display: d.badge("#ff930f")
 * // "active" → "■[active]" in orange
 */
export function badge(color: string): DisplayFn<TextValue> {
  if (isValidHex(color)) {
    const fullHex = expandHex(color);
    return (value, _theme: Theme) => hexFg(fullHex, `[${value}]`);
  }
  return (value, theme: Theme) => theme.fg("dim", `[${value}]`);
}
