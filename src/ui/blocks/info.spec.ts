/**
 * info.spec.ts — Unit tests for InfoBlock (pagination counter and tooltip
 * word-wrapping / width-clamping).
 */

import { describe, expect, it, vi } from "vitest";

// ─── Mock storage ─────────────────────────────────────────────────────────────

vi.mock("../../../sdk/src/core/storage.ts", () => {
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
import type { SettingNode } from "../../../sdk/src/core/nodes.ts";
import { S } from "../../../sdk/src/core/schema.ts";
import { createRegistry } from "../../core/registry.ts";
import { buildRows } from "../model.ts";
import { createInitialState } from "../state.ts";
import { InfoBlock } from "./info.ts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const plainTheme = {
  fg: (_color: string, text: string) => text,
  bold: (text: string) => text,
  inverse: (text: string) => text,
  bg: (_color: string, text: string) => text,
} as unknown as Theme;

const PANEL_WIDTH = 40;
const LONG_DESCRIPTION =
  "This description is intentionally very long and would overflow the terminal width if not truncated properly by the renderer.";

function makeRegistry(tooltip: string) {
  const schema = S.settings({
    mykey: S.text({ description: tooltip, default: "hello" }),
  });
  const registry = createRegistry();
  registry.set("test-ext", schema as Record<string, SettingNode>);
  return registry;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("InfoBlock — description word-wrapping", () => {
  it("wraps a long description across multiple lines, each within the panel width", () => {
    const registry = makeRegistry(LONG_DESCRIPTION);
    const state = createInitialState(false);
    state.focusedIndex = 1; // index 0 is ext-header, index 1 is the setting

    const rows = buildRows(registry, state);
    const lines = new InfoBlock(rows, state, plainTheme).render(PANEL_WIDTH);

    // Locate the description region: find the first line that starts with the
    // unique opening of LONG_DESCRIPTION, then collect consecutive non-empty lines.
    const startIdx = lines.findIndex((l) => l.startsWith("This description"));
    expect(startIdx).toBeGreaterThanOrEqual(0);

    const descriptionLines: string[] = [];
    for (let i = startIdx; i < lines.length && lines[i].trim() !== ""; i++) {
      descriptionLines.push(lines[i]);
    }

    expect(descriptionLines.length).toBeGreaterThan(1);
    for (const line of descriptionLines) {
      expect(visibleWidth(line)).toBeLessThanOrEqual(PANEL_WIDTH);
    }
  });

  it("does not wrap a description that already fits within the panel width", () => {
    const shortDescription = "Short tip";
    const registry = makeRegistry(shortDescription);
    const state = createInitialState(false);
    state.focusedIndex = 1;

    const rows = buildRows(registry, state);
    const lines = new InfoBlock(rows, state, plainTheme).render(PANEL_WIDTH);

    const descriptionLine = lines.find((l) => l === shortDescription);
    expect(descriptionLine).toBeDefined();
  });
});

describe("InfoBlock — pagination", () => {
  it("shows global section count when not scoped", () => {
    const schema = S.settings({
      key: S.text({ description: "a", default: "" }),
    });
    const registry = createRegistry();
    registry.set("ext-a", schema as Record<string, SettingNode>);
    registry.set("ext-b", schema as Record<string, SettingNode>);

    const state = createInitialState(false);
    const rows = buildRows(registry, state);
    const lines = new InfoBlock(rows, state, plainTheme).render(PANEL_WIDTH);

    expect(lines[0]).toMatch(/of \d+ section/);
  });

  it("shows position counter when scoped", () => {
    const schema = S.settings({
      key: S.text({ description: "a", default: "" }),
    });
    const registry = createRegistry();
    registry.set("my-ext", schema as Record<string, SettingNode>);

    const state = createInitialState(false);
    state.scope = ["my-ext"];
    state.focusedIndex = 1;

    const rows = buildRows(registry, state);
    const lines = new InfoBlock(rows, state, plainTheme).render(PANEL_WIDTH);

    expect(lines[0]).toMatch(/\(\d+\/\d+\)/);
  });
});
