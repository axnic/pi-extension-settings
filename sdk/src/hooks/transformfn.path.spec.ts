import { describe, expect, it, vi } from "vitest";
import { expandPath } from "./transformfn.path";

const fakeHome = "/home/testuser";

// vi.spyOn cannot redefine named exports on ESM modules — use vi.mock instead
// so that the homedir() call inside expandPath() always returns fakeHome.
vi.mock("node:os", () => ({ homedir: () => fakeHome }));

describe("transformfn.expandPath()", () => {
  it('returns the home directory when value is "~"', () => {
    const t = expandPath();
    expect(t("~")).toBe(fakeHome);
  });

  it('expands leading "~/" to the home directory (preserving the slash)', () => {
    const t = expandPath();
    expect(t("~/projects")).toBe(`${fakeHome}/projects`);
    expect(t("~/")).toBe(`${fakeHome}/`);
  });

  it("returns the input unchanged for strings that do not begin with ~ or ~/", () => {
    const t = expandPath();
    expect(t("/tmp/somewhere")).toBe("/tmp/somewhere");
    expect(t("relative/path")).toBe("relative/path");
  });

  it("does not expand ~username or other similar tokens (only ~ or ~/ are expanded)", () => {
    const t = expandPath();
    expect(t("~bob")).toBe("~bob");
    expect(t("~not/slash")).toBe("~not/slash");
  });

  it("does not trim input before expanding (caller must trim if desired)", () => {
    const t = expandPath();
    expect(t("  ~/projects  ")).toBe("  ~/projects  ");
    // exact "~" with surrounding whitespace must not be expanded
    expect(t(" ~ ")).toBe(" ~ ");
  });
});
