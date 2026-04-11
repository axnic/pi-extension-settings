import { describe, expect, it } from "vitest";
import { dictEntry } from "./displayfn.dict";

// Minimal mock theme
const theme = {
  fg: (_name: string, text: string) => `[dim]${text}[/dim]`,
};

describe("dictEntry()", () => {
  const d = dictEntry();

  it("renders key in bold", () => {
    const result = d({ key: "PATH", value: "/usr/local/bin" }, theme as any);
    expect(result).toContain("\x1b[1mPATH\x1b[22m");
  });

  it("renders arrow as dim via theme", () => {
    const result = d({ key: "HOME", value: "/Users/alice" }, theme as any);
    expect(result).toContain("[dim]→[/dim]");
  });

  it("renders value in plain text (no escape sequences on value)", () => {
    const result = d({ key: "KEY", value: "some value" }, theme as any);
    // The value "some value" should appear as-is after the arrow
    expect(result).toContain("some value");
  });

  it("formats as: bold-key space arrow space value", () => {
    const result = d({ key: "X", value: "Y" }, theme as any);
    // Full format: BOLD_ON + "X" + BOLD_OFF + " " + dim("→") + " " + "Y"
    expect(result).toBe("\x1b[1mX\x1b[22m [dim]→[/dim] Y");
  });

  it("handles empty key and value", () => {
    const result = d({ key: "", value: "" }, theme as any);
    expect(result).toContain("[dim]→[/dim]");
  });

  it("handles special characters in key and value", () => {
    const result = d({ key: "API_KEY", value: "sk-abc123!@#" }, theme as any);
    expect(result).toContain("API_KEY");
    expect(result).toContain("sk-abc123!@#");
  });
});
