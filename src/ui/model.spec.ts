/**
 * model.spec.ts — Unit tests for the theme-free row builder.
 *
 * `buildRows` does not take a `Theme`: every styling decision lives in the
 * renderer. These tests pin the resulting `ViewRow` shape and ordering for
 * the cases that matter most:
 *
 *   1. Global view, nothing collapsed → all rows present in tree order.
 *   2. Extension collapsed → only the header row remains.
 *   3. Search-mode filter → only matching leaves and their group ancestors
 *      survive.
 *   4. Scoped view → only the rows under the scoped section.
 *   5. Expanded list → list-item, list-separator and list-add rows are
 *      injected under the parent setting row.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock storage ─────────────────────────────────────────────────────────────

vi.mock("../core/storage.ts", () => {
  const store = new Map<string, Map<string, string>>();
  return {
    getExtensionSetting: vi.fn(
      (extension: string, key: string, fallback?: string) => {
        return store.get(extension)?.get(key) ?? fallback;
      },
    ),
    setExtensionSetting: vi.fn(
      (extension: string, key: string, value: string) => {
        let ext = store.get(extension);
        if (!ext) {
          ext = new Map();
          store.set(extension, ext);
        }
        ext.set(key, value);
      },
    ),
    getAllSettingsForExtension: vi.fn(),
    __seed: (extension: string, key: string, value: string) => {
      let ext = store.get(extension);
      if (!ext) {
        ext = new Map();
        store.set(extension, ext);
      }
      ext.set(key, value);
    },
    __reset: () => store.clear(),
  };
});

import type { SettingNode } from "../../sdk/src/core/nodes.ts";
import { S } from "../../sdk/src/core/schema.ts";
import { createRegistry } from "../core/registry.ts";
import * as storage from "../core/storage.ts";
import { buildRows, type ViewRow } from "./model.ts";
import { createInitialState, extCollapseKey } from "./state.ts";

// ─── Test fixture ─────────────────────────────────────────────────────────────

/**
 * A small but representative schema. The settings are deliberately a mix of
 * leaf types to exercise every branch in `buildChildRows`.
 */
const fixtureSchema = S.settings({
  appearance: S.section({
    tooltip: "Look and feel",
    children: {
      color: S.text({ tooltip: "Primary color", default: "#fff" }),
      "show-icons": S.boolean({ tooltip: "Toggle icons", default: true }),
    },
  }),
  servers: S.list({
    tooltip: "Configured servers",
    default: [],
    items: S.struct({
      properties: {
        host: S.text({ tooltip: "Hostname", default: "" }),
        port: S.text({ tooltip: "Port", default: "22" }),
      },
    }),
  }),
});

function makeRegistry() {
  const registry = createRegistry();
  registry.set("pi-test", fixtureSchema as Record<string, SettingNode>);
  return registry;
}

beforeEach(() => {
  (storage as unknown as { __reset(): void }).__reset();
});

function ids(rows: ViewRow[]): string[] {
  return rows.map((r) => r.id);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("buildRows — theme-free row model", () => {
  it("emits the full tree at global scope when nothing is collapsed", () => {
    const registry = makeRegistry();
    const state = createInitialState(false);

    const rows = buildRows(registry, state);

    // Order: ext header → appearance group → its 2 leaves → servers list leaf.
    expect(ids(rows)).toEqual([
      "ext:pi-test",
      "group:pi-test:appearance",
      "setting:pi-test:appearance.color",
      "setting:pi-test:appearance.show-icons",
      "setting:pi-test:servers",
    ]);
  });

  it("collapses to just the extension header when the extension is collapsed", () => {
    const registry = makeRegistry();
    const state = createInitialState(false);
    state.collapsed.set(extCollapseKey("pi-test"), true);

    const rows = buildRows(registry, state);

    expect(ids(rows)).toEqual(["ext:pi-test"]);
    const header = rows[0]!;
    expect(header.type).toBe("extension-header");
    if (header.type === "extension-header") {
      expect(header.isCollapsed).toBe(true);
    }
  });

  it("filters rows by tooltip text in search mode", () => {
    const registry = makeRegistry();
    const state = createInitialState(false);
    state.inputValue = "color";

    const rows = buildRows(registry, state);

    // Only the appearance group (matches via descendant) and the color leaf
    // survive the filter; the boolean and the list are dropped.
    expect(ids(rows)).toEqual([
      "ext:pi-test",
      "group:pi-test:appearance",
      "setting:pi-test:appearance.color",
    ]);
  });

  it("limits visible rows to the scoped section", () => {
    const registry = makeRegistry();
    const state = createInitialState(false);
    state.scope = ["pi-test", "appearance"];

    const rows = buildRows(registry, state);

    // The scoped view drops `servers` (lives outside the scope) but keeps the
    // group ancestor + its leaves.
    expect(ids(rows)).toEqual([
      "ext:pi-test",
      "group:pi-test:appearance",
      "setting:pi-test:appearance.color",
      "setting:pi-test:appearance.show-icons",
    ]);
  });

  it("injects list-item / separator / list-add rows for an expanded list", () => {
    (
      storage as unknown as {
        __seed(ext: string, key: string, value: string): void;
      }
    ).__seed(
      "pi-test",
      "servers",
      JSON.stringify([
        { host: "alpha", port: "22" },
        { host: "beta", port: "2222" },
      ]),
    );

    const registry = makeRegistry();
    const state = createInitialState(false);
    state.expandedLists.add("pi-test:servers");

    const rows = buildRows(registry, state);

    expect(ids(rows)).toEqual([
      "ext:pi-test",
      "group:pi-test:appearance",
      "setting:pi-test:appearance.color",
      "setting:pi-test:appearance.show-icons",
      "setting:pi-test:servers",
      "list-item:pi-test:servers:0",
      "list-item:pi-test:servers:1",
      "list-sep:pi-test:servers",
      "list-add:pi-test:servers",
    ]);

    const item0 = rows.find((r) => r.id === "list-item:pi-test:servers:0")!;
    expect(item0.type).toBe("list-item");
    if (item0.type === "list-item") {
      expect(item0.fields).toEqual({ host: "alpha", port: "22" });
    }
  });
});
