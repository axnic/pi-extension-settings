import { vol } from "memfs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { filePath } from "./completefn.filePath";

// Replace node:fs with the memfs in-memory filesystem so that
// readdirSync / statSync inside completefn.filePath.ts operate on the
// virtual volume instead of the real disk.
vi.mock("node:fs", async () => {
  const { fs } = await import("memfs");
  return { default: fs, ...fs };
});

// Fix homedir to a deterministic value so the ~ tests are portable.
const HOME = "/home/testuser";
vi.mock("node:os", () => ({ homedir: () => HOME }));

describe("filePath()", () => {
  beforeEach(() => {
    // Start each test with a clean, empty virtual filesystem.
    vol.reset();
  });

  it("lists directory contents when partial ends with / (directories suffixed with /)", async () => {
    vol.fromJSON({
      "/test/a.txt": "a",
      "/test/b.txt": "b",
    });
    vol.mkdirSync("/test/subdir");

    const completer = filePath();
    const res = await completer("/test/");

    expect(res.sort()).toEqual(
      ["/test/a.txt", "/test/b.txt", "/test/subdir/"].sort(),
    );
  });

  it("filters by prefix when partial does not end with /", async () => {
    vol.fromJSON({
      "/test/file1.txt": "1",
      "/test/file2.txt": "2",
      "/test/other.txt": "x",
    });
    vol.mkdirSync("/test/file_dir");

    const completer = filePath();
    const res = await completer("/test/fi");

    expect(res.sort()).toEqual(
      ["/test/file1.txt", "/test/file2.txt", "/test/file_dir/"].sort(),
    );
  });

  it("re-substitutes ~ when partial starts with ~", async () => {
    vol.fromJSON({
      [`${HOME}/subdir/hello.txt`]: "hi",
    });

    const completer = filePath();
    const res = await completer("~/subdir/");

    expect(res).toEqual(["~/subdir/hello.txt"]);
  });

  it("returns empty array for nonexistent paths", async () => {
    // vol is empty after reset — any lookup must return []
    const completer = filePath();
    const res = await completer("/this/path/should/not/exist/____");

    expect(res).toEqual([]);
  });
});
