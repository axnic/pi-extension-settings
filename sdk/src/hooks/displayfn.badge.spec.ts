import { describe, expect, it, vi } from "vitest";
import { badge } from "./displayfn.badge";

describe("displayfn.badge — badge()", () => {
  it("renders rrggbb hex with ANSI truecolor badge and brackets", () => {
    const d = badge("#ff930f");
    const theme = { fg: (_: string, t: string) => t };
    const out = d("active", theme as any);

    // Should contain ANSI truecolor sequence for #ff930f -> 255,147,15
    expect(out).toContain("\x1b[38;2;255;147;15m");
    // Should wrap the value in brackets
    expect(out).toContain("[active]");
    // Should reset colour after text
    expect(out).toContain("\x1b[39m");
  });

  it("renders short #rgb hex by expanding it to rrggbb", () => {
    const d = badge("#f00");
    const theme = { fg: (_: string, t: string) => t };
    const out = d("error", theme as any);

    // #f00 -> #ff0000 -> 255,0,0
    expect(out).toContain("\x1b[38;2;255;0;0m");
    expect(out).toContain("[error]");
  });

  it("accepts mixed/uppercase hex and still renders correct ANSI color", () => {
    const d = badge("#F0a");
    const theme = { fg: (_: string, t: string) => t };
    const out = d("val", theme as any);

    // #F0a -> expanded to #FF00AA -> 255,0,170
    expect(out).toContain("\x1b[38;2;255;0;170m");
    expect(out).toContain("[val]");
  });

  it("falls back to theme.fg('dim', ...) when provided color is invalid", () => {
    const theme = {
      fg: vi.fn((name: string, text: string) => `[${name}]${text}[/]`),
    };
    const d = badge("not-a-hex");
    const out = d("value", theme as any);

    // theme.fg should have been used with 'dim' and bracketed value
    expect(theme.fg).toHaveBeenCalledWith("dim", "[value]");
    expect(out).toBe(`[dim][value][/]`);
  });

  it("returns a function that consistently wraps the original value (no hex conversion in output)", () => {
    const d = badge("#ff930f");
    const theme = { fg: (_: string, t: string) => t };
    const out = d("#ff930f", theme as any);

    // The displayed text should be the stored value wrapped in brackets, not the hex converted elsewhere.
    expect(out).toContain("[#ff930f]");
  });
});
