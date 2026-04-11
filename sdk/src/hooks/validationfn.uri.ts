/**
 * hooks/validationfn.uri.ts — RFC-3986 URI syntax validator.
 *
 * @module
 */
import type { TextValue, ValidationFn } from "../core/nodes";

/**
 * Validate a URI string against an RFC-3986-like grammar.
 *
 * @param allowedProtocols - When provided, only URIs whose scheme matches
 *   one of the listed values (case-insensitive) are accepted.
 *
 * @example v.uri()("https://example.com") // { valid: true }
 * @example v.uri(["http", "https"])("ftp://example.com") // { valid: false }
 */
export function uri(allowedProtocols?: string[]): ValidationFn<TextValue> {
  const uriRegex =
    /^([A-Za-z][A-Za-z0-9+.-]*):(?:(?:\/\/[^\s?#][^\s]*)|(?:[A-Za-z0-9\-._~!$&'()*+,;=:@/?#]|%[0-9A-Fa-f]{2})*)$/;
  const normAllowed = allowedProtocols?.map((p) => String(p).toLowerCase()) ?? null;

  return (value: string) => {
    const v = value.trim();
    if (v.length === 0) return { valid: false, reason: "value cannot be empty" };

    // Check percent-encoding before the main regex — the authority path
    // regex (`//[^\s]*`) allows any non-whitespace, so bad sequences like
    // `%GG` would otherwise slip through.
    if (/%(?![0-9A-Fa-f]{2})/.test(v)) {
      return {
        valid: false,
        reason: "invalid percent-encoding (use %HH hex escapes)",
      };
    }

    const m = uriRegex.exec(v);
    if (!m) {
      return {
        valid: false,
        reason: "invalid URI syntax (must follow RFC-3986 grammar)",
      };
    }

    const scheme = m[1]!;
    if (normAllowed && !normAllowed.includes(scheme.toLowerCase())) {
      return {
        valid: false,
        reason: `scheme must be one of: ${normAllowed.join(", ")}`,
      };
    }

    const afterScheme = v.slice(scheme.length + 1);
    if (afterScheme.startsWith("//")) {
      if (afterScheme.length === 2)
        return {
          valid: false,
          reason: "authority component expected after // (e.g. //host)",
        };
      if (/^\/\/\s/.test(afterScheme))
        return {
          valid: false,
          reason: "unexpected whitespace after // in authority component",
        };
    }

    return { valid: true };
  };
}

/** Alias for {@link uri}. */
export const uriRFC = uri;
