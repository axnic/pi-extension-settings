import { describe, expect, it } from "vitest";
import { compose, pipe } from "./transformfn.compose";
import { lowercase, trim, uppercase } from "./transformfn.trimCase";

describe("transformfn.compose — pipe()", () => {
  it("returns identity when called with no transforms", () => {
    const p = pipe();
    expect(p("  hello  ")).toBe("  hello  ");
    expect(p("")).toBe("");
  });

  it("applies transforms left-to-right", () => {
    const p = pipe(trim(), lowercase());
    expect(p("  HELLO World  ")).toBe("hello world");
  });

  it("chains arbitrary transforms (custom simple funcs)", () => {
    const t1 = (v: string) => `${v}A`;
    const t2 = (v: string) => `${v}B`;
    const t3 = (v: string) => `${v}C`;
    const p = pipe(t1, t2, t3);
    expect(p("x")).toBe("xABC");
  });
});

describe("transformfn.compose — compose()", () => {
  it("returns identity when called with no transforms", () => {
    const c = compose();
    expect(c("  hello  ")).toBe("  hello  ");
    expect(c("")).toBe("");
  });

  it("applies transforms right-to-left", () => {
    // compose(a, b) === a(b(value))
    const c = compose(uppercase(), trim());
    // trim first, then uppercase
    expect(c("  hello world  ")).toBe("HELLO WORLD");
  });

  it("compose and pipe are symmetric when transforms are reversed", () => {
    const a = (v: string) => `${v}1`;
    const b = (v: string) => `${v}2`;
    const c = (v: string) => `${v}3`;

    const p = pipe(a, b, c);
    const comp = compose(c, b, a);

    expect(p("x")).toBe("x123");
    expect(comp("x")).toBe("x123");
  });

  it("works correctly with single transform", () => {
    const p = pipe(lowercase());
    const c = compose(lowercase());
    expect(p("HeLLo")).toBe("hello");
    expect(c("HeLLo")).toBe("hello");
  });
});
