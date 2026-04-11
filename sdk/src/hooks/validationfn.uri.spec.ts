import { describe, expect, it } from "vitest";
import { uri, uriRFC } from "./validationfn.uri";

describe("uri()", () => {
  it("accepts basic http and https URIs", () => {
    const v = uri();
    expect(v("http://example.com").valid).toBe(true);
    expect(v("https://example.com/path?query=1#frag").valid).toBe(true);
  });
  it("accepts mailto and custom schemes", () => {
    const v = uri();
    expect(v("mailto:joe@example.com").valid).toBe(true);
    // uriRFC is a factory — call it first:
    expect(uriRFC()("custom+scheme:some-data").valid).toBe(true);
  });
  it("rejects empty strings and scheme-less inputs", () => {
    const v = uri();
    expect(v("").valid).toBe(false);
    expect(v("   ").valid).toBe(false);
    const res = v("www.example.com");
    expect(res.valid).toBe(false);
    expect(res.reason.toLowerCase()).toContain("invalid uri");
  });
  it("detects malformed percent-encoding", () => {
    const v = uri();
    const bad = v("http://example.com/%GG");
    expect(bad.valid).toBe(false);
    expect(bad.reason.toLowerCase()).toContain("percent-encoding");
    expect(v("http://example.com/%20").valid).toBe(true);
  });
  it("enforces allowedProtocols (case-insensitive)", () => {
    const wl = uri(["http", "https"]);
    expect(wl("http://example.com").valid).toBe(true);
    expect(wl("HTTPS://example.com").valid).toBe(true);
    const rej = wl("mailto:joe@example.com");
    expect(rej.valid).toBe(false);
    expect(rej.reason.toLowerCase()).toContain("scheme must be one of");
  });
  it("requires content after //", () => {
    const v = uri();
    expect(v("http://").valid).toBe(false);
    expect(v("http:// example.com").valid).toBe(false);
  });
  it("accepts IPv6 literals and typical authority forms", () => {
    const v = uri();
    expect(v("http://[::1]/").valid).toBe(true);
    expect(v("http://127.0.0.1:8080/path").valid).toBe(true);
  });
});
