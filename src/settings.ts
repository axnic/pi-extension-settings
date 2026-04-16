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

import { type ExtensionSettings, S } from "../sdk/index.js";
import { d, t, v } from "../sdk/src/hooks/index.js";

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
  scrollDescUp: "pageup",
  scrollDescDown: "pagedown",
} as const;

/** Default value for `behavior.start-in-search-mode`. */
export const DEFAULT_START_IN_SEARCH_MODE = false;

/** Default value for `behavior.max-visible-rows`. */
export const DEFAULT_MAX_VISIBLE_ROWS = 14;

/** Resolved keyboard bindings, normalised to lowercase trimmed strings. */
export interface ControlBindings {
  resetToDefault: string;
  collapseExpand: string;
  collapseAll: string;
  reorderItemUp: string;
  reorderItemDown: string;
  deleteItem: string;
  scrollDescUp: string;
  scrollDescDown: string;
}

/**
 * Markdown documentation shown in the description panel when the extension
 * header row is focused in `/extensions:settings`.
 */
export const EXTENSION_DOCUMENTATION = `# pi-extension-settings

Provides a unified TUI settings panel for pi extensions.
Extensions register their settings schema via an event protocol; the panel
lists every registered extension and lets you browse and edit all settings
in one place.

---

## Opening the panel

Run the slash command:

\`\`\`
/extensions:settings
\`\`\`

---

## Navigation

| Key | Action |
|-----|--------|
| \`↑\` / \`↓\` | Move focus up / down |
| \`Enter\` | Edit the focused setting |
| \`Esc\` | Cancel editing / close panel |
| \`/\` | Toggle search mode |
| \`Space\` | Collapse / expand section |
| \`Shift+Space\` | Collapse all sections |
| \`PageUp\` / \`PageDown\` | Scroll description panel |

---

## Behavior settings

- **start-in-search-mode** — when \`true\`, the panel opens with the search bar
  focused so you can immediately type to filter settings.
- **max-visible-rows** — controls how many rows the panel shows at once
  (minimum 5).

---

## Controls settings

All keybindings are configurable. Set any binding to a single key or a
modifier combination (e.g. \`shift+up\`, \`ctrl+r\`). The stored value is
always normalised to lowercase.

| Setting | Default | Description |
|---------|---------|-------------|
| reset-to-default | \`r\` | Reset focused setting to its schema default |
| collapse-expand | \`Space\` | Toggle collapse / expand for focused header |
| collapse-all | \`Shift+Space\` | Collapse all headers |
| reorder-item-up | \`Shift+↑\` | Move focused list item up |
| reorder-item-down | \`Shift+↓\` | Move focused list item down |
| delete-item | \`d\` | Delete focused list item |
| scroll-desc-up | \`PageUp\` | Scroll description panel up |
| scroll-desc-down | \`PageDown\` | Scroll description panel down |
`;

/** The settings extension's own schema.
 *
 * Each keybinding has a `transform: t.pipe(t.trim(), t.lowercase())` so the
 * stored value is always normalised — no extra normalisation is required at
 * read time.
 */
export const schema = S.settings({
  behavior: S.section({
    description:
      "Behavior — controls how the settings panel opens and behaves (search vs navigation).",
    children: {
      "start-in-search-mode": S.boolean({
        description:
          "Start in search mode — open with search focused so you can type to filter; otherwise start in navigation mode.",
        default: DEFAULT_START_IN_SEARCH_MODE,
      }),
      "max-visible-rows": S.number({
        description:
          "Maximum number of setting rows visible at once. Increase to see more settings, decrease to keep the panel compact. Minimum is 5.",
        default: DEFAULT_MAX_VISIBLE_ROWS,
        validation: v.all(v.integer(), v.range({ min: 5 })),
      }),
    },
  }),
  controls: S.section({
    description:
      "Controls — keyboard shortcuts for navigating and manipulating items (collapse, reorder, reset, delete).",
    children: {
      "reset-to-default": S.text({
        description: "Reset focused setting to its default value.",
        default: DEFAULT_CONTROL_BINDINGS.resetToDefault,
        validation: v.keybinding(),
        transform: t.pipe(t.trim(), t.lowercase()),
        display: d.keybinding(),
      }),
      "collapse-expand": S.text({
        description:
          "Toggle collapse/expand for the focused header to hide or show its settings.",
        default: DEFAULT_CONTROL_BINDINGS.collapseExpand,
        validation: v.keybinding(),
        transform: t.pipe(t.trim(), t.lowercase()),
        display: d.keybinding(),
      }),
      "collapse-all": S.text({
        description:
          "Collapse all visible extension and folder headers to reduce clutter.",
        default: DEFAULT_CONTROL_BINDINGS.collapseAll,
        validation: v.keybinding(),
        transform: t.pipe(t.trim(), t.lowercase()),
        display: d.keybinding(),
      }),
      "reorder-item-up": S.text({
        description:
          "Move the focused list item one position up within its list.",
        default: DEFAULT_CONTROL_BINDINGS.reorderItemUp,
        validation: v.keybinding(),
        transform: t.pipe(t.trim(), t.lowercase()),
        display: d.keybinding(),
      }),
      "reorder-item-down": S.text({
        description:
          "Move the focused list item one position down within its list.",
        default: DEFAULT_CONTROL_BINDINGS.reorderItemDown,
        validation: v.keybinding(),
        transform: t.pipe(t.trim(), t.lowercase()),
        display: d.keybinding(),
      }),
      "delete-item": S.text({
        description:
          "Delete the focused list item. Use with care; deletions may be irreversible.",
        default: DEFAULT_CONTROL_BINDINGS.deleteItem,
        validation: v.keybinding(),
        transform: t.pipe(t.trim(), t.lowercase()),
        display: d.keybinding(),
      }),
      "scroll-desc-up": S.text({
        description:
          "Scroll the description panel up by one line while in navigation mode.",
        default: DEFAULT_CONTROL_BINDINGS.scrollDescUp,
        validation: v.keybinding(),
        transform: t.pipe(t.trim(), t.lowercase()),
        display: d.keybinding(),
      }),
      "scroll-desc-down": S.text({
        description:
          "Scroll the description panel down by one line while in navigation mode.",
        default: DEFAULT_CONTROL_BINDINGS.scrollDescDown,
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
  /** Maximum number of setting rows visible at once in the panel viewport. */
  readonly maxVisibleRows: number;
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
    get maxVisibleRows(): number {
      const val = Number(
        settings.get("behavior.max-visible-rows") ?? DEFAULT_MAX_VISIBLE_ROWS,
      );
      return Math.max(
        5,
        isNaN(val) ? DEFAULT_MAX_VISIBLE_ROWS : Math.floor(val),
      );
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
        scrollDescUp: settleBinding(
          settings.get("controls.scroll-desc-up"),
          DEFAULT_CONTROL_BINDINGS.scrollDescUp,
        ),
        scrollDescDown: settleBinding(
          settings.get("controls.scroll-desc-down"),
          DEFAULT_CONTROL_BINDINGS.scrollDescDown,
        ),
      };
    },
  };
}
