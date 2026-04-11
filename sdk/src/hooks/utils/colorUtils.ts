/**
 * hooks/_colorUtils.ts — Internal color parsing and conversion utilities.
 *
 * This module is NOT part of the public SDK surface. It is imported by the
 * color validator, transform, and display hooks to share a single, tested
 * implementation of color parsing and conversion logic.
 *
 * ## Supported formats
 * - **Hex**        `#rgb` / `#rrggbb` (case-insensitive)
 * - **RGB/RGBA**   `rgb(r, g, b)` / `rgba(r, g, b, a)` — integers 0–255 or
 *                  percentages 0%–100%
 * - **HSV/HSB**    `hsv(h, s, v)` / `hsb(h, s, b)` — h: 0–360, s/v: 0–100
 *                  integers, floats, or percentages (`50%`)
 * - **CSS named**  All 148 standard CSS4 named colors (case-insensitive)
 *
 * @internal
 * @module
 */

// ─── RGB ↔ Hex primitives ─────────────────────────────────────────────────────

/**
 * Convert an integer channel value (0–255) to a two-character lowercase hex
 * string. Values are clamped to the 0–255 range before conversion.
 *
 * @example
 * channelToHex(255) // "ff"
 * channelToHex(0)   // "00"
 * channelToHex(16)  // "10"
 */
export function channelToHex(n: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(n)));
  return clamped.toString(16).padStart(2, "0");
}

/**
 * Convert three integer RGB channels (0–255) to a lowercase `#rrggbb` string.
 *
 * @example
 * rgbToHexString(255, 147, 15) // "#ff930f"
 */
export function rgbToHexString(r: number, g: number, b: number): string {
  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;
}

// ─── Hex parser ───────────────────────────────────────────────────────────────

/**
 * Parse a CSS hex color string into its RGB components.
 *
 * Accepts both short (`#rgb`) and long (`#rrggbb`) forms, case-insensitively.
 * Short-form digits are expanded by doubling: `#f0a` → `#ff00aa`.
 *
 * Returns `null` for any input that is not a valid hex color.
 *
 * @example
 * parseHex("#ff930f") // { r: 255, g: 147, b: 15 }
 * parseHex("#f93")    // { r: 255, g: 153, b: 51 }
 * parseHex("red")     // null
 */
