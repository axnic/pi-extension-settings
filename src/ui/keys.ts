/**
 * keys.ts — Keyboard binding matcher used across the settings panel UI.
 *
 * `matchesBinding` is the single source of truth for testing whether a raw
 * terminal input string matches a configurable binding. It used to live
 * (twice, with subtly different behaviour) in `panel.ts` and `input.ts`.
 *
 * The function understands a few categories of input:
 *
 * 1. Plain `pi-tui` shortcuts (`"r"`, `"shift+space"`, `"ctrl+k"`, …) — these
 *    are handed off to {@link matchesKey} from `@mariozechner/pi-tui`.
 * 2. The literal `"space"` token, mapped to a single space character.
 * 3. The `alt+`, `option+`, and `meta+` aliases — terminals are wildly
 *    inconsistent about which prefix they emit, so any of the three is
 *    accepted as a synonym of the other two.
 * 4. Single printable characters (`"d"`, `"x"`).
 * 5. The legacy ESC-prefixed byte sequence `\x1b<char>` for `alt+<char>` /
 *    `option+<char>` on terminals that don't speak the Kitty protocol.
 */

import { type KeyId, matchesKey } from "@mariozechner/pi-tui";

/**
 * Test whether a raw input byte sequence matches the given keyboard binding.
 *
 * @param data    - Raw bytes received from the terminal (already decoded by
 *                  `pi-tui`'s input layer).
 * @param binding - The configured binding string from the schema, e.g.
 *                  `"shift+space"`, `"r"`, `"alt+k"`. May contain mixed case
 *                  and surrounding whitespace; both are normalised.
 * @returns       - `true` if `data` should trigger the binding's action.
 */
export function matchesBinding(data: string, binding: string): boolean {
  const normalized = binding.trim().toLowerCase();
  if (normalized.length === 0) return false;
  if (matchesKey(data, normalized as KeyId)) return true;
  if (normalized === "space" && data === " ") return true;

  // Modifier-prefix aliasing: alt ↔ option ↔ meta.
  if (normalized.startsWith("alt+")) {
    const rest = normalized.slice(4);
    if (
      matchesKey(data, `meta+${rest}` as KeyId) ||
      matchesKey(data, `option+${rest}` as KeyId)
    ) {
      return true;
    }
  }
  if (normalized.startsWith("option+")) {
    const rest = normalized.slice(7);
    if (
      matchesKey(data, `alt+${rest}` as KeyId) ||
      matchesKey(data, `meta+${rest}` as KeyId)
    ) {
      return true;
    }
  }
  if (normalized.startsWith("meta+")) {
    const rest = normalized.slice(5);
    if (
      matchesKey(data, `alt+${rest}` as KeyId) ||
      matchesKey(data, `option+${rest}` as KeyId)
    ) {
      return true;
    }
  }

  // Bare single-character bindings (e.g. "d", "x").
  if (normalized.length === 1) {
    return data === normalized;
  }

  // Legacy ESC-prefixed alt/option fallback for terminals not on the Kitty
  // protocol: `alt+a` arrives as the two-byte sequence `\x1ba`.
  const altMatch = normalized.match(/^(alt|option)\+(.+)$/);
  if (altMatch?.[2] && altMatch[2].length === 1) {
    const key = altMatch[2];
    return (
      matchesKey(data, `meta+${key}` as KeyId) ||
      matchesKey(data, `option+${key}` as KeyId) ||
      data === `\x1b${key}` ||
      data === `\x1b${key.toUpperCase()}`
    );
  }

  return false;
}
