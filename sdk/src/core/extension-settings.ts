/**
 * core/extension-settings.ts — The `ExtensionSettings` class.
 *
 * This is the primary entry point for consumer extensions. It wires the
 * registration flow, provides typed `get` / `set` / `onChange` / `getAll`
 * methods, and delegates storage to the core storage module.
 *
 * @example
 * ```ts
 * import { S, ExtensionSettings } from "pi-extension-settings/sdk";
 *
 * const schema = S.settings({
 *   color: S.text({ description: "Accent color", default: "#fff" }),
 * });
 *
 * const settings = new ExtensionSettings(pi, "my-extension", schema);
 * const color = settings.get("color"); // inferred as `string`
 * settings.onChange("color", (v) => rerender(v));
 * ```
 *
 * @module
 */

import { getExtensionSetting, setExtensionSetting } from "./storage.js";

// ─── Event types ──────────────────────────────────────────────────────────────

/**
 * Payload for the `pi-extension-settings:{extension}:changed` event.
 *
 * The panel emits this event (scoped per extension) when the user saves a
 * setting. Only the key is transmitted; the SDK re-reads the current value
 * from storage so the caller always receives a fully-written, up-to-date value.
 */
export type SettingChangedPayload = {
  /** The dotted key path of the changed setting. */
  key: string;
};

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { SettingNotFoundError } from "./errors";
import type { LeafNode, SettingNode } from "./nodes";
import type { InferConfig } from "./schema";

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Navigate a schema by a dotted key path, descending through Section nodes.
 * Returns the leaf node at the given path, or `undefined` if not found.
 */
function findNode(
  schema: Record<string, SettingNode>,
  key: string,
): LeafNode | undefined {
  const parts = key.split(".");
  let current: Record<string, SettingNode> = schema;

  for (let i = 0; i < parts.length - 1; i++) {
    const segment = parts[i] as string;
    const node = current[segment];
    if (!node || node._tag !== "section") return undefined;
    current = node.children;
  }

  const leaf = current[parts[parts.length - 1] as string];
  if (!leaf || leaf._tag === "section") return undefined;
  return leaf as LeafNode;
}

/**
 * Collect all leaf key paths from a schema, using dot notation for sections.
 *
 * @example
 * // For { foo: text, bar: section({ baz: text }) }
 * collectKeys(schema) // => ["foo", "bar.baz"]
 */
function collectKeys(
  schema: Record<string, SettingNode>,
  prefix = "",
): string[] {
  const keys: string[] = [];
  for (const [key, node] of Object.entries(schema)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (node._tag === "section") {
      keys.push(...collectKeys(node.children, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// ─── ExtensionSettings class ──────────────────────────────────────────────────

/**
 * `ExtensionSettings` — typed settings accessor for consumer extensions.
 *
 * Construct once per extension. Registers the extension's schema with
 * `pi-extension-settings` and exposes typed `get` / `set` / `onChange` / `getAll`.
 *
 * @typeParam S - The schema object type, inferred from the `S.settings(...)` call.
 */
export class ExtensionSettings<S extends Record<string, SettingNode>> {
  private readonly extension: string;
  private readonly schema: S;
  private readonly listeners = new Map<
    string,
    Array<(value: unknown) => void>
  >();

  constructor(pi: ExtensionAPI, extension: string, schema: S) {
    this.extension = extension;
    this.schema = schema;

    // When pi-extension-settings is ready (after session_start),
    // register our schema with the panel.
    pi.events.on("pi-extension-settings:ready", () => {
      pi.events.emit("pi-extension-settings:register", {
        extension,
        nodes: schema,
      });
    });

    // When the settings panel saves a change for our extension, fire onChange listeners.
    // The event is scoped to this extension so only our listeners are invoked.
    pi.events.on(
      `pi-extension-settings:${extension}:changed`,
      (rawData: unknown) => {
        const data = rawData as SettingChangedPayload;
        if (!data?.key) return;
        const node = findNode(schema, data.key);
        if (!node) return;
        const value = getExtensionSetting(extension, data.key);
        const finalValue = value !== undefined ? value : node.default;
        const cbs = this.listeners.get(data.key);
        if (cbs) {
          for (const cb of cbs) cb(finalValue);
        }
      },
    );
  }

  /**
   * Get the current value for a setting key.
   * Returns the stored value (typed), falling back to the schema default if
   * no value has been saved yet.
   *
   * @param key - The setting key, using dot notation for nested keys.
   * @param fallback - Optional fallback value if the setting is not found or has no stored value.
   */
  get<K extends keyof InferConfig<S>>(
    key: K,
    fallback?: InferConfig<S>[K],
  ): InferConfig<S>[K] {
    const k = key as string;
    const node = findNode(this.schema, k);
    if (!node) {
      throw new SettingNotFoundError(this.extension, k);
    }
    const value = getExtensionSetting(this.extension, k);
    if (value === undefined) {
      return fallback !== undefined
        ? fallback
        : (node.default as InferConfig<S>[K]);
    }
    return value as InferConfig<S>[K];
  }

  /**
   * Set a setting value.
   * Applies the `transform` hook for text nodes, writes to storage, then fires
   * any registered `onChange` listeners synchronously.
   */
  set<K extends keyof InferConfig<S>>(key: K, value: InferConfig<S>[K]): void {
    const k = key as string;
    const node = findNode(this.schema, k);
    if (!node) {
      throw new SettingNotFoundError(this.extension, k);
    }

    let finalValue: unknown = value;
    if (node._tag === "text" && node.transform) {
      finalValue = node.transform(value as string);
    }

    setExtensionSetting(this.extension, k, finalValue);

    const cbs = this.listeners.get(k);
    if (cbs) {
      for (const cb of cbs) cb(finalValue);
    }
  }

  /**
   * Subscribe to changes for a setting key.
   * The callback fires when the settings panel saves a change, or when
   * `set()` is called programmatically. Listeners are session-scoped and do
   * not need explicit cleanup.
   */
  onChange<K extends keyof InferConfig<S>>(
    key: K,
    cb: (value: InferConfig<S>[K]) => void,
  ): void {
    const k = key as string;
    const existing = this.listeners.get(k) ?? [];
    existing.push(cb as (value: unknown) => void);
    this.listeners.set(k, existing);
  }

  /**
   * Get all current settings as a typed snapshot.
   * Keys that have no stored value fall back to their schema defaults.
   */
  getAll(): InferConfig<S> {
    const result: Record<string, unknown> = {};

    for (const k of collectKeys(this.schema)) {
      const node = findNode(this.schema, k);
      if (!node) continue;
      const value = getExtensionSetting(this.extension, k);
      result[k] = value !== undefined ? value : node.default;
    }

    return result as InferConfig<S>;
  }
}
