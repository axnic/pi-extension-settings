import { describe, expect, it } from "vitest";
import {
  ansiFg,
  anyToHex,
  CSS_NAMED_COLORS,
  channelToHex,
  hsvToRgb,
  parseHex,
  parseHsv,
  parseHtmlNamed,
  parseRgb,
  rgbToHexString,
} from "./colorUtils";

describe("colorUtils", () => {
  describe("channelToHex()", () => {
    it("converts integers to two-char lowercase hex and clamps", () => {
      expect(channelToHex(255)).toBe("ff");
      expect(channelToHex(0)).toBe("00");
      expect(channelToHex(16)).toBe("10");
      // rounding
      expect(channelToHex(15.6)).toBe("10");
      // clamp below 0
      expect(channelToHex(-10)).toBe("00");
      // clamp above 255
      expect(channelToHex(999)).toBe("ff");
    });
  });

  describe("rgbToHexString()", () => {
    it("builds a normalized #rrggbb string", () => {
      expect(rgbToHexString(255, 147, 15)).toBe("#ff930f");
      expect(rgbToHexString(0, 0, 0)).toBe("#000000");
    });
  });

  describe("parseHex()", () => {
    it("parses long-form hex", () => {
      expect(parseHex("#ff930f")).toEqual({ r: 255, g: 147, b: 15 });
      // case-insensitive
      expect(parseHex("#FF930F")).toEqual({ r: 255, g: 147, b: 15 });
    });

    it("parses short-form hex and expands correctly", () => {
      expect(parseHex("#f93")).toEqual({ r: 255, g: 153, b: 51 });
      expect(parseHex("#F93")).toEqual({ r: 255, g: 153, b: 51 });
    });

    it("returns null for invalid hex", () => {
      expect(parseHex("ff930f")).toBeNull();
      expect(parseHex("#ggg")).toBeNull();
      expect(parseHex("#1234")).toBeNull();
    });
  });

  describe("parseRgb()", () => {
    it("parses integer rgb() values", () => {
      expect(parseRgb("rgb(255, 147, 15)")).toEqual({ r: 255, g: 147, b: 15 });
      expect(parseRgb("rgb(0,0,0)")).toEqual({ r: 0, g: 0, b: 0 });
    });

    it("parses rgba() ignoring alpha", () => {
      expect(parseRgb("rgba(255, 147, 15, 0.5)")).toEqual({
        r: 255,
        g: 147,
        b: 15,
      });
    });

    it("parses percentage channels", () => {
      // 100% -> 255, 57% -> Math.round(0.57*255) = 145, 6% -> Math.round(0.06*255) = 15
      expect(parseRgb("rgba(100%, 57%, 6%, 1)")).toEqual({
        r: 255,
        g: 145,
        b: 15,
      });
    });

    it("rejects floats for integer channels and out-of-range values", () => {
      expect(parseRgb("rgb(1.5, 2, 3)")).toBeNull();
      expect(parseRgb("rgb(-1, 0, 0)")).toBeNull();
      expect(parseRgb("rgb(256,0,0)")).toBeNull();
      expect(parseRgb("not-a-color")).toBeNull();
    });
  });

  describe("parseHsv()", () => {
    it("parses hsv() with percentages and normalises s/v to 0..1", () => {
      const p = parseHsv("hsv(30, 94%, 100%)");
      expect(p).toEqual({ h: 30, s: 0.94, v: 1 });
    });

    it("parses hsb() and numeric s/v", () => {
      const p = parseHsv("hsb(0, 100, 100)");
      expect(p).toEqual({ h: 0, s: 1, v: 1 });
    });

    it("returns null on invalid ranges or syntax", () => {
      expect(parseHsv("hsv(400, 50%, 50%)")).toBeNull(); // hue out of range
      expect(parseHsv("hsv(30, -10%, 50%)")).toBeNull(); // saturation out of range
      expect(parseHsv("rgb(255,0,0)")).toBeNull();
    });
  });

  describe("hsvToRgb()", () => {
    it("converts primary hues correctly", () => {
      expect(hsvToRgb(0, 1, 1)).toEqual({ r: 255, g: 0, b: 0 }); // red
      expect(hsvToRgb(120, 1, 1)).toEqual({ r: 0, g: 255, b: 0 }); // green
    });

    it("returns expected values for fractional saturation/value", () => {
      // example from the implementation documentation
      expect(hsvToRgb(240, 0.5, 1)).toEqual({ r: 128, g: 128, b: 255 });
    });
  });

  describe("CSS_NAMED_COLORS & parseHtmlNamed()", () => {
    it("contains known named colors and parseHtmlNamed is case-insensitive", () => {
      expect(CSS_NAMED_COLORS).toHaveProperty("coral");
      expect(CSS_NAMED_COLORS.coral).toBe("#ff7f50");
      expect(parseHtmlNamed("coral")).toEqual({ r: 255, g: 127, b: 80 });
      expect(parseHtmlNamed("RED")).toEqual({ r: 255, g: 0, b: 0 });
      expect(parseHtmlNamed("banana")).toBeNull();
    });
  });

  describe("anyToHex()", () => {
    it("normalises hex and returns lowercase #rrggbb", () => {
      expect(anyToHex("#f93")).toBe("#ff9933");
      expect(anyToHex("#FF930F")).toBe("#ff930f");
    });

    it("converts rgb()/hsv()/named colors to hex", () => {
      expect(anyToHex("rgb(255, 0, 0)")).toBe("#ff0000");
      expect(anyToHex("hsv(0, 100%, 100%)")).toBe("#ff0000");
      expect(anyToHex("coral")).toBe("#ff7f50");
    });

    it("returns null for unrecognised values", () => {
      expect(anyToHex("not-a-color")).toBeNull();
    });
  });

  describe("ansiFg()", () => {
    it("wraps text in an ANSI 24-bit foreground escape sequence", () => {
      const seq = ansiFg(255, 147, 15, "■");
      expect(seq).toBe("\x1b[38;2;255;147;15m■\x1b[39m");
      // ensure it contains the expected parts
      expect(seq).toContain("\x1b[38;2;255;147;15m");
      expect(seq).toContain("■");
      expect(seq).toContain("\x1b[39m");
    });
  });
});
