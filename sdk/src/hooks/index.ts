/**
 * hooks/index.ts — Barrel export for all pre-built hook functions.
 *
 * Provides four convenience namespaces that mirror the SDK's public API:
 *
 * | Namespace | Purpose                               | Import via          |
 * |-----------|---------------------------------------|---------------------|
 * | `c`       | Completers (`CompleteFn` factories)   | `import { c }`      |
 * | `d`       | Display functions (`DisplayFn`)       | `import { d }`      |
 * | `t`       | Transforms (`TransformFn` factories)  | `import { t }`      |
 * | `v`       | Validators (`ValidationFn` factories) | `import { v }`      |
 *
 * Individual functions are also exported by name for tree-shaking-friendly
 * imports. Where the same name is shared between hook categories (e.g.
 * `filePath` exists as both a completer and a validator), the namespaced form
 * (`c.filePath` / `v.filePath`) should be preferred to avoid ambiguity.
 *
 * @example
 * ```ts
 * import { v, t, c, d } from "./hooks/index";
 *
 * S.text({
 *   tooltip: "Config file",
 *   default: "",
 *   validation: v.all(v.notEmpty(), v.filePath()),
 *   transform:  t.pipe(t.trim(), t.expandPath()),
 *   complete:   c.filePath(),
 *   display:    d.path(),
 * })
 * ```
 *
 * @module
 */

// ─── Completers ───────────────────────────────────────────────────────────────

import { filePath as _cfilePath } from "./completefn.filePath";
import { staticList } from "./completefn.staticList";

/**
 * Pre-built completer factories.
 *
 * @example
 * complete: c.filePath()
 * complete: c.staticList(["dark", "light", "system"])
 */
export const c = {
  /** Complete filesystem paths (expands `~`, lists dirs with `/` suffix). */
  filePath: _cfilePath,
  /** Complete from a fixed list of strings (case-insensitive prefix match). */
  staticList,
} as const;

// ─── Display functions ────────────────────────────────────────────────────────

import { badge } from "./displayfn.badge";
import { color } from "./displayfn.color";
import { dictEntry } from "./displayfn.dict";
import { keybinding as _dKeybinding } from "./displayfn.keybinding";
import { path } from "./displayfn.path";

/**
 * Pre-built display function factories.
 *
 * @example
 * display: d.color()       // colored swatch for any color format
 * display: d.badge("#f93") // fixed-color badge
 * display: d.path()        // collapse home dir to ~
 * display: d.dictEntry()   // bold key → dim arrow → value
 * display: d.keybinding()  // "ctrl+k" rendered as "ctrl + k" with dim separators
 */
export const d = {
  /** Render any supported color format with a live truecolor swatch. */
  color,
  /** Wrap the value in a bracketed badge with a fixed hex color. */
  badge,
  /** Collapse the home directory prefix to `~`. */
  path,
  /**
   * Render a `DictEntry` as **bold key** + dim `→` + plain value.
   * @internal Used by the settings panel renderer.
   */
  dictEntry,
  /** Render a keyboard binding with dim `" + "` separators between parts. */
  keybinding: _dKeybinding,
} as const;

// ─── Transforms ───────────────────────────────────────────────────────────────

import { hsbToHex, hsvToHex, htmlNamedToHex, rgbToHex } from "./transformfn.color";
import { compose, pipe } from "./transformfn.compose";
import { expandPath } from "./transformfn.path";
import {
  camelCase,
  capitalize,
  kebabCase,
  lowercase,
  snakeCase,
  titleCase,
  trim,
  uppercase,
} from "./transformfn.trimCase";
import { normalizeUrl } from "./transformfn.url";

/**
 * Pre-built transform factories.
 *
 * @example
 * transform: t.pipe(t.trim(), t.lowercase())
 * transform: t.pipe(t.rgbToHex(), t.hsvToHex(), t.htmlNamedToHex())
 */
