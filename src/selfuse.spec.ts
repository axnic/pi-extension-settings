/**
 * selfuse.spec.ts — Integration test: the settings extension dog-foods
 * its own SDK.
 *
 * The extension reads its own configuration via the public
 * {@link ExtensionSettings} class instead of touching the storage layer
 * directly. This spec verifies the full round-trip:
 *
 *   1. Constructing `ExtensionSettings` registers a listener for the
 *      `pi-extension-settings:ready` event.
 *   2. When the panel emits `:ready` (as it does in `session_start`), the SDK
 *      replies with `:register`, which the index handler turns into a
 *      `registry.set("pi-extension-settings", schema)` call.
 *   3. Typed `get` / `set` round-trip through the in-memory storage mock.
 *   4. Schema-level transforms (`t.trim`, `t.lowercase`) are applied on save,
 *      so the reader never sees a value the user typed in mixed-case or with
 *      surrounding whitespace.
 *   5. `onChange` listeners fire when a `pi-extension-settings:changed` event
 *      arrives — exactly the pathway used by the panel after a save.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock the storage layer (no real disk I/O) ────────────────────────────────

vi.mock("../sdk/src/core/storage", () => {
  const store = new Map<string, Map<string, unknown>>();
  return {
    getExtensionSetting: vi.fn(
      (extension: string, key: string, fallback?: unknown) => {
        const ext = store.get(extension);
        if (!ext?.has(key)) return fallback;
        return ext.get(key);
      },
    ),
    setExtensionSetting: vi.fn(
      (extension: string, key: string, value: unknown) => {
        let ext = store.get(extension);
        if (!ext) {
          ext = new Map();
          store.set(extension, ext);
        }
        ext.set(key, value);
      },
    ),
    __reset: () => store.clear(),
  };
});

import { ExtensionSettings } from "../sdk/src/core/extension-settings.ts";
// Pull in the mocked module to access the helper that resets the store.
import * as storage from "../sdk/src/core/storage";
import { createRegistry } from "./core/registry.ts";
import {
  createSettingsReader,
  DEFAULT_CONTROL_BINDINGS,
  DEFAULT_START_IN_SEARCH_MODE,
  EXTENSION_NAME,
  schema,
} from "./settings.ts";

// ─── Fake `pi` API ────────────────────────────────────────────────────────────

function makePi() {
  const listeners = new Map<string, Array<(data: unknown) => void>>();
  return {
    events: {
      on: vi.fn((event: string, cb: (data: unknown) => void) => {
        const bucket = listeners.get(event) ?? [];
        bucket.push(cb);
        listeners.set(event, bucket);
      }),
      emit: vi.fn((event: string, data?: unknown) => {
        for (const cb of listeners.get(event) ?? []) cb(data!);
      }),
    },
  };
}

beforeEach(() => {
  (storage as unknown as { __reset(): void }).__reset();
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("pi-extension-settings — self-use via the public SDK", () => {
  it("registers itself with the registry through the :ready → :register flow", () => {
    const pi = makePi();
    const registry = createRegistry();

    // Mirror what index.ts does on its registration listener.
    pi.events.on("pi-extension-settings:register", (raw: unknown) => {
      const data = raw as {
        extension: string;
        nodes: Record<string, unknown>;
      };
      registry.set(data.extension, data.nodes as never);
    });

    // Construct the SDK *before* emitting :ready, just like index.ts does.
    new ExtensionSettings(pi as never, EXTENSION_NAME, schema);

    // Now simulate session_start.
    pi.events.emit("pi-extension-settings:ready", {});

    expect(registry.has(EXTENSION_NAME)).toBe(true);
    expect(registry.get(EXTENSION_NAME)).toBe(schema);
  });

  it("returns schema defaults before any value is saved", () => {
    const pi = makePi();
    const settings = new ExtensionSettings(pi as never, EXTENSION_NAME, schema);
    const reader = createSettingsReader(settings);

    expect(reader.startInSearchMode).toBe(DEFAULT_START_IN_SEARCH_MODE);
    expect(reader.controls).toEqual(DEFAULT_CONTROL_BINDINGS);
  });

  it("round-trips a boolean toggle through the typed API", () => {
    const pi = makePi();
    const settings = new ExtensionSettings(pi as never, EXTENSION_NAME, schema);
    const reader = createSettingsReader(settings);

    settings.set("behavior.start-in-search-mode", false);
    expect(settings.get("behavior.start-in-search-mode")).toBe(false);
    expect(reader.startInSearchMode).toBe(false);
  });

  it("applies the trim+lowercase transform on save for keybindings", () => {
    const pi = makePi();
    const settings = new ExtensionSettings(pi as never, EXTENSION_NAME, schema);
    const reader = createSettingsReader(settings);

    settings.set("controls.delete-item", "  X  ");
    // The schema transform pipe(trim, lowercase) runs on save.
    expect(settings.get("controls.delete-item")).toBe("x");
    expect(reader.controls.deleteItem).toBe("x");
  });

  it("fires onChange when the panel emits a :changed event", () => {
    const pi = makePi();
    const settings = new ExtensionSettings(pi as never, EXTENSION_NAME, schema);

    const calls: unknown[] = [];
    settings.onChange("behavior.start-in-search-mode", (v) => calls.push(v));

    // Pre-populate storage so getExtensionSetting returns false when the SDK reads it.
    storage.setExtensionSetting(
      EXTENSION_NAME,
      "behavior.start-in-search-mode",
      false,
    );
    // Simulate the panel saving a change (scoped event, key-only payload).
    pi.events.emit(`pi-extension-settings:${EXTENSION_NAME}:changed`, {
      key: "behavior.start-in-search-mode",
    });

    expect(calls).toEqual([false]);
  });
});
