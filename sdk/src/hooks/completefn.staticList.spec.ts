import { describe, expect, it } from "vitest";
import { staticList } from "./completefn.staticList";

describe("staticList()", () => {
  const completer = staticList(["dark", "light", "system"]);

  it("returns all values for empty partial", async () => {
    const r = await completer("");
    expect(r).toEqual(["dark", "light", "system"]);
  });

  it("filters by prefix (case-insensitive)", async () => {
    expect(await completer("d")).toEqual(["dark"]);
    expect(await completer("D")).toEqual(["dark"]);
    expect(await completer("li")).toEqual(["light"]);
    expect(await completer("LI")).toEqual(["light"]);
    expect(await completer("s")).toEqual(["system"]);
  });

  it("returns empty array when no match", async () => {
    expect(await completer("z")).toEqual([]);
  });

  it("returns the exact value on full match", async () => {
    expect(await completer("dark")).toEqual(["dark"]);
  });

  it("returns multiple matches with shared prefix", async () => {
    const c2 = staticList(["alpha", "alphabet", "beta"]);
    expect(await c2("alpha")).toEqual(["alpha", "alphabet"]);
  });

  it("preserves original ordering", async () => {
    const c3 = staticList(["zebra", "ant", "cat"]);
    expect(await c3("")).toEqual(["zebra", "ant", "cat"]);
  });
});
