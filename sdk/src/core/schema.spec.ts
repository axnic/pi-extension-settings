/**
 * schema.spec.ts — Unit tests for S.settings() schema validation.
 *
 * Covers the two schema-time constraints:
 *   1. `description` must be ≤ 128 characters → DescriptionTooLongError
 *   2. `documentation`, when provided, must be ≥ 64 characters → DocumentationTooShortError
 */

import { describe, expect, it } from "vitest";
import { DescriptionTooLongError, DocumentationTooShortError } from "./errors";
import { S } from "./schema";

// ─── DescriptionTooLongError ──────────────────────────────────────────────────

describe("S.settings() — DescriptionTooLongError", () => {
  const MAX = DescriptionTooLongError.MAX_LENGTH; // 128

  it("accepts a description at exactly the limit", () => {
    expect(() =>
      S.settings({
        key: S.text({ description: "x".repeat(MAX), default: "" }),
      }),
    ).not.toThrow();
  });

  it("throws when description exceeds the limit", () => {
    expect(() =>
      S.settings({
        key: S.text({ description: "x".repeat(MAX + 1), default: "" }),
      }),
    ).toThrow(DescriptionTooLongError);
  });

  it("exposes the nodeKey and actual length", () => {
    expect.assertions(2);
    try {
      S.settings({
        mykey: S.text({ description: "y".repeat(200), default: "" }),
      });
    } catch (err) {
      expect(err instanceof DescriptionTooLongError && err.nodeKey).toBe(
        "mykey",
      );
      expect(err instanceof DescriptionTooLongError && err.actual).toBe(200);
    }
  });

  it("also checks description inside nested sections", () => {
    expect(() =>
      S.settings({
        section: S.section({
          description: "Section",
          children: {
            child: S.text({ description: "x".repeat(MAX + 1), default: "" }),
          },
        }),
      }),
    ).toThrow(DescriptionTooLongError);
  });
});

// ─── DocumentationTooShortError ───────────────────────────────────────────────

describe("S.settings() — DocumentationTooShortError", () => {
  const MIN = DocumentationTooShortError.MIN_LENGTH; // 64
  const VALID_DOC = "x".repeat(MIN);

  it("accepts documentation at exactly the minimum length", () => {
    expect(() =>
      S.settings({
        key: S.text({
          description: "label",
          documentation: VALID_DOC,
          default: "",
        }),
      }),
    ).not.toThrow();
  });

  it("accepts nodes with no documentation at all", () => {
    expect(() =>
      S.settings({ key: S.text({ description: "label", default: "" }) }),
    ).not.toThrow();
  });

  it("throws when documentation is shorter than the minimum", () => {
    expect(() =>
      S.settings({
        key: S.text({
          description: "label",
          documentation: "x".repeat(MIN - 1),
          default: "",
        }),
      }),
    ).toThrow(DocumentationTooShortError);
  });

  it("exposes the nodeKey and actual length", () => {
    expect.assertions(2);
    try {
      S.settings({
        mykey: S.text({
          description: "label",
          documentation: "short",
          default: "",
        }),
      });
    } catch (err) {
      expect(err instanceof DocumentationTooShortError && err.nodeKey).toBe(
        "mykey",
      );
      expect(err instanceof DocumentationTooShortError && err.actual).toBe(5);
    }
  });

  it("also checks documentation inside nested sections", () => {
    expect(() =>
      S.settings({
        section: S.section({
          description: "Section",
          children: {
            child: S.text({
              description: "label",
              documentation: "too short",
              default: "",
            }),
          },
        }),
      }),
    ).toThrow(DocumentationTooShortError);
  });

  it("also checks documentation on section nodes themselves", () => {
    expect(() =>
      S.settings({
        section: S.section({
          description: "Section",
          documentation: "too short",
          children: {},
        }),
      }),
    ).toThrow(DocumentationTooShortError);
  });

  it("reports the full dotted key path for nested nodes", () => {
    expect.assertions(1);
    try {
      S.settings({
        parent: S.section({
          description: "Parent",
          children: {
            child: S.text({
              description: "label",
              documentation: "short",
              default: "",
            }),
          },
        }),
      });
    } catch (err) {
      expect(err instanceof DocumentationTooShortError && err.nodeKey).toBe(
        "parent.child",
      );
    }
  });
});
