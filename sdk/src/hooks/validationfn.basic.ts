/**
 * hooks/validationfn.basic.ts — General-purpose primitive validators.
 *
 * @module
 */
import type { TextValue, ValidationFn } from "../core/nodes";

/**
 * Reject blank (empty or whitespace-only) values.
 *
 * @example v.notEmpty()("") // { valid: false, reason: "value cannot be empty" }
 */
export function notEmpty(): ValidationFn<TextValue> {
  return (value) => {
    if (value.trim().length === 0) return { valid: false, reason: "value cannot be empty" };
    return { valid: true };
  };
}

/**
 * Match the value against a regular expression.
 *
 * @param pattern - The RegExp to test against.
 * @param reason  - The failure message shown to the user.
 *
 * @example v.regex(/^\d{4}$/, "must be a 4-digit year")("2024") // { valid: true }
 */
export function regex(pattern: RegExp, reason: string): ValidationFn<TextValue> {
  return (value) => (pattern.test(value) ? { valid: true } : { valid: false, reason });
}

/**
 * Accept only values from an explicit allowlist (case-sensitive).
 *
 * @param allowed - Array of accepted strings.
 *
 * @example v.oneOf(["yes", "no"])("yes") // { valid: true }
 */
export function oneOf(allowed: string[]): ValidationFn<TextValue> {
  return (value) => {
    if (allowed.includes(value)) return { valid: true };
    return {
      valid: false,
      reason: `must be one of: ${allowed.map((v) => `"${v}"`).join(", ")}`,
    };
  };
}
