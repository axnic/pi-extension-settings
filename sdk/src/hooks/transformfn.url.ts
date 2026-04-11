/**
 * hooks/transformfn.url.ts — URL normalisation transform.
 *
 * Normalises a URL string by lowercasing the protocol and hostname and
 * ensuring the pathname is at least `/`. Non-URL strings are returned
 * unchanged (no exception is thrown).
 *
 * @module
 */
import type { TransformFn } from "../core/nodes.ts";

/**
 * Normalise a URL: lowercase protocol + hostname, ensure trailing `/` on root.
 *
 * @example
 * t.normalizeUrl()("HTTPS://Example.COM") // "https://example.com/"
 * t.normalizeUrl()("not a url")           // "not a url"
 */
export function normalizeUrl(): TransformFn {
  return (value: string) => {
    const v = value.trim();
    try {
      const u = new URL(v);
      u.protocol = u.protocol.toLowerCase();
      u.hostname = u.hostname.toLowerCase();
      if (!u.pathname || u.pathname === "") u.pathname = "/";
      return u.href;
    } catch {
      return v;
    }
  };
}
