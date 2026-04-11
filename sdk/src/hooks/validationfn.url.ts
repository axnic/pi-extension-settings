/**
 * hooks/validationfn.url.ts — HTTP/HTTPS URL validator.
 *
 * @module
 */
import type { TextValue, ValidationFn } from "../core/nodes.ts";

/**
 * Validate an HTTP or HTTPS URL using the built-in `URL` parser.
 *
 * @param enforceHttps - When `true`, reject `http://` URLs (require `https://`).
 *
 * @example v.url()("https://example.com") // { valid: true, reason: "valid URL" }
 * @example v.url(true)("http://example.com") // { valid: false }
 */
export function url(enforceHttps = false): ValidationFn<TextValue> {
  return (value: string) => {
    const v = value.trim();
    if (!v) return { valid: false, reason: "value cannot be empty" };

    try {
      const parsed = new URL(v);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { valid: false, reason: "URL must use http:// or https://" };
      }
      if (enforceHttps && parsed.protocol !== "https:") {
        return { valid: false, reason: "only https:// URLs are allowed" };
      }
      return { valid: true, reason: "valid URL" };
    } catch {
      return { valid: false, reason: "invalid URL (unable to parse)" };
    }
  };
}
