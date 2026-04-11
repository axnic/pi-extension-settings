/**
 * registry.ts — Type definitions and helpers for the extension registry.
 *
 * The registry maps extension names → their SettingNode schemas.
 * It is populated during session_start via "pi-extension-settings:register" events.
 */

import type { SettingNode } from "../sdk/src/core/nodes.ts";

/** Payload sent by consumer extensions when registering their settings. */
export interface RegistrationPayload {
  /** The extension's package name (e.g., "pi-welcome"). */
  extension: string;
  /** The full settings schema: a Record<string, SettingNode>. */
  nodes: Record<string, SettingNode>;
}

/**
 * The registry maps extension names to their SettingNode schema.
 * Populated once per session (after session_start with reason "startup" or "reload").
 */
export type Registry = Map<string, Record<string, SettingNode>>;

/**
 * Create a fresh, empty registry.
 */
export function createRegistry(): Registry {
  return new Map();
}

/**
 * Count the total number of leaf settings in a schema (recursing into groups).
 */
export function countSettings(nodes: Record<string, SettingNode>): number {
  let count = 0;
  for (const node of Object.values(nodes)) {
    if (node._tag === "section") {
      count += countSettings(node.children);
    } else {
      count += 1;
    }
  }
  return count;
}
