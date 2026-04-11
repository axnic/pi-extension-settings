/**
 * hooks/validationfn.filePath.ts — Filesystem path validators.
 *
 * @module
 */
import { existsSync } from "node:fs";
import type { TextValue, ValidationFn } from "../core/nodes.ts";

/**
 * Validate a filesystem path.
 *
 * @param exists - When `true`, additionally check that the path exists on disk.
 *   Defaults to `false` (syntax-only check: non-empty).
 *
 * @example v.filePath()("/some/path")      // { valid: true, reason: "valid path" }
 * @example v.filePath(true)("/no/such")    // { valid: false, reason: "path does not exist" }
 */
export function filePath(exists = false): ValidationFn<TextValue> {
  return (value) => {
    const v = value.trim();
    if (!v) return { valid: false, reason: "path cannot be empty" };
    if (exists && !existsSync(v)) return { valid: false, reason: "path does not exist" };
    return { valid: true, reason: exists ? "path exists" : "valid path" };
  };
}
