/**
 * renderer.spec.ts — Integration smoke tests for renderPanel.
 *
 * These tests verify that the layout composer correctly wires the four blocks
 * and produces a well-formed output (separator, input bar, rows, info, hint bar).
 * Block-level behaviour (tooltip wrapping, hint truncation, etc.) is tested in
 * the individual block spec files under src/ui/blocks/.
 */

import { describe, expect, it, vi } from "vitest";

// ─── Mock storage ─────────────────────────────────────────────────────────────

vi.mock("../../sdk/src/core/storage.ts", () => {
  const store = new Map<string, Map<string, unknown>>();
  return {
    getExtensionSetting: vi.fn(
      (extension: string, key: string, fallback?: unknown) => {
        return store.get(extension)?.get(key) ?? fallback;
      },
    ),
    setExtensionSetting: vi.fn(),
    __reset: () => store.clear(),
  };
});

import type { Theme } from "@mariozechner/pi-coding-agent";
import { visibleWidth } from "@mariozechner/pi-tui";
import type { SettingNode } from "../../sdk/src/core/nodes.ts";
import { S } from "../../sdk/src/core/schema.ts";
import { createRegistry } from "../core/registry.ts";
import type { ControlBindings } from "../settings.ts";
import { buildRows } from "./model.ts";
import { renderPanel } from "./renderer.ts";
import { createInitialState } from "./state.ts";

// Note: registry is used only to build rows; renderPanel no longer needs it directly.

// ─── Helpers ──────────────────────────────────────────────────────────────────

const plainTheme = {
  fg: (_color: string, text: string) => text,
  bold: (text: string) => text,
  inverse: (text: string) => text,
  bg: (_color: string, text: string) => text,
} as unknown as Theme;

const stubControls: ControlBindings = {
  collapseExpand: "enter",
  collapseAll: "C",
  resetToDefault: "r",
  reorderItemUp: "K",
  reorderItemDown: "J",
  deleteItem: "d",
};

const PANEL_WIDTH = 40;

function makeRegistry() {
  const schema = S.settings({
    mykey: S.text({ tooltip: "A setting", default: "hello" }),
  });
  const registry = createRegistry();
  registry.set("test-ext", schema as Record<string, SettingNode>);
  return registry;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("renderPanel — layout composition", () => {
  it("produces output with top separator, input bar, rows, and hint bar", () => {
    const registry = makeRegistry();
    const state = createInitialState(false);
    const rows = buildRows(registry, state);

    const lines = renderPanel(
      rows,
      state,
      plainTheme,
      PANEL_WIDTH,
      stubControls,
    );

    // Top separator line
    expect(lines[0]).toMatch(/^─+$/);

    // Input bar on line 1
    expect(lines[1]).toMatch(/^>/);

    // Last line is the hint bar (non-empty)
    expect(lines[lines.length - 1].trim().length).toBeGreaterThan(0);
  });

  it("all output lines are within the panel width", () => {
    const registry = makeRegistry();
    const state = createInitialState(false);
    state.focusedIndex = 1;
    const rows = buildRows(registry, state);

    const lines = renderPanel(
      rows,
      state,
      plainTheme,
      PANEL_WIDTH,
      stubControls,
    );

    for (const line of lines) {
      expect(visibleWidth(line)).toBeLessThanOrEqual(PANEL_WIDTH);
    }
  });
});
