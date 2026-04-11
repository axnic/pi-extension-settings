/**
 * hooks/validationfn.numeric.ts — Numeric validators for `Number` nodes.
 *
 * All validators in this file (except `percentage`) target `Number` nodes
 * and return `ValidationFn<NumValue>`. The `percentage` validator also
 * accepts `TextValue` for use with `Text` nodes.
 *
 * Compose validators with `v.all()` when you need multiple constraints, e.g.:
 *   `v.all(v.integer(), v.range({ min: 1, max: 100 }))`
 *
 * @module
 */
import type { NumValue, TextValue, ValidationFn } from "../core/nodes";

/**
 * Validate that the value is an integer (no fractional part).
 *
 * Combine with `v.range()` to also enforce bounds.
 *
 * @example S.number({ validation: v.integer() })
 * @example S.number({ validation: v.all(v.integer(), v.range({ min: 1, max: 100 })) })
 */
export function integer(): ValidationFn<NumValue> {
  return (value) => {
    if (!Number.isInteger(value)) return { valid: false, reason: "must be an integer" };
    return { valid: true };
  };
}

/**
 * Validate that the value is a strictly positive number (> 0).
 *
 * @param allowZero - When `true`, 0 is also accepted (value ≥ 0).
 *
 * @example v.positive()     // value > 0
 * @example v.positive(true) // value >= 0
 */
export function positive(allowZero = false): ValidationFn<NumValue> {
  return (value) => {
    if (allowZero ? value < 0 : value <= 0)
      return { valid: false, reason: `must be ${allowZero ? "≥" : ">"} 0` };
    return { valid: true };
  };
}

/**
 * Validate that the value is strictly negative (< 0).
 *
 * @example v.negative() // value < 0
 */
export function negative(): ValidationFn<NumValue> {
  return (value) => {
    if (value >= 0) return { valid: false, reason: "must be < 0" };
    return { valid: true };
  };
}

/**
 * Validate that the value falls within an inclusive numeric range.
 *
 * Pass an object with `min`, `max`, or both. Either bound may be omitted.
 *
 * @example v.range({ min: 0, max: 100 }) // 0 ≤ n ≤ 100
 * @example v.range({ min: 1 })           // n ≥ 1 (no upper bound)
 * @example v.range({ max: 255 })         // n ≤ 255 (no lower bound)
 */
export function range({ min, max }: { min?: number; max?: number } = {}): ValidationFn<NumValue> {
  if (min !== undefined && !Number.isFinite(min) && max !== undefined && !Number.isFinite(max)) {
    return () => ({ valid: true }); // no bounds, always valid for any finite number (short-circuit to avoid unnecessary checks)
  }

  return (value) => {
    if (min !== undefined && value < min) return { valid: false, reason: `must be ≥ ${min}` };
    if (max !== undefined && value > max) return { valid: false, reason: `must be ≤ ${max}` };
    return { valid: true };
  };
}

/**
 * Validate a percentage value.
 *
 * - **`Number` nodes** (`NumValue`): value must be between **0 and 1** (e.g. `0.75` for 75 %).
 * - **`Text` nodes** (`TextValue`): value must be a number string between 0 and 100,
 *   with or without a trailing `%` sign (e.g. `"75"` or `"75%"`).
 *
 * @example S.number({ validation: v.percentage() }) // 0 ≤ n ≤ 1
 * @example S.text({ validation: v.percentage() })   // "75%" or "75"
 */
export function percentage(): ValidationFn<TextValue | NumValue> {
  return (value) => {
    if (typeof value === "number") {
      if (!Number.isFinite(value)) return { valid: false, reason: "must be a number" };
      if (value < 0 || value > 1) return { valid: false, reason: "must be between 0 and 1" };
      return { valid: true };
    }
    let v = value.trim();
    if (v.endsWith("%")) v = v.slice(0, -1).trim();
    const parsed = Number(v);
    if (!Number.isFinite(parsed)) return { valid: false, reason: "must be a number" };
    if (parsed < 0 || parsed > 100) return { valid: false, reason: "must be between 0 and 100" };
    return { valid: true };
  };
}
