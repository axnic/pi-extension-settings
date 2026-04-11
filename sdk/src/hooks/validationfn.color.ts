/**
 * hooks/validationfn.color.ts — Color format validators.
 *
 * Each validator accepts one specific color format and rejects everything else.
 * Compose them with `v.any(hexColor(), rgbColor(), hsvColor(), htmlNamedColor())`
 * to accept any supported format.
 *
 * @module
 */
import type { TextValue, ValidationFn } from "../core/nodes.ts";
import { parseHex, parseHsv, parseHtmlNamed, parseRgb } from "./utils/colorUtils.ts";

/**
 * Validates CSS hex colors: `#rgb` or `#rrggbb` (case-insensitive, trims whitespace).
 * @example v.hexColor()("#ff930f") // { valid: true, reason: "valid hex color" }
 * @example v.hexColor()("red") // { valid: false, reason: "must be #rgb or #rrggbb" }
 */
export function hexColor(): ValidationFn<TextValue> {
  return (value) => {
    const ok = parseHex(value.trim()) !== null;
    return ok
      ? { valid: true, reason: "valid hex color" }
      : { valid: false, reason: "must be #rgb or #rrggbb (e.g. #ff930f)" };
  };
}

/**
 * Validates CSS rgb/rgba functional notation.
 * Accepts: `rgb(r, g, b)` and `rgba(r, g, b, a)`.
 * Channels can be integers (0–255) or percentages (0%–100%).
 * The alpha channel (rgba) is validated syntactically but ignored semantically.
 *
 * @example v.rgbColor()("rgb(255, 147, 15)") // { valid: true }
 * @example v.rgbColor()("rgba(100%, 0%, 0%, 0.5)") // { valid: true }
 */
export function rgbColor(): ValidationFn<TextValue> {
  return (value) => {
    const ok = parseRgb(value.trim()) !== null;
    return ok
      ? { valid: true, reason: "valid rgb color" }
      : {
          valid: false,
          reason: "must be rgb(r, g, b) or rgba(r, g, b, a) — channels 0–255 or 0%–100%",
        };
  };
}

/**
 * Validates HSV / HSB functional notation.
 * Accepts: `hsv(h, s, v)` or `hsb(h, s, b)` (case-insensitive).
 * - h (hue): 0–360
 * - s (saturation) and v/b: 0–100 integer/float or 0%–100%
 *
 * @example v.hsvColor()("hsv(30, 94%, 100%)") // { valid: true }
 * @example v.hsvColor()("hsb(0, 100, 100)") // { valid: true }
 */
export function hsvColor(): ValidationFn<TextValue> {
  return (value) => {
    const ok = parseHsv(value.trim()) !== null;
    return ok
      ? { valid: true, reason: "valid hsv/hsb color" }
      : {
          valid: false,
          reason: "must be hsv(h, s, v) or hsb(h, s, b) — h: 0–360, s/v: 0–100 or 0%–100%",
        };
  };
}

/** Alias for hsvColor(). Identical behaviour, different name for clarity. */
export const hsbColor = hsvColor;

/**
 * Validates CSS4 named colors (case-insensitive).
 * Accepts all 148 standard CSS4 named colors: `red`, `coral`, `rebeccapurple`, etc.
 *
 * @example v.htmlNamedColor()("coral") // { valid: true, reason: "valid CSS named color" }
 * @example v.htmlNamedColor()("banana") // { valid: false }
 */
export function htmlNamedColor(): ValidationFn<TextValue> {
  return (value) => {
    const ok = parseHtmlNamed(value.trim()) !== null;
    return ok
      ? { valid: true, reason: "valid CSS named color" }
      : {
          valid: false,
          reason: "not a recognised CSS named color (e.g. coral, rebeccapurple)",
        };
  };
}
