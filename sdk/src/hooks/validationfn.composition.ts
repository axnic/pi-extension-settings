/**
 * hooks/validationfn.composition.ts — Validator composition helpers.
 *
 * @module
 */
import type { TextValue, ValidationFn } from "../core/nodes.ts";

/**
 * Create a validator that passes only when ALL provided validators pass.
 * Returns the first failure encountered.
 *
 * @example v.all(v.notEmpty(), v.hexColor())("#fff") // { valid: true }
 */
export function all(...validators: ValidationFn<TextValue>[]): ValidationFn<TextValue> {
  return (value) => {
    for (const v of validators) {
      const result = v(value);
      if (!result.valid) return result;
    }
    return { valid: true };
  };
}

/**
 * Create a validator that passes when ANY of the provided validators passes.
 * On failure, returns `reason` as an array — one entry per failed sub-validator —
 * so the UI can display each failure on its own line.
 *
 * @example v.any(v.hexColor(), v.htmlNamedColor())("coral") // { valid: true }
 * @example v.any(v.hexColor(), v.htmlNamedColor())("???")
 *   // { valid: false, reason: ["must be #rgb or #rrggbb …", "not a recognised CSS named color …"] }
 */
export function any(...validators: ValidationFn<TextValue>[]): ValidationFn<TextValue> {
  return (value) => {
    const reasons: string[] = [];
    for (const v of validators) {
      const result = v(value);
      if (result.valid) return result;
      const r = result.reason;
      if (Array.isArray(r)) {
        reasons.push(...r);
      } else {
        reasons.push(r);
      }
    }
    return { valid: false, reason: reasons };
  };
}
