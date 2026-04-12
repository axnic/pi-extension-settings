import { describe, expect, it } from "vitest";
import { url } from "./validationfn.url";

describe("url()", () => {
  it("accepts http and https URLs", () => {
    const v = url();
    expect(v("http://example.com").valid).toBe(true);
    expect(v("https://example.com/path?query=1#frag").valid).toBe(true);
    expect(v("https://example.com").reason).toContain("valid");
  });
  it("enforces https when requested", () => {
    const v = url(true);
    expect(v("https://example.com").valid).toBe(true);
    const notOk = v("http://example.com");
    expect(notOk.valid).toBe(false);
    expect(notOk.reason.toLowerCase()).toContain("only https");
  });
  it("rejects non-http(s) schemes", () => {
    expect(url()("ftp://example.com").valid).toBe(false);
  });
  it("rejects unparsable or scheme-less inputs", () => {
    expect(url()("www.example.com").valid).toBe(false);
    expect(url()("not a url").valid).toBe(false);
  });
  it("accepts complex valid URLs", () => {
    expect(url()("https://example.com:8080/path?x=1&y=2#frag").valid).toBe(
      true,
    );
  });
});
