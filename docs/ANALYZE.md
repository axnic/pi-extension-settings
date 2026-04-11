# Analyze of existing `settings` UI

---

## pi (settings menu)

```
>

→ Auto-compact            true
  Show images             true
  Auto-resize images      true
  Block images            false
  Skill commands          true
  Show hardware cursor    false
  Editor padding          0
  Autocomplete max items  5
  Clear on shrink         false
  Steering mode           all
  (1/19)

  Automatically compact context when it gets too large

  Type to search · Enter/Space to change · Esc to cancel
```

**Precise description**

- Input bar doubles as a live search field: typing filters settings in real time.
- Each row shows a setting name (left) and its current value (right), with `→` marking the active selection.
- A pagination counter `(1/19)` indicates position in the full list.
- A tooltip line below the list shows a short human-readable description of the focused setting.
- Bottom hint bar: `Type to search · Enter/Space to change · Esc to cancel`.
- Value cycling: pressing `Enter` or `Space` rotates through available values (boolean flip, enum cycle, numeric increment).
- No grouping or folder mechanism — all settings live in a flat list.

**Appreciation (pros / cons / suggestions)**

- Pros:
  - Native to `pi`, consistent with the shell-like aesthetic and familiar to existing users.
  - Live search makes it fast to locate a setting by name.
  - Inline tooltip for the focused setting provides just-in-time guidance without leaving the panel.
- Cons:
  - Value-cycling via `Enter`/`Space` is awkward for settings with many options or for free-text / numeric values — no direct edit mode.
  - Flat list with pagination becomes hard to navigate as the number of settings grows (no folder or category grouping).
  - No indication of which settings have been changed from their defaults.
- Suggestions:
  - Introduce a category / folder grouping (e.g., `Appearance`, `Behavior`, `Context`) for scannability.
  - Allow direct inline editing for numeric and text values (press `e` or `i` to enter edit mode).
  - Highlight or mark settings that differ from their default value.

---

## github.com/juanibiapina/pi-extension-settings

```

 Extension Settings

>

  pi-welcome
    Gradient start color  #ff930f
    Gradient end color    #fff95b
→   Tips                  init,slash,bang,shift-tab,help

  Toggle and reorder the tips shown at startup

  Type to search · Enter/Space to change · Esc to cancel
```

**Precise description**

- The input bar is replaced by a static `Extension Settings` title banner at the top of the panel.
- Settings are grouped under their extension name (e.g., `pi-welcome`) displayed as a non-selectable header row.
- Each child setting shows a name (left) and current value (right), with `→` marking the active selection.
- A tooltip line below the list describes the focused setting.
- Bottom hint bar: `Type to search · Enter/Space to change · Esc to cancel` — visually identical to the native pi settings panel.
- Settings are persisted in a dedicated per-extension configuration file (not `settings.json`).
- Multiple extensions appear as consecutive sections in the same flat list, separated by their header row.

**Appreciation (pros / cons / suggestions)**

- Pros:
  - Closely mirrors the native `pi` settings panel design, providing a consistent user experience.
  - Extension grouping headers give immediate visual context for which extension owns each setting.
  - All extension settings are centralized in one panel, avoiding scattered configuration files per extension.
- Cons:
  - Replacing the input bar with a static title removes the live search capability — a significant regression vs. the native experience.
  - Settings are stored in a dedicated file outside `settings.json`, reducing discoverability for users who configure pi manually.
  - As the number of extensions grows, a flat grouped list will become difficult to scan — no collapsible folders or sub-sections.
  - A single line per setting is insufficient for complex settings that require explanation or multi-value input.
- Suggestions:
  - Restore the input bar as a live search field, keeping the `Extension Settings` title elsewhere (e.g., in the tooltip area or a header above the list).
  - Consolidate extension settings into `settings.json` under a namespaced key (e.g., `extensions:settings.<name>`) for a single source of truth.
  - Add collapsible section headers so users can fold/unfold an extension's settings block.
  - Support a multi-line detail pane (split view) for settings that need richer descriptions or multi-value editing.

---

## github.com/MasuRii/pi-tool-display

