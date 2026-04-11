import { vol } from "memfs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { filePath } from "./validationfn.filePath";

// Replace node:fs with the memfs in-memory filesystem so that
// existsSync inside validationfn.filePath.ts resolves against the
// virtual volume instead of the real disk.
vi.mock("node:fs", async () => {
  const { fs } = await import("memfs");
  return { default: fs, ...fs };
});

describe("validationfn.filePath", () => {
  beforeEach(() => {
    // Start each test with a clean, empty virtual filesystem.
    vol.reset();
  });

  describe("syntax-only (exists = false)", () => {
    it("rejects empty string and whitespace-only", () => {
      const v = filePath();
      expect(v("")).toEqual({ valid: false, reason: "path cannot be empty" });
      expect(v("   ")).toEqual({
        valid: false,
        reason: "path cannot be empty",
      });
      expect(v("\n\t")).toEqual({
        valid: false,
        reason: "path cannot be empty",
      });
    });

    it("accepts any non-empty value and returns 'valid path'", () => {
      const v = filePath();
      expect(v("/some/path")).toEqual({ valid: true, reason: "valid path" });
      // trimming should be applied before validation
      expect(v("  /some/path  ")).toEqual({
        valid: true,
        reason: "valid path",
      });
    });
  });

  describe("existence check (exists = true) with memfs virtual filesystem", () => {
    it("returns valid when the path exists in the virtual filesystem", () => {
      // Create /exists in the virtual volume so existsSync returns true.
      vol.mkdirSync("/exists", { recursive: true });

      const v = filePath(true);
      expect(v("/exists")).toEqual({ valid: true, reason: "path exists" });
      // trimming is applied before the existence check
      expect(v("  /exists  ")).toEqual({ valid: true, reason: "path exists" });
    });

    it("returns invalid when the path does not exist in the virtual filesystem", () => {
      // vol is empty after reset — /nope is not present.
      const v = filePath(true);
      expect(v("/nope")).toEqual({
        valid: false,
        reason: "path does not exist",
      });
    });

    it("still rejects empty values before checking the filesystem", () => {
      // Populate the virtual volume to prove that existsSync would return true
      // for some paths, yet empty input must be caught before the fs check.
      vol.mkdirSync("/some/path", { recursive: true });

      const v = filePath(true);
      expect(v("   ")).toEqual({
        valid: false,
        reason: "path cannot be empty",
      });
    });
  });
});
