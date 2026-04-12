import { describe, expect, it } from "vitest";
import {
  camelCase,
  capitalize,
  kebabCase,
  lowercase,
  snakeCase,
  titleCase,
  trim,
  uppercase,
} from "./transformfn.trimCase";

describe("trim()", () => {
  it("removes leading and trailing whitespace", () => {
    expect(trim()("  hello  ")).toBe("hello");
    expect(trim()("\t\nhello\r\n")).toBe("hello");
  });
  it("leaves already-trimmed strings untouched", () =>
    expect(trim()("hello")).toBe("hello"));
  it("returns empty string for whitespace-only", () =>
    expect(trim()("   ")).toBe(""));
});

describe("lowercase()", () => {
  it("lowercases all characters", () =>
    expect(lowercase()("HELLO World")).toBe("hello world"));
});

describe("uppercase()", () => {
  it("uppercases all characters", () =>
    expect(uppercase()("hello World")).toBe("HELLO WORLD"));
});

describe("capitalize()", () => {
  it("capitalises first char and lowercases the rest", () => {
    expect(capitalize()("hELLO")).toBe("Hello");
    expect(capitalize()("hello world")).toBe("Hello world");
  });
  it("handles empty string", () => expect(capitalize()("")).toBe(""));
});

describe("titleCase()", () => {
  it("capitalises each word", () => {
    expect(titleCase()("hello world")).toBe("Hello World");
    expect(titleCase()("the quick brown fox")).toBe("The Quick Brown Fox");
  });
});

describe("camelCase()", () => {
  it("converts to camelCase", () => {
    expect(camelCase()("hello world")).toBe("helloWorld");
    expect(camelCase()("the-quick brown_fox")).toBe("theQuickBrownFox");
  });
  it("handles single word", () => expect(camelCase()("hello")).toBe("hello"));
  it("handles empty string", () => expect(camelCase()("")).toBe(""));
});

describe("kebabCase()", () => {
  it("converts to kebab-case", () => {
    expect(kebabCase()("Hello World")).toBe("hello-world");
    expect(kebabCase()("the_quick brown-fox")).toBe("the-quick-brown-fox");
  });
});

describe("snakeCase()", () => {
  it("converts to snake_case", () => {
    expect(snakeCase()("Hello World")).toBe("hello_world");
    expect(snakeCase()("the-quick brown fox")).toBe("the_quick_brown_fox");
  });
});
