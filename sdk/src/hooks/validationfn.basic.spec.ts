import { describe, expect, it } from "vitest";
import { notEmpty, oneOf, regex } from "./validationfn.basic";

describe("notEmpty()", () => {
  it("rejects empty string", () => expect(notEmpty()("").valid).toBe(false));
  it("rejects whitespace-only", () =>
    expect(notEmpty()("   ").valid).toBe(false));
  it("accepts non-empty string", () =>
    expect(notEmpty()("hello").valid).toBe(true));
  it("reason contains helpful text", () =>
    expect(notEmpty()("").reason).toMatch(/empty/i));
});

describe("regex()", () => {
  it("accepts strings matching pattern", () => {
    expect(regex(/^\d{4}$/, "4-digit year")("2024").valid).toBe(true);
  });
  it("rejects strings not matching pattern", () => {
    const r = regex(/^\d{4}$/, "4-digit year")("abc");
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("4-digit year");
  });
});

describe("oneOf()", () => {
  const v = oneOf(["yes", "no", "maybe"]);
  it("accepts exact matches", () => {
    expect(v("yes").valid).toBe(true);
    expect(v("no").valid).toBe(true);
  });
  it("rejects values not in the list", () => {
    const r = v("nope");
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("yes");
  });
  it("is case-sensitive", () => expect(v("YES").valid).toBe(false));
});
