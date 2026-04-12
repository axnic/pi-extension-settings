/**
 * settings.ts — Schema and typed reader for the `pi-extension-settings`
 * extension's *own* settings.
 *
 * The settings extension dog-foods its own SDK: instead of reaching directly
 * into storage to read its keybindings and behavior flags, it instantiates
 * an {@link ExtensionSettings} for itself in `index.ts` and exposes a small
 * typed accessor through {@link createSettingsReader}.
 *
 * This module exports:
 *   - {@link EXTENSION_NAME}            — extension identifier used as the storage namespace.
 *   - {@link DEFAULT_CONTROL_BINDINGS}  — runtime defaults for keyboard bindings.
 *   - {@link DEFAULT_START_IN_SEARCH_MODE}
 *   - {@link ControlBindings}           — typed shape returned by the reader.
 *   - {@link schema}                    — the `S.settings(...)` schema for this extension.
 *   - {@link createSettingsReader}      — wraps an `ExtensionSettings` instance with named getters.
 */

import { d, type ExtensionSettings, S, t, v } from "../sdk/index.js";

/** Extension identifier — also the storage namespace key. */
export const EXTENSION_NAME = "pi-extension-settings";

/**
 * Built-in defaults for the configurable keyboard bindings of the panel.
 * Used both as the schema defaults and as the fallback values for the reader.
 */
export const DEFAULT_CONTROL_BINDINGS = {
  resetToDefault: "r",
  collapseExpand: "space",
  collapseAll: "shift+space",
  reorderItemUp: "shift+up",
  reorderItemDown: "shift+down",
  deleteItem: "d",
} as const;

/** Default value for `behavior.start-in-search-mode`. */
export const DEFAULT_START_IN_SEARCH_MODE = true;

/** Resolved keyboard bindings, normalised to lowercase trimmed strings. */
export interface ControlBindings {
  resetToDefault: string;
  collapseExpand: string;
  collapseAll: string;
  reorderItemUp: string;
  reorderItemDown: string;
  deleteItem: string;
}

/**
 * The settings extension's own schema.
 *
 * Each keybinding has a `transform: t.pipe(t.trim(), t.lowercase())` so the
 * stored value is always normalised — no extra normalisation is required at
 * read time.
 */
export const schema = S.settings({
  behavior: S.section({
    tooltip:
      "Behavior — controls how the settings panel opens and behaves (search vs navigation).",
    children: {
      "start-in-search-mode": S.boolean({
        tooltip:
          "Start in search mode — open with search focused so you can type to filter; otherwise start in navigation mode.",
        default: DEFAULT_START_IN_SEARCH_MODE,
      }),
    },
  }),
  controls: S.section({
    tooltip:
      "Controls — keyboard shortcuts for navigating and manipulating items (collapse, reorder, reset, delete).",
    children: {
      "reset-to-default": S.text({
        tooltip: "Reset focused setting to its default value.",
        default: DEFAULT_CONTROL_BINDINGS.resetToDefault,
        validation: v.keybinding(),
        transform: t.pipe(t.trim(), t.lowercase()),
        display: d.keybinding(),
      }),
      "collapse-expand": S.text({
        tooltip:
          "Toggle collapse/expand for the focused header to hide or show its settings.",
        default: DEFAULT_CONTROL_BINDINGS.collapseExpand,
        validation: v.keybinding(),
        transform: t.pipe(t.trim(), t.lowercase()),
        display: d.keybinding(),
      }),
      "collapse-all": S.text({
        tooltip:
          "Collapse all visible extension and folder headers to reduce clutter.",
        default: DEFAULT_CONTROL_BINDINGS.collapseAll,
        validation: v.keybinding(),
        transform: t.pipe(t.trim(), t.lowercase()),
        display: d.keybinding(),
      }),
      "reorder-item-up": S.text({
        tooltip: "Move the focused list item one position up within its list.",
        default: DEFAULT_CONTROL_BINDINGS.reorderItemUp,
        validation: v.keybinding(),
        transform: t.pipe(t.trim(), t.lowercase()),
        display: d.keybinding(),
      }),
      "reorder-item-down": S.text({
        tooltip:
          "Move the focused list item one position down within its list.",
        default: DEFAULT_CONTROL_BINDINGS.reorderItemDown,
        validation: v.keybinding(),
        transform: t.pipe(t.trim(), t.lowercase()),
        display: d.keybinding(),
      }),
      "delete-item": S.text({
        tooltip:
          "Delete the focused list item. Use with care; deletions may be irreversible.",
        default: DEFAULT_CONTROL_BINDINGS.deleteItem,
        validation: v.keybinding(),
        transform: t.pipe(t.trim(), t.lowercase()),
        display: d.keybinding(),
      }),
    },
  }),
});

/** The schema type — exposed so callers can type their `ExtensionSettings<…>`. */
export type SettingsSchema = typeof schema;

/**
 * Settle a binding value: if the user has somehow managed to clear it (empty
 * string after trim), fall back to the built-in default. The transform on the
 * schema already takes care of trimming and lowercasing on save, so this
 * helper is purely defensive.
 */
function settleBinding(value: string, fallback: string): string {
  return value.length > 0 ? value : fallback;
}

/**
 * The shape returned by {@link createSettingsReader}: a tiny façade with
 * named getters for the values consumed by the panel.
 */
export interface SettingsReader {
  /** Whether the panel should open with the search bar focused. */
  readonly startInSearchMode: boolean;
  /** Resolved keyboard bindings. */
  readonly controls: ControlBindings;
}

/**
 * Wrap an {@link ExtensionSettings} instance for the settings extension's
 * own schema with named, typed getters.
 *
 * The reader is intentionally cheap: each property reads through to the
 * underlying typed accessor on every access, so it always reflects the
 * latest stored value.
 */
export function createSettingsReader(
  settings: ExtensionSettings<SettingsSchema>,
): SettingsReader {
  return {
    get startInSearchMode(): boolean {
      return settings.get("behavior.start-in-search-mode");
    },
    get controls(): ControlBindings {
      return {
        resetToDefault: settleBinding(
          settings.get("controls.reset-to-default"),
          DEFAULT_CONTROL_BINDINGS.resetToDefault,
        ),
        collapseExpand: settleBinding(
          settings.get("controls.collapse-expand"),
          DEFAULT_CONTROL_BINDINGS.collapseExpand,
        ),
        collapseAll: settleBinding(
          settings.get("controls.collapse-all"),
          DEFAULT_CONTROL_BINDINGS.collapseAll,
        ),
        reorderItemUp: settleBinding(
          settings.get("controls.reorder-item-up"),
          DEFAULT_CONTROL_BINDINGS.reorderItemUp,
        ),
        reorderItemDown: settleBinding(
          settings.get("controls.reorder-item-down"),
          DEFAULT_CONTROL_BINDINGS.reorderItemDown,
        ),
        deleteItem: settleBinding(
          settings.get("controls.delete-item"),
          DEFAULT_CONTROL_BINDINGS.deleteItem,
        ),
      };
    },
  };
}
