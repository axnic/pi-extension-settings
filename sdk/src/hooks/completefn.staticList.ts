/**
 * hooks/completefn.staticList.ts — Static-list completer.
 *
 * Returns suggestions from a fixed list of strings using case-insensitive
 * prefix matching. Preserves the original ordering of `values`.
 *
 * @module
 */
import type { CompleteFn } from "../core/nodes";

/**
 * Create a completer that suggests from a fixed list of strings.
 *
 * Matching is case-insensitive prefix matching. If `partial` is empty,
 * all values are returned.
 *
 * @param values - Candidate strings in the desired display order.
 *
 * @example
 * S.enum({
 *   description: "Color theme",
 *   default: "dark",
 *   values: ["dark", "light", "system"],
 *   complete: c.staticList(["dark", "light", "system"]),
 * })
 */
export function staticList(values: string[]): CompleteFn {
  return async (partial: string) => {
    const lower = (partial ?? "").toLowerCase();
    return values.filter((v) => v.toLowerCase().startsWith(lower));
  };
}
