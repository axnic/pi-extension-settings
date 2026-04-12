import { describe, expect, it } from "vitest";
import { normalizeUrl } from "./transformfn.url";

describe("normalizeUrl()", () => {
  it("lowercases protocol and hostname", () => {
    expect(normalizeUrl()("HTTPS://Example.COM/path")).toBe(
      "https://example.com/path",
    );
  });
  it("ensures trailing slash on root URL", () => {
    expect(normalizeUrl()("https://example.com")).toBe("https://example.com/");
  });
  it("preserves path, query and fragment", () => {
    const url = "https://example.com/path?q=1#frag";
    expect(normalizeUrl()(url)).toBe(url);
  });
  it("passes through non-URL strings unchanged", () => {
    expect(normalizeUrl()("not a url")).toBe("not a url");
    expect(normalizeUrl()("")).toBe("");
  });
});
