import { describe, expect, it } from "vitest";
import { color } from "./displayfn.color";

// Minimal mock theme
const theme = {
  fg: (_name: string, text: string) => `[dim]${text}[/dim]`,
};

describe("displayfn.color — color()", () => {
  const d = color();

  it("renders hex color with ANSI truecolor swatch", () => {
    const result = d("#ff0000", theme as any);
    // Should contain ANSI sequence \x1b[38;2;255;0;0m and the value
    expect(result).toContain("\x1b[38;2;255;0;0m");
    expect(result).toContain("■");
    expect(result).toContain("#ff0000");
  });

  it("renders short hex (#rgb) with ANSI truecolor swatch", () => {
    const result = d("#f00", theme as any);
    expect(result).toContain("\x1b[38;2;255;0;0m");
    expect(result).toContain("#f00");
  });

  it("renders rgb() with ANSI truecolor swatch", () => {
    const result = d("rgb(255, 0, 0)", theme as any);
    expect(result).toContain("\x1b[38;2;255;0;0m");
    expect(result).toContain("rgb(255, 0, 0)");
  });

  it("renders hsv() with ANSI truecolor swatch", () => {
    const result = d("hsv(0, 100%, 100%)", theme as any);
    expect(result).toContain("\x1b[38;2;255;0;0m");
    expect(result).toContain("hsv(0, 100%, 100%)");
  });

  it("renders named color with ANSI truecolor swatch", () => {
    const result = d("red", theme as any);
    expect(result).toContain("\x1b[38;2;255;0;0m");
    expect(result).toContain("red");
  });

  it("renders unrecognised value with dim swatch (no ANSI color)", () => {
    const result = d("not-a-color", theme as any);
    expect(result).toContain("[dim]■[/dim]");
    expect(result).toContain("not-a-color");
    expect(result).not.toContain("\x1b[38;2;");
  });

  it("preserves original value text (not the converted hex)", () => {
    // The display shows the original value, not the converted hex
    const result = d("coral", theme as any);
    expect(result).toContain("coral");
    expect(result).not.toContain("#ff7f50"); // hex should not appear in output
  });
});