export function parseHex(value: string): { r: number; g: number; b: number } | null {
  const v = value.trim();
  const short = /^#([0-9a-fA-F]{3})$/.exec(v);
  if (short) {
    const [, hex] = short;
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return { r, g, b };
  }
  const long = /^#([0-9a-fA-F]{6})$/.exec(v);
  if (long) {
    const [, hex] = long;
    const r = parseInt(hex?.slice(0, 2), 16);
    const g = parseInt(hex?.slice(2, 4), 16);
    const b = parseInt(hex?.slice(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

// ─── RGB parser ───────────────────────────────────────────────────────────────

/**
 * Parse `rgb(r, g, b)` or `rgba(r, g, b, a)` into RGB integers.
 *
 * Each channel may be an integer (0–255) or a percentage (0%–100%).
 * The optional alpha channel in `rgba()` is accepted but discarded — only
 * the RGB components are returned.
 *
 * Returns `null` when the input does not match the expected syntax or when
 * any channel is out of range.
 *
 * @example
 * parseRgb("rgb(255, 147, 15)")      // { r: 255, g: 147, b: 15 }
 * parseRgb("rgba(100%, 57%, 6%, 1)") // { r: 255, g: 145, b: 15 }
 * parseRgb("#ff930f")                // null
 */
export function parseRgb(value: string): { r: number; g: number; b: number } | null {
  const v = value.trim();
  // Allow both rgb(…) and rgba(…). Capture the three color channels.
  // The optional 4th argument (alpha) is accepted but ignored.
  const match =
    /^rgba?\(\s*([\d.]+%?)\s*,\s*([\d.]+%?)\s*,\s*([\d.]+%?)(?:\s*,\s*[\d.]+)?\s*\)$/i.exec(v);
  if (!match) return null;

  const parseChannel = (raw: string): number | null => {
    if (raw.endsWith("%")) {
      const pct = parseFloat(raw);
      if (Number.isNaN(pct) || pct < 0 || pct > 100) return null;
      return Math.round((pct / 100) * 255);
    }
    // Integer path — reject floats such as "1.5"
    if (raw.includes(".")) return null;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n) || n < 0 || n > 255) return null;
    return n;
  };

  const r = parseChannel(match[1]!);
  const g = parseChannel(match[2]!);
  const b = parseChannel(match[3]!);
  if (r === null || g === null || b === null) return null;
  return { r, g, b };
}

// ─── HSV / HSB parser ─────────────────────────────────────────────────────────

/**
 * Parse `hsv(h, s, v)` or `hsb(h, s, b)` into normalised HSV values.
 *
 * - **h** (hue): 0–360 (integer or float, no unit)
 * - **s** (saturation) and **v** (value/brightness): 0–100 integer/float,
 *   or 0%–100% with a percent sign — both are normalised to the 0–1 range on
 *   return.
 *
 * Returns `null` on parse failure or out-of-range values.
 *
 * @example
 * parseHsv("hsv(30, 94%, 100%)")  // { h: 30, s: 0.94, v: 1 }
 * parseHsv("hsb(0, 100, 100)")    // { h: 0, s: 1, v: 1 }
 * parseHsv("rgb(255,0,0)")        // null
 */
export function parseHsv(value: string): { h: number; s: number; v: number } | null {
  const v = value.trim();
  const match = /^hs[vb]\(\s*([\d.]+)\s*,\s*([\d.]+%?)\s*,\s*([\d.]+%?)\s*\)$/i.exec(v);
  if (!match) return null;

  const h = parseFloat(match[1]!);
  if (Number.isNaN(h) || h < 0 || h > 360) return null;

  const parseSV = (raw: string): number | null => {
    const isPercent = raw.endsWith("%");
    const n = parseFloat(isPercent ? raw.slice(0, -1) : raw);
    if (Number.isNaN(n) || n < 0 || n > 100) return null;
    return n / 100;
  };

  const s = parseSV(match[2]!);
  const sv = parseSV(match[3]!);
  if (s === null || sv === null) return null;
  return { h, s, v: sv };
}

// ─── HSV → RGB conversion ─────────────────────────────────────────────────────

/**
 * Convert HSV (hue 0–360, saturation 0–1, value 0–1) to integer RGB channels.
 *
 * Uses the standard sector-based algorithm. Hue wraps at 360.
 *
 * @example
 * hsvToRgb(0, 1, 1)     // { r: 255, g: 0,   b: 0 }   — pure red
 * hsvToRgb(120, 1, 1)   // { r: 0,   g: 255, b: 0 }   — pure green
 * hsvToRgb(240, 0.5, 1) // { r: 128, g: 128, b: 255 } — light blue
 */
export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r1 = 0,
    g1 = 0,
    b1 = 0;
  if (h < 60) {
    r1 = c;
    g1 = x;
    b1 = 0;
  } else if (h < 120) {
    r1 = x;
    g1 = c;
    b1 = 0;
  } else if (h < 180) {
    r1 = 0;
    g1 = c;
    b1 = x;
  } else if (h < 240) {
    r1 = 0;
    g1 = x;
    b1 = c;
  } else if (h < 300) {
    r1 = x;
    g1 = 0;
    b1 = c;
  } else {
    r1 = c;
    g1 = 0;
    b1 = x;
  }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

// ─── CSS named colors ─────────────────────────────────────────────────────────

/**
 * Complete map of all 148 CSS4 named colors (lowercase name → `#rrggbb`).
 *
 * Both `gray` and `grey` spellings are included for the affected entries.
 *
 * @see https://www.w3.org/TR/css-color-4/#named-colors
 */
export const CSS_NAMED_COLORS: Readonly<Record<string, string>> = {
  aliceblue: "#f0f8ff",
  antiquewhite: "#faebd7",
  aqua: "#00ffff",
  aquamarine: "#7fffd4",
  azure: "#f0ffff",
  beige: "#f5f5dc",
  bisque: "#ffe4c4",
  black: "#000000",
  blanchedalmond: "#ffebcd",
  blue: "#0000ff",
  blueviolet: "#8a2be2",
  brown: "#a52a2a",
  burlywood: "#deb887",
  cadetblue: "#5f9ea0",
  chartreuse: "#7fff00",
  chocolate: "#d2691e",
  coral: "#ff7f50",
  cornflowerblue: "#6495ed",
  cornsilk: "#fff8dc",
  crimson: "#dc143c",
  cyan: "#00ffff",
  darkblue: "#00008b",
  darkcyan: "#008b8b",
  darkgoldenrod: "#b8860b",
  darkgray: "#a9a9a9",
  darkgreen: "#006400",
  darkgrey: "#a9a9a9",
  darkkhaki: "#bdb76b",
  darkmagenta: "#8b008b",
  darkolivegreen: "#556b2f",
  darkorange: "#ff8c00",
  darkorchid: "#9932cc",
  darkred: "#8b0000",
  darksalmon: "#e9967a",
  darkseagreen: "#8fbc8f",
  darkslateblue: "#483d8b",
  darkslategray: "#2f4f4f",
  darkslategrey: "#2f4f4f",
  darkturquoise: "#00ced1",
  darkviolet: "#9400d3",
  deeppink: "#ff1493",
  deepskyblue: "#00bfff",
  dimgray: "#696969",
  dimgrey: "#696969",
  dodgerblue: "#1e90ff",
  firebrick: "#b22222",
  floralwhite: "#fffaf0",
  forestgreen: "#228b22",
  fuchsia: "#ff00ff",
  gainsboro: "#dcdcdc",
  ghostwhite: "#f8f8ff",
  gold: "#ffd700",
  goldenrod: "#daa520",
  gray: "#808080",
  green: "#008000",
  greenyellow: "#adff2f",
  grey: "#808080",
  honeydew: "#f0fff0",
  hotpink: "#ff69b4",
  indianred: "#cd5c5c",
  indigo: "#4b0082",
  ivory: "#fffff0",
  khaki: "#f0e68c",
  lavender: "#e6e6fa",
  lavenderblush: "#fff0f5",
  lawngreen: "#7cfc00",
  lemonchiffon: "#fffacd",
  lightblue: "#add8e6",
  lightcoral: "#f08080",
  lightcyan: "#e0ffff",
  lightgoldenrodyellow: "#fafad2",
  lightgray: "#d3d3d3",
  lightgreen: "#90ee90",
  lightgrey: "#d3d3d3",
  lightpink: "#ffb6c1",
  lightsalmon: "#ffa07a",
  lightseagreen: "#20b2aa",
  lightskyblue: "#87cefa",
  lightslategray: "#778899",
  lightslategrey: "#778899",
  lightsteelblue: "#b0c4de",
  lightyellow: "#ffffe0",
  lime: "#00ff00",
  limegreen: "#32cd32",
  linen: "#faf0e6",
  magenta: "#ff00ff",
  maroon: "#800000",
  mediumaquamarine: "#66cdaa",
  mediumblue: "#0000cd",
  mediumorchid: "#ba55d3",
  mediumpurple: "#9370db",
  mediumseagreen: "#3cb371",
  mediumslateblue: "#7b68ee",
  mediumspringgreen: "#00fa9a",
  mediumturquoise: "#48d1cc",
  mediumvioletred: "#c71585",
  midnightblue: "#191970",
  mintcream: "#f5fffa",
  mistyrose: "#ffe4e1",
  moccasin: "#ffe4b5",
  navajowhite: "#ffdead",
  navy: "#000080",
  oldlace: "#fdf5e6",
  olive: "#808000",
  olivedrab: "#6b8e23",
  orange: "#ffa500",
  orangered: "#ff4500",
  orchid: "#da70d6",
  palegoldenrod: "#eee8aa",
  palegreen: "#98fb98",
  paleturquoise: "#afeeee",
  palevioletred: "#db7093",
  papayawhip: "#ffefd5",
  peachpuff: "#ffdab9",
  peru: "#cd853f",
  pink: "#ffc0cb",
  plum: "#dda0dd",
  powderblue: "#b0e0e6",
  purple: "#800080",
  rebeccapurple: "#663399",
  red: "#ff0000",
  rosybrown: "#bc8f8f",
  royalblue: "#4169e1",
  saddlebrown: "#8b4513",
  salmon: "#fa8072",
  sandybrown: "#f4a460",
  seagreen: "#2e8b57",
  seashell: "#fff5ee",
  sienna: "#a0522d",
  silver: "#c0c0c0",
  skyblue: "#87ceeb",
  slateblue: "#6a5acd",
  slategray: "#708090",
  slategrey: "#708090",
  snow: "#fffafa",
  springgreen: "#00ff7f",
  steelblue: "#4682b4",
  tan: "#d2b48c",
  teal: "#008080",
  thistle: "#d8bfd8",
  tomato: "#ff6347",
  turquoise: "#40e0d0",
  violet: "#ee82ee",
  wheat: "#f5deb3",
  white: "#ffffff",
  whitesmoke: "#f5f5f5",
  yellow: "#ffff00",
  yellowgreen: "#9acd32",
} as const;

/**
 * Parse a CSS named color to its RGB components.
 *
 * The lookup is case-insensitive. Returns `null` for unknown names.
 *
 * @example
 * parseHtmlNamed("coral")  // { r: 255, g: 127, b: 80 }
 * parseHtmlNamed("RED")    // { r: 255, g: 0,   b: 0 }
 * parseHtmlNamed("banana") // null
 */
export function parseHtmlNamed(value: string): { r: number; g: number; b: number } | null {
  const hex = CSS_NAMED_COLORS[value.trim().toLowerCase()];
  if (!hex) return null;
  return parseHex(hex);
}

// ─── Universal converter ──────────────────────────────────────────────────────

/**
 * Try every supported color format and return a normalised `#rrggbb` hex string,
 * or `null` if the input cannot be recognised as any known color format.
 *
 * Formats are tried in this order:
 * 1. Hex (`#rgb` / `#rrggbb`)
 * 2. RGB/RGBA functional notation
 * 3. HSV/HSB functional notation
 * 4. CSS named color
 *
 * @example
 * anyToHex("#f93")              // "#ff9933"
 * anyToHex("rgb(255, 0, 0)")    // "#ff0000"
 * anyToHex("hsv(0, 100%, 100%)") // "#ff0000"
 * anyToHex("coral")             // "#ff7f50"
 * anyToHex("not-a-color")       // null
 */
export function anyToHex(value: string): string | null {
  const hex = parseHex(value);
  if (hex) {
    // Normalise shorthand hex to full 6-digit form.
    return rgbToHexString(hex.r, hex.g, hex.b);
  }

  const rgb = parseRgb(value);
  if (rgb) return rgbToHexString(rgb.r, rgb.g, rgb.b);

  const hsv = parseHsv(value);
  if (hsv) {
    const { r, g, b } = hsvToRgb(hsv.h, hsv.s, hsv.v);
    return rgbToHexString(r, g, b);
  }

  const named = parseHtmlNamed(value);
  if (named) return rgbToHexString(named.r, named.g, named.b);

  return null;
}

/**
 * Build an ANSI truecolor foreground escape sequence for the given RGB values,
 * wrapping `text` in the color and resetting the foreground afterward.
 *
 * This is the correct sequence for terminals that support 24-bit color
 * (xterm-256color, iTerm2, Windows Terminal, etc.).
 *
 * @example
 * ansiFg(255, 147, 15, "■") // "\x1b[38;2;255;147;15m■\x1b[39m"
 */
export function ansiFg(r: number, g: number, b: number, text: string): string {
  return `\x1b[38;2;${r};${g};${b}m${text}\x1b[39m`;
}
