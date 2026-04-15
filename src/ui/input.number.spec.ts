/**
 * input.number.spec.ts — Unit tests for number-node keyboard behaviour.
 *
 * Covers the two fixes in this PR:
 *   1. Enter on a focused number setting opens inline edit mode.
 *   2. Confirming a non-numeric or non-finite value keeps the edit mode
 *      active and surfaces a validation error (trimmed empty string,
 *      "abc", "NaN", "Infinity", whitespace-only).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock storage ─────────────────────────────────────────────────────────────

vi.mock("../../sdk/src/core/storage.ts", () => ({
  getExtensionSetting: vi.fn(
    (_ext: string, _key: string, fallback?: unknown) => fallback,
  ),
  setExtensionSetting: vi.fn(),
}));

import type { Number as NumberNode } from "../../sdk/src/core/nodes.ts";
import { handleInput } from "./input.js";
import type { SettingRow, ViewRow } from "./model.js";
import { createInitialState } from "./state.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const noop = () => {};

function numberNode(overrides: Partial<NumberNode> = {}): NumberNode {
  return {
    _tag: "number",
    tooltip: "A number",
    default: 0,
    ...overrides,
  } as unknown as NumberNode;
}

function numberRow(rawValue = "42"): SettingRow {
  return {
    id: "setting:test-ext:count",
    type: "setting",
    extensionName: "test-ext",
    settingKey: "count",
    label: "Count",
    node: numberNode(),
    rawValue,
    displayValue: rawValue,
    isModified: false,
    isExpanded: false,
    depth: 1,
    prefix: " └ ",
    focusable: true,
  };
}

function makeState(focusedIndex = 0) {
  const state = createInitialState(false);
  return { ...state, searchActive: false, focusedIndex };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("number setting — Enter opens edit mode", () => {
  let rows: ViewRow[];

  beforeEach(() => {
    rows = [numberRow()];
  });

  it("pressing Enter on a focused number setting enters edit mode", () => {
    const state = makeState(0);
    const result = handleInput("\r", state, rows, noop, noop);

    expect(result.state.editState).not.toBeNull();
    expect(result.state.editState?.node._tag).toBe("number");
    expect(result.state.editState?.settingKey).toBe("count");
    expect(result.dirty).toBe(true);
  });

  it("edit mode starts with the current raw value pre-filled", () => {
    const rows2 = [numberRow("7")];
    const state = makeState(0);
    const result = handleInput("\r", state, rows2, noop, noop);

    expect(result.state.editState?.rawValue).toBe("7");
  });
});

describe("number setting — invalid input is rejected on confirm", () => {
  function enterEditMode(rawValue = "42") {
    const rows: ViewRow[] = [numberRow(rawValue)];
    const state = makeState(0);
    // Enter → edit mode
    const afterEnter = handleInput("\r", state, rows, noop, noop);
    expect(afterEnter.state.editState).not.toBeNull();
    return { editState: afterEnter.state, rows };
  }

  function typeAndConfirm(
    editState: ReturnType<typeof makeState>,
    rows: ViewRow[],
    text: string,
  ) {
    // Replace raw value by clearing and re-typing via state manipulation
    const withValue = {
      ...editState,
      editState: editState.editState
        ? { ...editState.editState, rawValue: text, cursor: text.length }
        : null,
    };
    return handleInput("\r", withValue, rows, noop, noop);
  }

  it.each([
    ["abc", "alphabetic input"],
    ["NaN", "explicit 'NaN' string"],
    ["Infinity", "explicit 'Infinity' string"],
    ["-Infinity", "negative Infinity"],
    ["", "empty string"],
    ["   ", "whitespace-only string"],
    ["1e999", "number overflow to Infinity"],
  ])("rejects %s (%s) — keeps edit mode with validation error", (badValue) => {
    const { editState, rows } = enterEditMode();
    const result = typeAndConfirm(editState, rows, badValue);

    // Edit mode must stay open
    expect(result.state.editState).not.toBeNull();
    // Validation error must be set
    expect(result.state.validation).not.toBeNull();
    expect(result.state.validation?.valid).toBe(false);
    expect(result.state.validation?.reason).toMatch(/finite number/i);
  });

  it("accepts a valid integer string and exits edit mode", () => {
    const { editState, rows } = enterEditMode();
    const result = typeAndConfirm(editState, rows, "123");

    expect(result.state.editState).toBeNull();
    expect(result.state.validation?.valid).not.toBe(false);
  });

  it("accepts a valid decimal string and exits edit mode", () => {
    const { editState, rows } = enterEditMode();
    const result = typeAndConfirm(editState, rows, "3.14");

    expect(result.state.editState).toBeNull();
  });

  it("accepts a negative number string and exits edit mode", () => {
    const { editState, rows } = enterEditMode();
    const result = typeAndConfirm(editState, rows, "-5");

    expect(result.state.editState).toBeNull();
  });
});