export const t = {
  // ── Composition ────────────────────────────────────────────────────────────
  /** Left-to-right composition: `pipe(a, b)(v)` === `b(a(v))`. */
  pipe,
  /** Right-to-left composition: `compose(a, b)(v)` === `a(b(v))`. */
  compose,

  // ── Path ───────────────────────────────────────────────────────────────────
  /** Expand a leading `~` to the user's home directory. */
  expandPath,

  // ── Text normalisation ─────────────────────────────────────────────────────
  /** Remove leading/trailing whitespace. */
  trim,
  /** Convert to lowercase. */
  lowercase,
  /** Convert to uppercase. */
  uppercase,
  /** Capitalise the first character; lowercase the rest. */
  capitalize,
  /** Title-case every word. */
  titleCase,
  /** Convert to camelCase. */
  camelCase,
  /** Convert to kebab-case. */
  kebabCase,
  /** Convert to snake_case. */
  snakeCase,

  // ── URL ────────────────────────────────────────────────────────────────────
  /** Lowercase protocol + hostname; ensure trailing `/` on root path. */
  normalizeUrl,

  // ── Color → hex ────────────────────────────────────────────────────────────
  /** Convert `rgb(r,g,b)` to `#rrggbb`; pass through anything else. */
  rgbToHex,
  /** Convert `hsv(h,s,v)` / `hsb(h,s,b)` to `#rrggbb`; pass through otherwise. */
  hsvToHex,
  /** Alias for `hsvToHex`. */
  hsbToHex,
  /** Convert a CSS4 named color to `#rrggbb`; pass through otherwise. */
  htmlNamedToHex,
} as const;

// ─── Validators ───────────────────────────────────────────────────────────────

import { notEmpty, oneOf, regex } from "./validationfn.basic";
import { hexColor, hsbColor, hsvColor, htmlNamedColor, rgbColor } from "./validationfn.color";
import { all, any } from "./validationfn.composition";
import { filePath as _vfilePath } from "./validationfn.filePath";
import { keybinding as _vKeybinding } from "./validationfn.keybinding";
import { integer, negative, percentage, positive, range } from "./validationfn.numeric";
import { uri, uriRFC } from "./validationfn.uri";
import { url } from "./validationfn.url";

/**
 * Pre-built validator factories.
 *
 * @example
 * validation: v.notEmpty()
 * validation: v.all(v.notEmpty(), v.hexColor())
 * validation: v.any(v.hexColor(), v.rgbColor(), v.htmlNamedColor())
 * validation: v.keybinding()
 */
export const v = {
  // ── General ────────────────────────────────────────────────────────────────
  /** Reject empty or whitespace-only values. */
  notEmpty,
  /** Match the value against a regular expression. */
  regex,
  /** Accept only values from an explicit allowlist. */
  oneOf,

  // ── Composition ────────────────────────────────────────────────────────────
  /** Pass when ALL validators pass (first failure wins). */
  all,
  /** Pass when ANY validator passes (all reasons joined on failure). */
  any,

  // ── File system ────────────────────────────────────────────────────────────
  /** Validate a filesystem path; optionally check that it exists on disk. */
  filePath: _vfilePath,

  // ── Numeric ────────────────────────────────────────────────────────────────
  /** Validate that the value is an integer (no fractional part). */
  integer,
  /** Validate a positive number (> 0 or ≥ 0 with `allowZero`). */
  positive,
  /** Validate a strictly negative number (< 0). */
  negative,
  /** Validate a number within an inclusive range ({ min?, max? }). */
  range,
  /** Validate a percentage: NumValue 0–1, TextValue 0–100 (with optional `%`). */
  percentage,

  // ── URI / URL ──────────────────────────────────────────────────────────────
  /** Validate an RFC-3986-like URI, optionally restricting allowed schemes. */
  uri,
  /** Alias for `uri`. */
  uriRFC,
  /** Validate an HTTP/HTTPS URL using the built-in URL parser. */
  url,

  // ── Color ──────────────────────────────────────────────────────────────────
  /** Validate a CSS hex color (`#rgb` or `#rrggbb`). */
  hexColor,
  /** Validate `rgb(r,g,b)` / `rgba(r,g,b,a)` notation. */
  rgbColor,
  /** Validate `hsv(h,s,v)` / `hsb(h,s,b)` notation. */
  hsvColor,
  /** Alias for `hsvColor`. */
  hsbColor,
  /** Validate a CSS4 named color (`coral`, `rebeccapurple`, etc.). */
  htmlNamedColor,

  // ── Keyboard ───────────────────────────────────────────────────────────────
  /**
   * Validate a keyboard binding string (e.g. `"ctrl+k"`, `"shift+up"`).
   * Reports typo suggestions when an unknown token is close to a known one.
   */
  keybinding: _vKeybinding,
} as const;
