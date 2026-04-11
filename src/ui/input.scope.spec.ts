import { describe, expect, it } from "vitest";
import { handleInput } from "./input.js";
import type { ExtensionHeaderRow, GroupRow, ViewRow } from "./model.js";
import {
  createInitialState,
  extCollapseKey,
  groupCollapseKey,
  isExtCollapsed,
  isGroupCollapsed,
} from "./state.js";

function extRow(extensionName: string): ExtensionHeaderRow {
  return {
    id: `ext:${extensionName}`,
    type: "extension-header",
    extensionName,
    isCollapsed: true,
    settingsCount: 1,
    depth: 0,
    prefix: " ",
    focusable: true,
  };
}

function groupRow(extensionName: string, groupKey: string): GroupRow {
  return {
    id: `group:${extensionName}:${groupKey}`,
    type: "group",
    extensionName,
    groupKey,
    label: groupKey,
    isCollapsed: true,
    settingsCount: 1,
    depth: 1,
    prefix: " └ ",
    focusable: true,
  };
}

describe("input scope collapse behavior", () => {
  it("starts collapsed, auto-expands on enter scope, and restores on esc", () => {
    let state = createInitialState();
    state = { ...state, searchActive: false };
    const row = extRow("pi-one");
    const rows: ViewRow[] = [row];

    expect(isExtCollapsed(state, "pi-one")).toBe(false);

    const entered = handleInput(
      "\r",
      state,
      rows,
      () => {},
      () => {}
    );
    state = entered.state;
    expect(state.scope).toEqual(["pi-one"]);
    expect(state.collapsed.get(extCollapseKey("pi-one"))).toBe(false);
    state = handleInput(
      "\x1b",
      state,
      rows,
      () => {},
      () => {}
    ).state;
    expect(state.scope).toEqual([]);
    expect(isExtCollapsed(state, "pi-one")).toBe(false);
    expect(state.collapsed.has(extCollapseKey("pi-one"))).toBe(false);
  });

  it("restores nested section collapse in reverse order on esc", () => {
    const extension = "pi-one";
    const section1 = "section1";
    const section2 = "section1.section2";

    let state = createInitialState();
    state = { ...state, searchActive: false };
    state = handleInput(
      "\r",
      state,
      [extRow(extension)],
      () => {},
      () => {}
    ).state;
    state = {
      ...state,
      focusedIndex: 0,
    };

    state = handleInput(
      "\r",
      state,
      [groupRow(extension, section1)],
      () => {},
      () => {}
    ).state;
    expect(state.scope).toEqual([extension, section1]);
    expect(state.collapsed.get(groupCollapseKey(extension, section1))).toBe(false);

    state = handleInput(
      "\r",
      state,
      [groupRow(extension, section2)],
      () => {},
      () => {}
    ).state;
    expect(state.scope).toEqual([extension, section2]);
    expect(state.collapsed.get(groupCollapseKey(extension, section2))).toBe(false);

    state = handleInput(
      "\x1b",
      state,
      [groupRow(extension, section2)],
      () => {},
      () => {}
    ).state;
    expect(state.scope).toEqual([extension, section1]);
    expect(isGroupCollapsed(state, extension, section2)).toBe(false);

    state = handleInput(
      "\x1b",
      state,
      [groupRow(extension, section1)],
      () => {},
      () => {}
    ).state;
    expect(state.scope).toEqual([extension]);
    expect(isGroupCollapsed(state, extension, section1)).toBe(false);

    state = handleInput(
      "\x1b",
      state,
      [extRow(extension)],
      () => {},
      () => {}
    ).state;
    expect(state.scope).toEqual([]);
    expect(isExtCollapsed(state, extension)).toBe(false);
  });

  it("up/down do nothing in search mode, and / re-enters search mode", () => {
    const rows: ViewRow[] = [extRow("pi-one"), extRow("pi-two")];
    let state = createInitialState();
    state = { ...state, focusedIndex: 1 };

    // search mode active by default: up/down should not move focus
    state = handleInput(
      "\x1b[A",
      state,
      rows,
      () => {},
      () => {}
    ).state;
    expect(state.focusedIndex).toBe(1);
    state = handleInput(
      "\x1b[B",
      state,
      rows,
      () => {},
      () => {}
    ).state;
    expect(state.focusedIndex).toBe(1);

    // Enter does nothing in search mode
    state = handleInput(
      "\r",
      state,
      rows,
      () => {},
      () => {}
    ).state;
    expect(state.scope).toEqual([]);

    // leave search mode
    state = handleInput(
      "\x1b",
      state,
      rows,
      () => {},
      () => {}
    ).state;
    expect(state.searchActive).toBe(false);

    // in navigation mode up/down move focus
    state = handleInput(
      "\x1b[A",
      state,
      rows,
      () => {},
      () => {}
    ).state;
    expect(state.focusedIndex).toBe(0);

    // / returns to search mode
    state = handleInput(
      "/",
      state,
      rows,
      () => {},
      () => {}
    ).state;
    expect(state.searchActive).toBe(true);
  });
});
