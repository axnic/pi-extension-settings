import { describe, expect, it, vi } from "vitest";

const MOCK_HOME = "/home/mockuser";

// Mock `homedir()` before importing the module so the module-level `home`
// constant captured inside displayfn.path.ts picks up the mocked value.
vi.mock("node:os", () => ({ homedir: () => MOCK_HOME }));

// `path` is a factory — call it once to obtain the actual DisplayFn.
import { path } from "./displayfn.path";

describe("displayfn.path — path()", () => {
  const display = path();

  it("collapses the home directory prefix to `~` for nested paths", () => {
    const value = `${MOCK_HOME}/projects/my-app`;
    expect(display(value, {} as any)).toBe("~/projects/my-app");
  });

  it("collapses exact homedir to `~`", () => {
    expect(display(MOCK_HOME, {} as any)).toBe("~");
  });

  it("leaves unrelated paths unchanged", () => {
    const value = "/tmp/somewhere";
    expect(display(value, {} as any)).toBe(value);
  });
});