```
 ┌───────────────────────────────────────────────────────────────────────────────────────┐
 │Pi Tool Display Settings                                             [               ]│
 │────────────────────────────────┬──────────────────────────────────────────────────────│
 │> Preset profile        custom  │[ Preset Profile ]                                    │
 │  Read tool output      summary │                                                      │
 │  Grep/Find/Ls output   hidden  │Determines the overall verbosity and layout of the    │
 │  MCP tool output       summary │agent's tool output.                                  │
 │  Preview lines         8       │Choosing a preset applies a coherent profile across   │
 │  Bash tool output      opencode│read, search, MCP, bash, and diff display settings.   │
 │  Bash collapsed lines  10      │                                                      │
 │  Edit diff layout      auto    │Options:                                              │
 │  Native user message … off     │• opencode — strict inline-only tool output           │
 │                                │• balanced — compact summaries with counts            │
 │                                │…                                                     │
 │                                │                                                      │
 │                                │Path:                                                 │
 │                                │~/.pi/agent/extensions/pi-tool-display/config.json    │
 │────────────────────────────────┬──────────────────────────────────────────────────────│
 │Space/Enter toggle │ ↑↓ navigate │ / advanced │ Esc close                              │
 └───────────────────────────────────────────────────────────────────────────────────────┘
```

**Precise description**

- Full overlay with a hard border (box-drawing characters) and a title bar: `Pi Tool Display Settings`, plus a right-aligned search input `[               ]`.
- Two-column split layout: left column holds the settings list, right column is a rich detail pane.
- Left column: `→` marks the active setting; each row shows name and current value.
- Right column: shows the focused setting's title in brackets, a multi-line human-readable description, a bulleted list of available option values with short explanations, and the path to the configuration file.
- Bottom hint bar: `Space/Enter toggle │ ↑↓ navigate │ / advanced │ Esc close`.
- `/` key opens an `advanced` mode (additional options or raw editing).
- Configuration is stored in a dedicated JSON file; the path is surfaced inline in the detail pane.

**Appreciation (pros / cons / suggestions)**

- Pros:
  - Two-column layout gives ample space for rich, multi-line descriptions without cluttering the settings list.
  - Surfacing the config file path directly in the UI improves discoverability and helps power users edit directly.
  - Bulleted option descriptions turn the panel into self-contained documentation — no need to consult external docs.
- Cons:
  - Custom overlay design diverges from the native `pi` settings panel, creating an inconsistent experience across the tool ecosystem.
  - Left column is narrow and will truncate setting names or values once there are many entries; limited room for folder/sub-folder hierarchy.
  - Having a separate config file (rather than `settings.json`) fragments configuration management for users who maintain dotfiles.
- Suggestions:
  - Align keybindings and visual language with the native `pi` settings panel where possible (e.g., same hint bar wording, same cursor style).
  - Widen the left column or make the split ratio configurable so long setting names are not truncated.
  - Explore merging the config into `settings.json` under a namespaced key, while still showing the resolved path in the detail pane for transparency.
  - Consider a collapsible folder mechanism in the left column to support scaling to many settings categories.

---

## Overall recommendations (cross-example)

- **Search is non-negotiable**: every settings panel should preserve live search in the input bar — it is the fastest way to locate a setting.
- **Adopt a consistent base design**: extension settings panels should extend the native `pi` settings panel rather than invent new UI paradigms; divergence increases cognitive load.
- **Single source of truth for config**: consolidate all settings (native + extension) under `settings.json` with namespaced keys (e.g., `extensions:settings.<name>.<key>`); dedicated per-extension files hurt discoverability.
- **Rich detail without clutter**: a split-pane or tooltip approach (like `pi-tool-display`) is effective for surfacing multi-line descriptions — consider adopting this pattern natively while keeping the left column clean.
- **Scalability via folders**: as the number of extensions and settings grows, a flat list becomes unusable; introduce collapsible category/extension headers early.
- **Inline editing for non-boolean values**: replace value-cycling for text, numeric, and long-enum settings with a direct edit mode (prompt or inline input) to reduce errors.
- **Highlight changed defaults**: visually mark settings that differ from their default value to help users understand their configuration at a glance.

---

<sup>Documentation drafted with AI assistance — Claude Opus 4.6 (Anthropic). Reviewed by a human maintainer before publishing.</sup>
