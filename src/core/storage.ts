/**
 * storage.ts — Read/write extension settings within ~/.pi/agent/settings.json.
 *
 * Settings are stored under the top-level "extensions:settings" key:
 * {
 *   ...,
 *   "extensions:settings": {
 *     "pi-welcome": { "gradient-from": "#ff930f", "show-tips": true },
 *     "pi-statusbar": { "position": "bottom", "port": 3000, "items": [...] }
 *   }
 * }
 *
 * Values are stored as their natural JSON types:
 *   - Booleans  →  true / false
 *   - Numbers   →  42, 3.14, …
 *   - Arrays    →  [{…}, …]
 *   - Objects   →  {"key": "value", …}
 *   - Everything else → plain JSON string
 *
 * Section keys are flattened with dot notation (e.g., "colors.primary").
 * Internally, every value is handled as a string; conversion happens only at
 * the storage boundary via `toJsonValue` / `fromJsonValue`.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getAgentDir } from "@mariozechner/pi-coding-agent";

const SETTINGS_FILE_NAME = "settings.json";
const EXTENSIONS_SETTINGS_KEY = "extensions:settings";

type StorageFile = Record<string, Record<string, unknown>>;

// ─── Value conversion ─────────────────────────────────────────────────────────

/**
 * Convert an internal string value to its natural JSON representation.
 * Booleans, numbers, arrays, and objects are stored as their real types.
 * Plain text values remain strings.
 */
function toJsonValue(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed === "number" ||
      Array.isArray(parsed) ||
      (typeof parsed === "object" && parsed !== null)
    ) {
      return parsed;
    }
  } catch {
    // Not valid JSON — store as a plain string.
  }
  return value;
}

/**
 * Convert a JSON storage value back to the internal string representation.
 * Strings pass through unchanged; everything else is JSON-serialized.
 */
function fromJsonValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return JSON.stringify(value);
}

// ─── File I/O ─────────────────────────────────────────────────────────────────

function getStoragePath(): string {
  return join(getAgentDir(), SETTINGS_FILE_NAME);
}

function loadFile(): StorageFile {
  const path = getStoragePath();
  if (!existsSync(path)) return {};
  try {
    const content = readFileSync(path, "utf-8");
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const extSettings = parsed[EXTENSIONS_SETTINGS_KEY];
    return typeof extSettings === "object" && extSettings !== null
      ? (extSettings as StorageFile)
      : {};
  } catch {
    return {};
  }
}

function saveFile(data: StorageFile): void {
  const path = getStoragePath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  try {
    let existing: Record<string, unknown> = {};
    if (existsSync(path)) {
      try {
        existing = JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
      } catch {
        // ignore parse errors — overwrite with clean state
      }
    }
    existing[EXTENSIONS_SETTINGS_KEY] = data;
    writeFileSync(path, JSON.stringify(existing, null, 2), "utf-8");
  } catch {
    // Silently ignore write errors (read-only filesystem, permissions, etc.)
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get a single setting value for an extension.
 * Returns the stored value serialized as a string, or `defaultValue` if not found.
 */
export function getExtensionSetting(
  extension: string,
  key: string,
  defaultValue?: string
): string | undefined {
  const data = loadFile();
  const extSettings = data[extension];
  if (extSettings && key in extSettings) {
    return fromJsonValue(extSettings[key]);
  }
  return defaultValue;
}

/**
 * Set a single setting value for an extension.
 * The string value is converted to its natural JSON type before writing.
 * Writes to disk immediately.
 */
export function setExtensionSetting(extension: string, key: string, value: string): void {
  const data = loadFile();
  if (!data[extension]) data[extension] = {};
  data[extension]![key] = toJsonValue(value);
  saveFile(data);
}

/**
 * Get all stored settings for an extension as a key→string map.
 * Returns an empty object if no settings have been saved for this extension.
 */
export function getAllSettingsForExtension(extension: string): Record<string, string> {
  const data = loadFile();
  const raw = data[extension] ?? {};
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, fromJsonValue(v)]));
}

/**
 * Replace all settings for an extension atomically.
 * String values are converted to their natural JSON types before writing.
 * Useful for bulk saves (e.g., after a list edit).
 */
export function setAllSettingsForExtension(
  extension: string,
  settings: Record<string, string>
): void {
  const data = loadFile();
  data[extension] = Object.fromEntries(
    Object.entries(settings).map(([k, v]) => [k, toJsonValue(v)])
  );
  saveFile(data);
}

/**
 * Get all stored settings across all extensions.
 * Returns the full storage object (copy).
 */
export function getAllExtensionSettings(): StorageFile {
  return loadFile();
}
