/**
 * hooks/transformfn.color.ts — Color-to-hex transform functions.
 *
 * Each transform converts a specific color format to `#rrggbb`. If the input
 * is not in the expected format, or if conversion fails for any reason, the
 * original value is returned unchanged — making each transform safe to compose:
 *
 * @example
 * // Accept rgb, hsv, or named colors and normalise to hex.
 * transform: t.pipe(t.rgbToHex(), t.hsvToHex(), t.htmlNamedToHex())
 *
 * @module
 */
import type { TransformFn } from "../core/nodes";
import {
  hsvToRgb,
  parseHsv,
  parseHtmlNamed,
  parseRgb,
  rgbToHexString,
} from "./utils/colorUtils";

/**
 * Convert `rgb(r, g, b)` or `rgba(r, g, b, a)` to `#rrggbb`.
 *
 * Returns the original value if it is not valid RGB notation.
 *
 * @example
 * t.rgbToHex()("rgb(255, 147, 15)") // "#ff930f"
 * t.rgbToHex()("#ff930f")           // "#ff930f" (unchanged — not rgb notation)
 */
export function rgbToHex(): TransformFn {
  return (value) => {
    const parsed = parseRgb(value.trim());
    if (!parsed) return value;
    return rgbToHexString(parsed.r, parsed.g, parsed.b);
  };
}

/**
 * Convert `hsv(h, s, v)` or `hsb(h, s, b)` to `#rrggbb`.
 *
 * Returns the original value if it is not valid HSV/HSB notation.
 *
 * @example
 * t.hsvToHex()("hsv(0, 100%, 100%)")  // "#ff0000"
 * t.hsvToHex()("hsb(120, 100%, 100%)") // "#00ff00"
 * t.hsvToHex()("rgb(255, 0, 0)")       // "rgb(255, 0, 0)" (unchanged)
 */
export function hsvToHex(): TransformFn {
  return (value) => {
    const parsed = parseHsv(value.trim());
    if (!parsed) return value;
    const { r, g, b } = hsvToRgb(parsed.h, parsed.s, parsed.v);
    return rgbToHexString(r, g, b);
  };
}

/** Alias for hsvToHex(). */
export const hsbToHex = hsvToHex;

/**
 * Convert a CSS4 named color to `#rrggbb`.
 *
 * Returns the original value if the name is not a recognised CSS4 named color.
 * The comparison is case-insensitive.
 *
 * @example
 * t.htmlNamedToHex()("coral")   // "#ff7f50"
 * t.htmlNamedToHex()("RED")     // "#ff0000"
 * t.htmlNamedToHex()("banana")  // "banana" (unchanged)
 */
export function htmlNamedToHex(): TransformFn {
  return (value) => {
    const parsed = parseHtmlNamed(value.trim());
    if (!parsed) return value;
    return rgbToHexString(parsed.r, parsed.g, parsed.b);
  };
}
