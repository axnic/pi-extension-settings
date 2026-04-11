/**
 * hooks/displayfn.color.ts — Universal color swatch display function.
 *
 * Renders a colored `■` swatch followed by the stored value. The swatch is
 * rendered in the actual hue of the color using ANSI 24-bit (truecolor) escape
 * sequences, which are supported by all modern terminal emulators.
 *
 * ## Supported input formats
 * - Hex:       `#rgb` / `#rrggbb`
 * - RGB/RGBA:  `rgb(r, g, b)` / `rgba(r, g, b, a)`
 * - HSV/HSB:   `hsv(h, s, v)` / `hsb(h, s, b)`
 * - CSS named: `coral`, `rebeccapurple`, etc.
 *
 * If the value cannot be parsed as any known color, the swatch is rendered dim
 * using the active theme color — no truecolor is emitted.
 *
 * @example
 * display: d.color()
 * // "#ff930f"            → "■ #ff930f"  (■ in orange)
 * // "rgb(255, 147, 15)"  → "■ rgb(255, 147, 15)"  (■ in orange)
 * // "coral"              → "■ coral"   (■ in #ff7f50)
 * // "not-a-color"        → "■ not-a-color"  (■ dim)
 *
 * @module
 */
import type { Theme } from "@mariozechner/pi-coding-agent";
import type { DisplayFn, TextValue } from "../core/nodes.ts";
import { ansiFg, anyToHex, parseHex } from "./utils/colorUtils.ts";

/**
 * Create a display function that renders any supported color format with a
 * live-colored swatch prefix.
 *
 * @example
 * S.text({
 *   tooltip: "Accent color",
 *   default: "#ff930f",
 *   display: d.color(),
 * })
 */
export function color(): DisplayFn<TextValue> {
  return (value: string, theme: Theme): string => {
    const hex = anyToHex(value.trim());
    if (hex) {
      const rgb = parseHex(hex) as { r: number; g: number; b: number };
      const swatch = ansiFg(rgb.r, rgb.g, rgb.b, "■");
      return `${swatch} ${value}`;
    }
    // Unrecognised color — fall back to dim swatch via theme.
    return `${theme.fg("dim", "■")} ${value}`;
  };
}
