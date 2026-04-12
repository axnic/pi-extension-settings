import { describe, expect, it } from "vitest";
import {
  hsbToHex,
  hsvToHex,
  htmlNamedToHex,
  rgbToHex,
} from "./transformfn.color";

describe("rgbToHex()", () => {
  const t = rgbToHex();
  it("converts rgb(255, 0, 0) to #ff0000", () =>
    expect(t("rgb(255, 0, 0)")).toBe("#ff0000"));
  it("converts rgb(255, 147, 15) to #ff930f", () =>
    expect(t("rgb(255, 147, 15)")).toBe("#ff930f"));
  it("converts rgba (ignores alpha)", () =>
    expect(t("rgba(255, 0, 0, 0.5)")).toBe("#ff0000"));
  it("converts percentage channels", () =>
    expect(t("rgb(100%, 0%, 0%)")).toBe("#ff0000"));
  it("passes through hex unchanged", () =>
    expect(t("#ff0000")).toBe("#ff0000"));
  it("passes through named colors unchanged", () =>
    expect(t("coral")).toBe("coral"));
  it("passes through hsv unchanged", () =>
    expect(t("hsv(0, 100%, 100%)")).toBe("hsv(0, 100%, 100%)"));
  it("passes through invalid strings unchanged", () =>
    expect(t("banana")).toBe("banana"));
});

describe("hsvToHex() / hsbToHex()", () => {
  const t = hsvToHex();
  it("converts hsv(0, 100%, 100%) to #ff0000 (red)", () =>
    expect(t("hsv(0, 100%, 100%)")).toBe("#ff0000"));
  it("converts hsv(120, 100%, 100%) to #00ff00 (green)", () =>
    expect(t("hsv(120, 100%, 100%)")).toBe("#00ff00"));
  it("converts hsv(240, 100%, 100%) to #0000ff (blue)", () =>
    expect(t("hsv(240, 100%, 100%)")).toBe("#0000ff"));
  it("converts hsb notation", () =>
    expect(t("hsb(0, 100, 100)")).toBe("#ff0000"));
  it("passes through rgb unchanged", () =>
    expect(t("rgb(255, 0, 0)")).toBe("rgb(255, 0, 0)"));
  it("passes through hex unchanged", () =>
    expect(t("#ff0000")).toBe("#ff0000"));
  it("hsbToHex is an alias", () =>
    expect(hsbToHex()("hsb(0, 100, 100)")).toBe("#ff0000"));
});

describe("htmlNamedToHex()", () => {
  const t = htmlNamedToHex();
  it("converts red to #ff0000", () => expect(t("red")).toBe("#ff0000"));
  it("converts coral to #ff7f50", () => expect(t("coral")).toBe("#ff7f50"));
  it("is case-insensitive", () => expect(t("RED")).toBe("#ff0000"));
  it("passes through hex unchanged", () =>
    expect(t("#ff0000")).toBe("#ff0000"));
  it("passes through rgb unchanged", () =>
    expect(t("rgb(255,0,0)")).toBe("rgb(255,0,0)"));
  it("passes through unknown names unchanged", () =>
    expect(t("banana")).toBe("banana"));
});

describe("pipe composition: rgbToHex + hsvToHex + htmlNamedToHex", () => {
  it("normalises rgb, hsv, named, and passes through hex", () => {
    // Simple manual pipe simulation (the actual pipe is in transformfn.compose)
    const pipe = (v: string) => htmlNamedToHex()(hsvToHex()(rgbToHex()(v)));
    expect(pipe("rgb(255, 0, 0)")).toBe("#ff0000");
    expect(pipe("hsv(0, 100%, 100%)")).toBe("#ff0000");
    expect(pipe("red")).toBe("#ff0000");
    expect(pipe("#ff0000")).toBe("#ff0000");
    expect(pipe("banana")).toBe("banana"); // unknown — passes through all three
  });
});
