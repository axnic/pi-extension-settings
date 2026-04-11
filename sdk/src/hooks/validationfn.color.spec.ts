import { describe, expect, it } from "vitest";
import { hexColor, hsbColor, hsvColor, htmlNamedColor, rgbColor } from "./validationfn.color";

describe("hexColor()", () => {
  const v = hexColor();
  it("accepts #rgb (short)", () => expect(v("#f93").valid).toBe(true));
  it("accepts #rrggbb (long)", () => expect(v("#ff930f").valid).toBe(true));
  it("is case-insensitive", () => expect(v("#FF930F").valid).toBe(true));
  it("trims whitespace", () => expect(v("  #fff  ").valid).toBe(true));
  it("rejects missing #", () => expect(v("ff930f").valid).toBe(false));
  it("rejects 4-char hex", () => expect(v("#fff0").valid).toBe(false));
  it("rejects 7-char hex", () => expect(v("#ff930ff").valid).toBe(false));
  it("rejects named colors", () => expect(v("red").valid).toBe(false));
  it("rejects rgb notation", () => expect(v("rgb(255,0,0)").valid).toBe(false));
  it("reason contains helpful text", () => {
    const r = v("invalid");
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/#rgb/i);
  });
});

describe("rgbColor()", () => {
  const v = rgbColor();
  it("accepts rgb(int, int, int)", () => expect(v("rgb(255, 0, 0)").valid).toBe(true));
  it("accepts rgba(int, int, int, float)", () =>
    expect(v("rgba(255, 0, 0, 0.5)").valid).toBe(true));
  it("accepts rgb with percentages", () => expect(v("rgb(100%, 0%, 0%)").valid).toBe(true));
  it("accepts rgba with percentages", () => expect(v("rgba(100%, 0%, 0%, 1)").valid).toBe(true));
  it("accepts rgb without spaces", () => expect(v("rgb(255,0,0)").valid).toBe(true));
  it("rejects hex", () => expect(v("#ff0000").valid).toBe(false));
  it("rejects out-of-range channel (256)", () => expect(v("rgb(256, 0, 0)").valid).toBe(false));
  it("rejects out-of-range channel (101%)", () => expect(v("rgb(101%, 0%, 0%)").valid).toBe(false));
  it("rejects float channels", () => expect(v("rgb(1.5, 0, 0)").valid).toBe(false));
  it("rejects named colors", () => expect(v("red").valid).toBe(false));
  it("includes format hint in reason", () => {
    const r = v("bad");
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/rgb/);
  });
});

describe("hsvColor() / hsbColor()", () => {
  const v = hsvColor();
  it("accepts hsv(h, s%, v%)", () => expect(v("hsv(30, 94%, 100%)").valid).toBe(true));
  it("accepts hsb(h, s, v) without %", () => expect(v("hsb(0, 100, 100)").valid).toBe(true));
  it("accepts hsv with floats", () => expect(v("hsv(180.5, 50%, 75%)").valid).toBe(true));
  it("is case-insensitive", () => expect(v("HSV(0, 100%, 100%)").valid).toBe(true));
  it("rejects h > 360", () => expect(v("hsv(361, 100%, 100%)").valid).toBe(false));
  it("rejects s > 100%", () => expect(v("hsv(0, 101%, 100%)").valid).toBe(false));
  it("rejects v > 100", () => expect(v("hsv(0, 100%, 101%)").valid).toBe(false));
  it("rejects hex", () => expect(v("#ff0000").valid).toBe(false));
  it("hsbColor is an alias", () => expect(hsbColor()("hsb(0, 100, 100)").valid).toBe(true));
});

describe("htmlNamedColor()", () => {
  const v = htmlNamedColor();
  it("accepts common named colors", () => {
    expect(v("red").valid).toBe(true);
    expect(v("coral").valid).toBe(true);
    expect(v("rebeccapurple").valid).toBe(true);
    expect(v("transparent").valid).toBe(false); // not in CSS4 named map
  });
  it("is case-insensitive", () => {
    expect(v("RED").valid).toBe(true);
    expect(v("Coral").valid).toBe(true);
  });
  it("trims whitespace", () => expect(v("  red  ").valid).toBe(true));
  it("rejects unknown names", () => {
    expect(v("banana").valid).toBe(false);
    expect(v("not-a-color").valid).toBe(false);
  });
  it("rejects hex (not a named color)", () => expect(v("#ff0000").valid).toBe(false));
  it("includes hint in reason on failure", () => {
    const r = v("banana");
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/CSS/i);
  });
});
