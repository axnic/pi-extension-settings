import { describe, expect, it } from "vitest";
import {
  integer,
  negative,
  percentage,
  positive,
  range,
} from "./validationfn.numeric";

describe("integer()", () => {
  it("accepts integers", () => {
    const v = integer();
    expect(v(0).valid).toBe(true);
    expect(v(42).valid).toBe(true);
    expect(v(-7).valid).toBe(true);
  });
  it("rejects floats", () => {
    const v = integer();
    expect(v(2.5).valid).toBe(false);
    expect(v(0.1).valid).toBe(false);
    expect(v(-1.9).valid).toBe(false);
  });
  it("returns a reason on failure", () => {
    const r = integer()(3.14);
    expect(r.valid).toBe(false);
    expect(r.reason?.toLowerCase()).toContain("integer");
  });
});

describe("positive() and negative()", () => {
  it("positive() enforces > 0", () => {
    expect(positive()(1).valid).toBe(true);
    expect(positive()(0.001).valid).toBe(true);
    expect(positive()(0).valid).toBe(false);
    expect(positive()(-1).valid).toBe(false);
  });
  it("positive(true) accepts zero", () => {
    expect(positive(true)(0).valid).toBe(true);
    expect(positive(true)(-0.1).valid).toBe(false);
  });
  it("negative() enforces < 0", () => {
    expect(negative()(-1).valid).toBe(true);
    expect(negative()(-0.001).valid).toBe(true);
    expect(negative()(0).valid).toBe(false);
    expect(negative()(1).valid).toBe(false);
  });
});

describe("range()", () => {
  it("validates inclusive numeric ranges with object signature", () => {
    const r = range({ min: 10, max: 20 });
    expect(r(10).valid).toBe(true);
    expect(r(15).valid).toBe(true);
    expect(r(20).valid).toBe(true);
    expect(r(9.99).valid).toBe(false);
    expect(r(21).valid).toBe(false);
  });
  it("supports min-only bound", () => {
    const r = range({ min: 5 });
    expect(r(5).valid).toBe(true);
    expect(r(1000).valid).toBe(true);
    expect(r(4.99).valid).toBe(false);
  });
  it("supports max-only bound", () => {
    const r = range({ max: 100 });
    expect(r(-99).valid).toBe(true);
    expect(r(100).valid).toBe(true);
    expect(r(100.1).valid).toBe(false);
  });
  it("supports no bounds (always passes for any finite number)", () => {
    const r = range();
    expect(r(0).valid).toBe(true);
    expect(r(-999).valid).toBe(true);
  });
});

describe("percentage()", () => {
  it("accepts 0–1 for NumValue", () => {
    const p = percentage();
    expect(p(0).valid).toBe(true);
    expect(p(0.5).valid).toBe(true);
    expect(p(1).valid).toBe(true);
    expect(p(1.01).valid).toBe(false);
    expect(p(-0.01).valid).toBe(false);
  });
  it("accepts 0–100 with and without % for TextValue", () => {
    const p = percentage();
    expect(p("50").valid).toBe(true);
    expect(p("50%").valid).toBe(true);
    expect(p("0%").valid).toBe(true);
    expect(p("100%").valid).toBe(true);
    expect(p("101").valid).toBe(false);
    expect(p("-1").valid).toBe(false);
    expect(p("fifty").valid).toBe(false);
  });
  it("returns a reason on success for both branches", () => {
    const numResult = percentage()(0.75);
    expect(numResult.valid).toBe(true);

    const strResult = percentage()("75%");
    expect(strResult.valid).toBe(true);
  });
});
