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
 * Values are stored and returned as their natural JSON types:
 *   - Booleans  →  true / false
 *   - Numbers   →  42, 3.14, …
 *   - Arrays    →  [{…}, …]
 *   - Objects   →  {"key": "value", …}
 *   - Everything else → plain JSON string
 *
 * Section keys are flattened with dot notation (e.g., "colors.primary").
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getAgentDir } from "@mariozechner/pi-coding-agent";

const SETTINGS_FILE_NAME = "settings.json";
const EXTENSIONS_SETTINGS_KEY = "extensions:settings";

type StorageFile = Record<string, Record<string, unknown>>;

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
    try {
      existing = JSON.parse(readFileSync(path, "utf-8")) as Record<
        string,
        unknown
      >;
    } catch {
      // file doesn't exist or unparseable — start fresh
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
 * Returns the raw stored JSON value, or `defaultValue` if not found.
 */
export function getExtensionSetting(
  extension: string,
  key: string,
  defaultValue?: unknown,
): unknown {
  const data = loadFile();
  const extSettings = data[extension];
  if (extSettings && key in extSettings) {
    return extSettings[key];
  }
  return defaultValue;
}

/**
 * Set a single setting value for an extension.
 * The value is stored as-is (native JSON type). Writes to disk immediately.
 */
export function setExtensionSetting(
  extension: string,
  key: string,
  value: unknown,
): void {
  const data = loadFile();
  if (!data[extension]) data[extension] = {};
  data[extension]![key] = value;
  saveFile(data);
}

/**
 * Get all stored settings across all extensions.
 * Returns the full storage object (copy).
 */
export function getAllExtensionSettings(): StorageFile {
  return loadFile();
}
