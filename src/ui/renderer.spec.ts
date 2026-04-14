/**
 * renderer.spec.ts — Unit tests for tooltip width-clamping and word-wrapping in renderPanel.
 *
 * Long tooltip strings must be word-wrapped so that every output line stays
 * within the panel width, preventing terminal overflow.
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * A minimal Theme stub that returns text unstyled. This keeps the test
 * free of ANSI escape sequences so visibleWidth() gives the plain character
 * count and string length comparisons are straightforward.
 */
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
const LONG_TOOLTIP =
  "This tooltip is intentionally very long and would overflow the terminal width if not truncated properly by the renderer.";

function makeRegistryWithLongTooltip() {
  const schema = S.settings({
    mykey: S.text({ tooltip: LONG_TOOLTIP, default: "hello" }),
  });
  const registry = createRegistry();
  registry.set("test-ext", schema as Record<string, SettingNode>);
  return registry;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("renderPanel — tooltip wrapping", () => {
  it("wraps a long tooltip across multiple lines, each within the panel width", () => {
    const registry = makeRegistryWithLongTooltip();
    const state = createInitialState(false);
    // Focus the setting row so renderTooltip picks up its tooltip text
    state.focusedIndex = 1; // index 0 is ext-header, index 1 is the setting

    const rows = buildRows(registry, state);
    const lines = renderPanel(
      rows,
      state,
      registry,
      plainTheme,
      PANEL_WIDTH,
      stubControls,
    );

    // Locate the tooltip region: find the first line that starts with the
    // unique opening of LONG_TOOLTIP, then collect consecutive non-empty lines.
    const startIdx = lines.findIndex((l) => l.startsWith("This tooltip"));
    expect(startIdx).toBeGreaterThanOrEqual(0); // tooltip must appear in the panel
    const tooltipLines: string[] = [];
    for (let i = startIdx; i < lines.length && lines[i].trim() !== ""; i++) {
      tooltipLines.push(lines[i]);
    }
    expect(tooltipLines.length).toBeGreaterThan(1); // long text must produce multiple lines
    for (const line of tooltipLines) {
      expect(visibleWidth(line)).toBeLessThanOrEqual(PANEL_WIDTH);
    }
  });

  it("does not truncate a tooltip that already fits within the panel width", () => {
    const shortTooltip = "Short tip";
    const schema = S.settings({
      mykey: S.text({ tooltip: shortTooltip, default: "v" }),
    });
    const registry = createRegistry();
    registry.set("test-ext", schema as Record<string, SettingNode>);

    const state = createInitialState(false);
    state.focusedIndex = 1;

    const rows = buildRows(registry, state);
    const lines = renderPanel(
      rows,
      state,
      registry,
      plainTheme,
      PANEL_WIDTH,
      stubControls,
    );

    const tooltipLine = lines.find((l) => l === shortTooltip);
    expect(tooltipLine).toBeDefined();
  });
});
