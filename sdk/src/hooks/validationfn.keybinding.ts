/**
 * hooks/validationfn.keybinding.ts — Keyboard binding validator.
 *
 * A valid binding is a `+`-separated sequence of zero or more modifier keys
 * followed by exactly one non-modifier key.
 *
 * Accepted modifiers:  ctrl · alt · shift · meta · cmd · option
 * Accepted key names:  up · down · left · right · enter · escape · esc ·
 *                      tab · backspace · delete · home · end · space ·
 *                      a–z · 0–9 · f1–f12
 *
 * @module
 */

import type { TextValue, ValidationFn } from "../core/nodes.ts";

// ─── Token tables ──────────────────────────────────────────────────────────────

const MODIFIERS = new Set(["ctrl", "alt", "shift", "meta", "cmd", "option"]);

const SPECIAL_KEYS = new Set([
  "up",
  "down",
  "left",
  "right",
  "enter",
  "escape",
  "esc",
  "tab",
  "backspace",
  "delete",
  "home",
  "end",
  "space",
]);

const ALL_TOKENS: string[] = [
  ...MODIFIERS,
  ...SPECIAL_KEYS,
  ..."abcdefghijklmnopqrstuvwxyz0123456789".split(""),
  ...Array.from({ length: 12 }, (_, i) => `f${i + 1}`),
];

// ─── Token helpers ─────────────────────────────────────────────────────────────

function isSingleCharKey(token: string): boolean {
  return /^[a-z0-9]$/.test(token);
}

function isFunctionKey(token: string): boolean {
  return /^f([1-9]|1[0-2])$/.test(token);
}

function isKnownToken(token: string): boolean {
  return (
    MODIFIERS.has(token) ||
    SPECIAL_KEYS.has(token) ||
    isSingleCharKey(token) ||
    isFunctionKey(token)
  );
}

// ─── Typo suggestion ───────────────────────────────────────────────────────────

/** Levenshtein edit distance between two strings. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1]?.[j - 1]!
          : 1 + Math.min(dp[i - 1]?.[j]!, dp[i]?.[j - 1]!, dp[i - 1]?.[j - 1]!);
    }
  }
  return dp[m]?.[n]!;
}

/**
 * Return the closest known token to `input`, or `undefined` if none is
 * within an edit distance of 2 (enough to catch common typos).
 */
function closestToken(input: string): string | undefined {
  let best: string | undefined;
  let bestDist = Infinity;
  for (const token of ALL_TOKENS) {
    const dist = levenshtein(input, token);
    if (dist < bestDist) {
      bestDist = dist;
      best = token;
    }
  }
  return bestDist <= 2 ? best : undefined;
}

// ─── Exported factory ──────────────────────────────────────────────────────────

/**
 * Validate a keyboard binding string.
 *
 * Returns `{ valid: false, reason }` with a human-readable message and, where
 * possible, a suggestion for the likely intended value (e.g. `"ctrol"` →
 * `did you mean "ctrl"?`).
 *
 * @example
 * ```ts
 * validation: v.keybinding()
 * // Valid:   "ctrl+k", "shift+up", "space", "d", "ctrl+shift+f5"
 * // Invalid: "ctrol+k"    → Unknown key "ctrol" — did you mean "ctrl"?
 * // Invalid: "ctrl+"      → Missing key after "+"
 * // Invalid: "ctrl+ctrl"  → Duplicate modifier "ctrl"
 * // Invalid: "ctrl+alt"   → "alt" is a modifier — add a key after it, e.g. "alt+k"
 * ```
 */
export function keybinding(): ValidationFn<TextValue> {
  return (value) => {
    const normalized = value.trim().toLowerCase();

    if (normalized.length === 0) {
      return { valid: false, reason: "Binding cannot be empty" };
    }

    if (normalized.endsWith("+")) {
      return { valid: false, reason: 'Missing key after "+"' };
    }

    const parts = normalized.split("+");

    if (parts.some((part) => part.length === 0)) {
      return {
        valid: false,
        reason: 'Invalid key sequence — empty segment between "+"',
      };
    }

    const seenModifiers = new Set<string>();

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;

      if (!isKnownToken(part)) {
        const suggestion = closestToken(part);
        const hint = suggestion ? ` — did you mean "${suggestion}"?` : "";
        return { valid: false, reason: `Unknown key "${part}"${hint}` };
      }

      const isModifier = MODIFIERS.has(part);
      const isLast = i === parts.length - 1;

      if (!isLast && !isModifier) {
        return {
          valid: false,
          reason: `"${part}" is not a modifier — only modifiers (${[...MODIFIERS].join(", ")}) may precede "+"`,
        };
      }

      if (isModifier && seenModifiers.has(part)) {
        return { valid: false, reason: `Duplicate modifier "${part}"` };
      }

      if (isModifier) seenModifiers.add(part);
    }

    const last = parts[parts.length - 1]!;
    if (MODIFIERS.has(last)) {
      return {
        valid: false,
        reason: `"${last}" is a modifier — add a non-modifier key after it, e.g. "${last}+k"`,
      };
    }

    return { valid: true };
  };
}
