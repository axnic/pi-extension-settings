import { describe, expect, it } from "vitest";
import { all, any } from "./validationfn.composition";

describe("validationfn.composition — all()", () => {
  it("returns valid when all validators pass", () => {
    const v1 = () => ({ valid: true });
    const v2 = () => ({ valid: true });
    const composed = all(v1, v2);
    expect(composed("anything")).toEqual({ valid: true });
  });

  it("returns first failure and short-circuits remaining validators", () => {
    let called1 = 0;
    let called2 = 0;
    let called3 = 0;

    const v1 = () => {
      called1++;
      return { valid: true };
    };
    const v2 = () => {
      called2++;
      return { valid: false, reason: "first-fail" };
    };
    const v3 = () => {
      called3++;
      return { valid: false, reason: "second-fail" };
    };

    const composed = all(v1, v2, v3);
    const result = composed("value");

    expect(result).toEqual({ valid: false, reason: "first-fail" });
    expect(called1).toBe(1);
    expect(called2).toBe(1);
    // v3 should not be called because v2 failed and all() short-circuits
    expect(called3).toBe(0);
  });

  it("with no validators returns valid", () => {
    const composed = all();
    expect(composed("x")).toEqual({ valid: true });
  });
});

describe("validationfn.composition — any()", () => {
  it("returns the passing validator result when any passes and short-circuits after success", () => {
    let called1 = 0;
    let called2 = 0;
    let called3 = 0;

    const v1 = () => {
      called1++;
      return { valid: false, reason: "a" };
    };
    const v2 = () => {
      called2++;
      return { valid: true };
    };
    const v3 = () => {
      called3++;
      return { valid: true };
    };

    const composed = any(v1, v2, v3);
    const result = composed("whatever");

    // should return the successful result from v2
    expect(result).toEqual({ valid: true });
    expect(called1).toBe(1);
    expect(called2).toBe(1);
    // v3 should not be invoked because v2 succeeded
    expect(called3).toBe(0);
  });

  it("returns combined reasons when all validators fail", () => {
    const v1 = () => ({ valid: false, reason: "one" }) as const;
    const v2 = () => ({ valid: false, reason: "two" }) as const;
    const v3 = () => ({ valid: false, reason: "three" }) as const;

    const composed = any(v1, v2, v3);
    const result = composed("x");

    expect(result).toEqual({ valid: false, reason: ["one", "two", "three"] });
  });

  it("with no validators returns invalid with empty reason array", () => {
    const composed = any();
    expect(composed("x")).toEqual({ valid: false, reason: [] });
  });
});
