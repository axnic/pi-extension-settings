# Pi Extension Settings Panel

This document describes the design and implementation of the `/extensions:settings` command panel.

---

## Mockups

### 1 — Panel normal (sub-folders)

Tree characters (`├` `└` `│`) are always dim. `→` sits at the leftmost column. One space before the tree character at each level.

```
>

[-] pi-welcome
 ├ Gradient start    ■ #ff930f  •
 ├ Gradient end      ■ #fff95b
 └ Tips              3 tips configured  •
[-] pi-statusbar
 ├ Show model        true
 ├ Position          bottom
 ├ [-] Colors
 │  ├ Primary        ■ #3b82f6
 │  └ Accent         ■ #f59e0b  •
 └ [-] Layout
→    ├ Height        3
     └ Padding       2
[+] pi-proxy  (4 settings)
  (9/11 of 3 sections)

  Height of the status bar in terminal rows.
  Integer between 1 and 5.

  Type to search · Space collapse/expand · Enter to enter section · Esc to cancel
```

---

### 2 — Sub-sub-folder

```
>

[-] pi-ai-profiles
 ├ Default profile   work
 └ [-] Profiles
    ├ [+] work  (2 settings)
    └ [-] personal
→      ├ Model    claude-3-5-sonnet
       └ Temp     1.0  •
  (5/5 of 1 section)

  The model used for the personal profile.

  Type to search · Space collapse/expand · Enter to enter section · Esc to cancel
```

---

### 3 — Scoped search (inside a section)

Dim `(`, `)` around the section name. `→` enters scope; `Esc` exits one level.

```
> (pi-statusbar) height

[-] pi-statusbar
 └ [-] Layout
→    └ Height    3
  (1/1)

  Height of the status bar in terminal rows.
  Integer between 1 and 5.
  Scoped to pi-statusbar · Esc to exit scope

  Type to search · Space collapse/expand · Enter to edit/cycle · Esc to exit scope
```

---

### 4 — Scoped search (inside a sub-folder)

Breadcrumb grows one level at a time. `(`, `)`, `>` always dim.

```
> (pi-statusbar > Layout) height

[-] pi-statusbar
 └ [-] Layout
→    └ Height    3
  (1/1)

  Height of the status bar in terminal rows.
  Integer between 1 and 5.
  Scoped to pi-statusbar > Layout · Esc to exit scope

  Type to search · Space collapse/expand · Enter to edit/cycle · Esc to exit scope
```

---

### 5 — Enum cycling

`Enter` or `Space` cycles. All options shown inline; active option in `[brackets]` bold, others dim. No `←`/`→` used.

```
> (pi-statusbar)

[-] pi-statusbar
 ├ Show model        true
→├ Position          top  [bottom]  left  right
 ├ [-] Colors
 │  ├ Primary        ■ #3b82f6
 │  └ Accent         ■ #f59e0b  •
 └ [-] Layout
    ├ Height         3
    └ Padding        2
  (2/7)

  The position of the status bar on screen.
  Enter/Space to cycle options

  Enter/Space to cycle · Esc to cancel
```

---

### 6 — Text field with `display` hook (color)

The input bar shows the raw value being edited. The `display` function renders `■` in real time on the row as a valid hex is typed.

```
> (pi-statusbar > Colors) #3b00ff

[-] pi-statusbar
 └ [-] Colors
→    ├ Primary       ■ #3b00ff  •
     └ Accent        ■ #f59e0b  •
  (1/2)

  The primary color used across the status bar.
  ■ display updates as you type

  Enter to confirm · Esc to cancel
```

---

### 7 — Text field — validation valid

`✓` dim in tooltip line 2 when current input passes all validators.

```
> (pi-proxy) https://api.mycompany.com

[-] pi-proxy
→ └ Endpoint    https://api.mycompany.com
  (1/1)

  Base URL of the proxy server.
  ✓ valid URL

  Enter to confirm · Esc to cancel
```

---

### 8 — Text field — validation invalid

`✗` + reason in tooltip line 2. `Enter` is blocked while invalid.

```
> (pi-proxy) not a url

[-] pi-proxy
→ └ Endpoint    not a url
  (1/1)

  Base URL of the proxy server.
  ✗ must start with http:// or https://

  Enter to confirm · Esc to cancel
```

---

### 9 — Text field with autocomplete

Suggestions appear inline below the focused row (debounced 250ms). `↑`/`↓` navigate; `Tab` accepts; `Esc` dismisses without leaving edit.

```
> (pi-welcome) /Users/nico/

[-] pi-welcome
→ └ Config path    /Users/nico/
     /Users/nico/.pi/            ← focused, bold
     /Users/nico/.config/
     /Users/nico/Documents/
  (1/1)

  Path to the welcome panel configuration directory.
  ↑↓ navigate · Tab accept suggestion

  Enter to confirm · Esc cancel suggestions / Esc to cancel
```

---

### 10 — List (read state)

No tree characters inside list values — plain indented lines only.

```
> (pi-welcome)

[-] pi-welcome
 ├ Gradient start    ■ #ff930f  •
 ├ Gradient end      ■ #fff95b
→└ Tips
       /,        run command
       !,        run bash command
       /init,    initialise project
       ─────────────────────────────
       + Add another tip
  (3/3)

  Active tips shown in the welcome panel.
  ↑↓ navigate · Shift+↑↓ reorder (default) · d to delete (default) · Enter on [+] to add · Esc to exit list

  ↑↓ navigate · Shift+↑↓ reorder (default) · d delete (default) · Enter on [+] · Esc exit
```

---

### 11 — List (adding a new item)

`Tab`/`Shift-Tab` moves between fields. `Enter` on the last field confirms.

```
> (pi-welcome)

[-] pi-welcome
→└ Tips
       /,        run command
       !,        run bash command
       /init,    initialise project
       ─────────────────────────────
       command:     [/docs         ]
       description: [              ]
       ─────────────────────────────
       + Add another tip
  (3/3)

  Tab/Shift-Tab to switch field · Enter on last field to confirm · Esc to cancel

  Tab next field · Enter confirm · Esc cancel
```

---

### 12 — Dict / tuple (pi-shortcuts)

A `dict` is a list of key → value pairs. A tuple is a `list` with exactly two unnamed fields displayed side by side. No tree characters inside either.

```
> (pi-shortcuts)

[-] pi-shortcuts
→└ Bindings
       ctrl+k      /clear
       ctrl+r      /reset
       ctrl+p      /commands
       ─────────────────────────────
       + Add binding
  (3/3)

  Custom key bindings mapped to slash commands.
  ↑↓ navigate · Shift+↑↓ reorder (default) · d to delete (default) · Enter on [+] to add · Esc to exit list

  ↑↓ navigate · Shift+↑↓ reorder (default) · d delete (default) · Enter on [+] · Esc exit
```

---

## Precise Description

### Input Bar

- **Global mode**: live search; typing filters all settings across all sections and sub-folders.
- **Scoped mode**: dim breadcrumb `(section)` or `(section > sub-folder > ...)` to the left of the query. `(`, `)`, `>` always dim; names normal weight.
- **Inline edit mode**: the bar holds the raw value being edited. The `display` hook renders live on the row as the user types.
- **Control binding fields**: validation accepts only known key tokens; display renders `+` as dim `+` and hides a trailing `+`.
- `←`/`→` are **reserved for input bar cursor movement** and are never used for settings-level interactions.

### Section Headers and Folders

- `[-] name` (expanded) / `[+] name  (n settings)` (collapsed).
- Sub-folders follow the same syntax, one level deeper with a tree character from the parent.
- **Space** on a focused header: toggle collapse/expand (stays at the same scope level).
- **Enter** on a focused header: enter scope (scoped mode — hides peers, restricts search) and auto-expand that target.
- **Esc** in scoped mode (empty query): exit one scope level, restoring the previous collapse state for that level. Repeated `Esc` unwinds all levels; final `Esc` closes the panel.

### Tree Characters

- `├` before every row that has a sibling below it at the same level; `└` before the last row; `│` as vertical continuation when a `├`-parent has children below.
- **One space** before the tree character at each nesting level (not two).
- Each additional level adds the continuation prefix of its parent (`│` or spaces) plus one space before its own tree char.
- Applied at every nesting level: extension → folder → setting.
- Never applied inside `list` or `dict` values — items are plain indented lines.
- Always `dim`.
- `→` sits at column 0, before the tree character. The tree character remains visible.

### Settings Rows

- Layout: `→ ├ label        displayed-value  •`
- `•` in `accent` when value differs from declared default.
- `→` in `accent` on the focused row.
- `Enter` is the single action key — behavior depends on type.

### Scoped Search

- Entering a section/folder hides all peer sections; search is restricted to the active scope.
- Breadcrumb: `(section)` or `(section > folder > ...)` — all punctuation dim.
- Tooltip line 3: `Scoped to <path> · Esc to exit scope` while query is empty.
- `Esc` with an empty query exits one level at a time.

---

## Field Types

### `boolean`

- Displays `true` / `false`.
- `Enter` or `Space`: toggle (live save).

### `text`

- The only base input type. All specialisations (`color`, `path`, `url`, `number`, `duration`, …) are `text` fields with appropriate `validation`, `transform`, `complete`, and `display` hooks.
- Displays the raw stored value, or the output of `display(value)` if a display hook is provided.
- `Enter`: open inline edit (input bar pre-filled with raw stored value).

### `enum`

- Displays the current value. All options shown inline to the right: selected in `[brackets]` + bold, others dim.
- `Enter` or `Space`: cycle to next option (live save).

### `list`

- Setting row shows a summary `n items configured`.
- Expands inline below the row when focused; items are plain indented lines (no tree chars).
- `Enter` on the row: expand/collapse.
- Inside list: `↑`/`↓` navigate; `Shift-↑`/`Shift-↓` reorder (default binding); `d` delete (default binding, live save); `Enter` on `+ Add …` opens form.
- Form: one labeled input per declared `field`; `Tab`/`Shift-Tab` between fields; `Enter` on last field confirms (live save).

### `dict`

- A string → string dictionary displayed as `key  value` pairs (no tree chars inside).
- Same gestures as `list`.
- `Enter` on an existing entry: opens inline edit for the value only (key is immutable after creation).

---

## Hooks: `validation`, `transform`, `complete`, `display`

These hooks attach to any `text` field (directly or inside a `list`/`dict` field definition).

| Hook         | Arity                   | When called                     | Purpose                                                               |
| ------------ | ----------------------- | ------------------------------- | --------------------------------------------------------------------- |
| `validation` | **array** `Validator[]` | as user types (150ms debounce)  | show `✓`/`✗` in tooltip; block `Enter` if any fail                    |
| `transform`  | **single** `Transform`  | on `Enter` confirm, before save | normalise the value (e.g. expand `~`, trim)                           |
| `complete`   | **single** `Completer`  | as user types (250ms debounce)  | supply autocomplete suggestions                                       |
| `display`    | **single** `DisplayFn`  | at render time                  | transform the stored value into a displayed string (e.g. prepend `■`) |

### `validation`

`(value: string) => { valid: boolean; reason?: string }`

- Multiple validators run in order; first failure wins.
- Valid: tooltip line 2 shows `✓ <reason>` (dim).
- Invalid: tooltip line 2 shows `✗ <reason>` (dim); `Enter` is blocked.

### `transform`

`(value: string) => string`

Runs after `Enter`, before write. The row displays the transformed value immediately. Example: `t.expandPath()` converts `~/` to the real home directory.

### `complete`

`(partial: string) => Promise<string[]>`

Called with the raw typed string. Suggestions appear as plain bold/dim lines below the focused row. `↑`/`↓` navigate; `Tab` accepts; `Esc` dismisses.

### `display`

`(value: string) => string`

Called at render time with the **stored** value. Returns the string shown in the panel (may include ANSI escape sequences). Does not affect the stored value or the inline edit bar.

Examples:

- `d.color()` — prepends `■` rendered in the hex color when valid, dim `■` otherwise.
- `d.path()` — substitutes `~` for the home directory for display (complementary to `t.expandPath()`).
- `d.badge(color)` — wraps the value in a fixed-color badge.

---

## Intentionally Unsupported

**Secrets and credentials must not be stored via `pi-extension-settings`.**

`settings.json` is a plain-text file that users frequently commit to dotfiles repositories. The extension settings panel has no encryption or masking layer. Extensions that require secrets must use environment variables, system keychain, or a dedicated secrets manager, and must document this requirement explicitly.

---

## Pagination Counter

- Global: `(n/total of m sections)` — dim.
- Scoped: `(n/total)` — reflects only the active scope.
- Inside a `list`/`dict`: `(n items)`.

---

## Tooltip Area (2–3 lines)

- **Line 1**: Short description (normal).
- **Line 2**: Validation result (`✓`/`✗ reason`), type hint, or gesture hint — dim.
- **Line 3**: Scope indicator or modified-marker note — dim. Hidden when irrelevant.
- Inline edit with autocomplete: line 2 shows `↑↓ navigate · Tab accept suggestion`.

---

## Hint Bar

| Mode              | Hint                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------- |
| Global            | `Type to search · Space collapse/expand · Enter to enter section · Esc to cancel`         |
| Scoped            | `Type to search · Space collapse/expand · Enter to edit/cycle · Esc to exit scope`        |
| Inline edit       | `Enter to confirm · Esc to cancel`                                                        |
| Autocomplete open | `Enter to confirm · Esc cancel suggestions / Esc to cancel`                               |
| Enum cycling      | `Enter/Space to cycle · Esc to cancel`                                                    |
| List / dict       | `↑↓ navigate · Shift+↑↓ reorder (default) · d delete (default) · Enter on [+] · Esc exit` |
| Add form          | `Tab next field · Enter confirm · Esc cancel`                                             |

All dim.

---

## Color & Styling

| Element                           | Token      | Style  |
| --------------------------------- | ---------- | ------ |
| `[+]`/`[-]` markers               | `accent`   | normal |
| Section / folder header name      | `accent`   | bold   |
| Collapsed count `(n settings)`    | `dim`      | normal |
| Tree chars `├` `└` `│`            | `dim`      | normal |
| Active row indicator `→`          | `accent`   | normal |
| Setting name                      | foreground | normal |
| Setting value (raw or displayed)  | foreground | normal |
| Modified marker `•`               | `accent`   | normal |
| Enum option (unselected)          | `dim`      | normal |
| Enum option (selected) `[…]`      | foreground | bold   |
| Enum brackets                     | `accent`   | normal |
| Validation `✓`                    | dim green  | normal |
| Validation `✗ reason`             | dim red    | normal |
| Autocomplete suggestion (focused) | foreground | bold   |
| Autocomplete suggestion (other)   | `dim`      | normal |
| List separator `─────`            | `dim`      | normal |
| List add action `+ Add …`         | `dim`      | normal |
| Scoped breadcrumb `(` `)` `>`     | `dim`      | normal |
| Scoped breadcrumb names           | foreground | normal |
| Inline edit value (in bar)        | foreground | normal |
| Tooltip line 1                    | foreground | normal |
| Tooltip lines 2–3                 | `dim`      | normal |
| Pagination counter                | `dim`      | normal |
| Hint bar                          | `dim`      | normal |

---

## Layout

- Full-width flat panel — same mounting point as native `/settings`.
- No outer border.
- **One space** before the tree character at level 1; each additional level prepends the parent's continuation prefix (`│` or ``) plus one space.
- List/dict items indented flush with their parent tree char + 4 spaces (no tree chars).
- Autocomplete suggestions inline below the focused row (push other rows down temporarily).
- Tooltip: 3-line fixed block below the list, separated by a blank line.
- Hint bar: last line, separated from the tooltip by a blank line.
- Minimum usable width: 60 chars; values truncated with `…`.

---

## Configuration (via `settings.json`)

Settings are stored under the `extensions` key in pi's `settings.json`. Nested groups use dot-notation keys.

```json
{
  "extensions": {
    "pi-welcome": {
      "gradient-from": "#ff930f",
      "gradient-to": "#fff95b",
      "tips": [
        { "command": "/", "description": "run command" },
        { "command": "!", "description": "run bash command" },
        { "command": "/init", "description": "initialise project" }
      ]
    },
    "pi-statusbar": {
      "show-model": "true",
      "position": "bottom",
      "colors.primary": "#3b82f6",
      "colors.accent": "#f59e0b",
      "layout.height": "3",
      "layout.padding": "2"
    }
  }
}
```

All scalar values are stored as strings. `list` and `dict` values are stored as JSON arrays/objects. Type coercion is handled by the SDK.

---

## pi-welcome settings

| id              | type                                  | default       | Description                                                      |
| --------------- | ------------------------------------- | ------------- | ---------------------------------------------------------------- |
| `gradient-from` | `text` + `v.hexColor()` + `d.color()` | `#ff930f`     | Logo gradient start color                                        |
| `gradient-to`   | `text` + `v.hexColor()` + `d.color()` | `#fff95b`     | Logo gradient end color                                          |
| `tips`          | `list`                                | built-in list | Tips shown in the welcome panel (command + description per item) |

---

## Behavior

### Opening

- Command: `/extensions:settings`
- Replaces the footer input area (same mount point as `/settings`).
- All extensions and folders start expanded by default.
- Search mode is active by default.
- In search mode, `↑`/`↓` do nothing.
- `Esc` exits search mode; `/` re-enters search mode where you left the query/cursor.
- Startup mode is configurable via `Behavior > Start in search mode`.
- Entering a scope auto-expands that target section/folder.
- Esc restores the previous collapse state level-by-level (nested scopes restore in reverse order).

### Navigation

| Key                                  | Action                                            |
| ------------------------------------ | ------------------------------------------------- |
| `↑` / `↓`                            | Move focus between visible rows (navigation mode) |
| `Esc` in search mode                 | Leave search mode                                 |
| `/` in navigation mode               | Re-enter search mode (preserve query/cursor)      |
| `Enter` in search mode               | No action                                         |
| `Space` on a header / folder         | Toggle collapse/expand                            |
| `Enter` on a section / folder header | Enter scope                                       |
| `Esc` in navigation + scoped mode    | Exit one scope level                              |
| `Esc` in navigation + global mode    | Close the panel                                   |
| `Enter` / `Space` on `boolean`       | Toggle (live save)                                |
| `Enter` / `Space` on `enum`          | Cycle to next option (live save)                  |
| `Enter` on `text`                    | Open inline edit                                  |
| `Enter` on `list` / `dict` row       | Expand / collapse                                 |
| `↑` / `↓` inside expanded list       | Navigate items                                    |
| `r` (default)                        | Reset focused setting to default (live save)      |
| `Shift+Space` (default)              | Collapse all visible sections                     |
| `Shift-↑` / `Shift-↓` on a list item | Reorder (live save, default binding)              |
| `d` on a list item                   | Delete (live save, default binding)               |
| `Enter` on `+ Add …`                 | Open new-item form                                |
| `Tab` / `Shift-Tab` in add form      | Move between fields                               |
| `Enter` on last add-form field       | Confirm new item (live save)                      |
| `↑` / `↓` when autocomplete open     | Navigate suggestions                              |
| `Tab` when autocomplete open         | Accept focused suggestion                         |
| `Esc` when autocomplete open         | Dismiss suggestions (stay in edit)                |
| `Enter` in inline edit (valid)       | Run `transform`, write, live save                 |
| `Esc` in inline edit                 | Cancel, restore previous value                    |
| `←` / `→`                            | Input bar cursor movement **only**                |
| typing                               | Filter (search mode) / edit value (inline edit)   |

### Live Save

Every confirmed change is written to `settings.json` under `extensions:settings.<name>.<id>` immediately. `transform` runs before write. `•` updates instantly. The `onChange` callbacks registered by the owning extension fire synchronously.

---

## Implementation Notes

### `ExtensionSettings` class — overview

The `ExtensionSettings` class is the single entry point for consumer extensions. It:

1. Takes the schema at construction time.
2. Registers a listener for `pi-extension-settings:ready` on `pi.events` — fired by `pi-extension-settings` after `session_start` (reason `startup` or `reload`), at which point all extensions are guaranteed to be loaded.
3. Responds to `ready` by emitting `pi-extension-settings:register` with the built `SettingNode[]`.
4. Exposes typed `get`, `set`, `onChange`, `getAll` methods backed by `settings.json`.

`session_start` fires only after the full extension stack is loaded, so every `pi-extension-settings:ready` listener is guaranteed to be registered before the event fires — regardless of the order extensions appear in `packages`.

---

### Async registration — ready / register flow

```
Load phase (sequential, order = packages array)
────────────────────────────────────────────────────────────────────────────
A (pi-extension-settings) loads:
  pi.events.on("pi-extension-settings:register", handler)   ← ready to receive
  pi.on("session_start", sessionStartHandler)               ← will emit ready

B (pi-welcome) loads:
  new ExtensionSettings(pi, "pi-welcome", schema)
  → pi.events.on("pi-extension-settings:ready", readyHandler)

C (pi-statusbar) loads:
  new ExtensionSettings(pi, "pi-statusbar", schema)
  → pi.events.on("pi-extension-settings:ready", readyHandler)

D (pi-proxy) loads:
  new ExtensionSettings(pi, "pi-proxy", schema)
  → pi.events.on("pi-extension-settings:ready", readyHandler)

────────────────────────────────────────────────────────────────────────────
Runtime — session_start fires (all extensions are loaded)
────────────────────────────────────────────────────────────────────────────
A.sessionStartHandler:
  if reason === "startup" || reason === "reload":
    registry.clear()
    pi.events.emit("pi-extension-settings:ready", {})   ← single broadcast

→ B.readyHandler fires → pi.events.emit("pi-extension-settings:register", { extension: "pi-welcome",   nodes })
→ C.readyHandler fires → pi.events.emit("pi-extension-settings:register", { extension: "pi-statusbar", nodes })
→ D.readyHandler fires → pi.events.emit("pi-extension-settings:register", { extension: "pi-proxy",     nodes })

→ A.registerHandler fires 3× → registry populated

when user opens /extensions:settings:
  registry is already built → UI renders immediately
```

Key properties of this design:

- **No load-order dependency**: `session_start` fires after the full extension stack is loaded; all `ready` listeners are registered by then.
- **Registry rebuilt on reload**: `reason === "reload"` triggers a fresh `ready` broadcast, so `/reload` keeps the registry in sync.
- **Command is trivially simple**: it reads from an already-populated registry, no collection needed at invocation time.

---

### Schema builders (`S.*`)

Inspired by `@sinclair/typebox`: a fluent DSL that builds typed `SettingNode[]` and lets TypeScript infer the configuration shape.

```ts
import { S, v, t, c, d } from "@pi/extension-settings";

const schema = S.settings({
  "gradient-from": S.text({
    label: "Gradient start color",
    description: "The hex color where the logo gradient begins.",
    default: "#ff930f",
    validation: [v.hexColor()],
    display: d.color(),
  }),

  "gradient-to": S.text({
    label: "Gradient end color",
    description: "The hex color where the logo gradient ends.",
    default: "#fff95b",
    validation: [v.hexColor()],
    display: d.color(),
  }),

  tips: S.list({
    label: "Tips",
    addLabel: "Add another tip",
    default: [
      { command: "/", description: "run command" },
      { command: "!", description: "run bash command" },
      { command: "/init", description: "initialise project" },
    ],
    fields: {
      command: S.text({ label: "command", validation: [v.notEmpty()] }),
      description: S.text({ label: "description" }),
    },
  }),

  // Group (sub-folder in the panel)
  appearance: S.group("Appearance", {
    theme: S.enum({
      label: "Theme",
      default: "dark",
      values: ["dark", "light", "system"],
    }),
    "font-size": S.text({
      label: "Font size",
      default: "14",
      validation: [v.integer({ min: 8, max: 32 })],
    }),
  }),
});

// Inferred type — used by `get()` return types:
// type Config = InferConfig<typeof schema>
// {
//   "gradient-from": string,
//   "gradient-to":   string,
//   "tips":          Array<{ command: string; description: string }>,
//   "appearance.theme":     string,
//   "appearance.font-size": string,
// }
```

Nested group keys are flattened with dot notation in both the inferred type and `settings.json`.

---

### `ExtensionSettings` class — usage

```ts
import { ExtensionSettings, S, v, d } from "@pi/extension-settings";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const schema = S.settings({
  /* ... */
});

export default function piWelcome(pi: ExtensionAPI) {
  // Construction registers the collect listener and wires settings.json I/O.
  const settings = new ExtensionSettings(pi, "pi-welcome", schema);

  // get() return type inferred from schema — string here
  const from = settings.get("gradient-from"); // "#ff930f"
  const tips = settings.get("tips"); // Array<{ command, description }>

  // Write (runs transform if declared, persists to settings.json)
  settings.set("gradient-from", "#ff4400");

  // Subscribe to changes triggered by the settings panel
  settings.onChange("gradient-from", (value) => {
    rerender(value);
  });

  // Get the full configuration snapshot
  const all = settings.getAll();
}
```

Internally, the constructor wires the registration flow:

```ts
constructor(pi: ExtensionAPI, extension: string, schema: S) {
  // Registers once; fires when pi-extension-settings emits "ready"
  // (i.e. after session_start with reason "startup" or "reload")
  pi.events.on("pi-extension-settings:ready", () => {
    pi.events.emit("pi-extension-settings:register", {
      extension,
      nodes: buildNodes(schema),
    });
  });
}
```

`ExtensionSettings<S>` interface:

```ts
class ExtensionSettings<S extends ReturnType<typeof S.settings>> {
  constructor(pi: ExtensionAPI, extension: string, schema: S);

  get<K extends keyof InferConfig<S>>(key: K): InferConfig<S>[K];
  set<K extends keyof InferConfig<S>>(key: K, value: InferConfig<S>[K]): void;
  onChange<K extends keyof InferConfig<S>>(
    key: K,
    cb: (value: InferConfig<S>[K]) => void,
  ): void;
  getAll(): InferConfig<S>;
}
```

`onChange` listeners are session-scoped and require no explicit cleanup in typical usage.

`pi-extension-settings` side (for reference):

````ts
export default function(pi: ExtensionAPI) {
  const registry = new Map<string, SettingNode[]>();

  pi.events.on("pi-extension-settings:register", (data) => {
    registry.set(data.extension, data.nodes);
  });

  pi.on("session_start", async (event) => {
    if (event.reason === "startup" || event.reason === "reload") {
      registry.clear();
      pi.events.emit("pi-extension-settings:ready", {});
    }
  });

  pi.registerCommand("extensions:settings", {
    handler: async (_args, ctx) => {
      if (registry.size === 0) {
        ctx.ui.notify("No extensions have registered settings.", "info");
        return;
      }
      // render UI from registry...
    },
  });
}

---

### `SettingNode` types

```ts
type SettingNode = TextNode | BooleanNode | EnumNode | ListNode | DictNode | GroupNode;

interface TextNode {
  _tag:         "text";
  label:        string;
  description?: string;
  default:      string;
  validation?:  Validator[];   // array — multiple allowed
  transform?:   Transform;     // single
  complete?:    Completer;     // single
  display?:     DisplayFn;     // single
}

interface BooleanNode {
  _tag:         "boolean";
  label:        string;
  description?: string;
  default:      boolean;
}

interface EnumNode {
  _tag:         "enum";
  label:        string;
  description?: string;
  default:      string;
  values:       Array<string | { value: string; label: string }>;
}

interface ListNode {
  _tag:         "list";
  label:        string;
  description?: string;
  addLabel?:    string;
  default:      Record<string, string>[];
  fields:       Record<string, TextNode | BooleanNode | EnumNode>;
}

interface DictNode {
  _tag:         "dict";
  label:        string;
  description?: string;
  addLabel?:    string;
  default:      Record<string, string>;
}

interface GroupNode {
  _tag:     "group";
  label:    string;
  children: Record<string, SettingNode>;
}

type Validator  = (value: string) => { valid: boolean; reason?: string };
type Transform  = (value: string) => string;
type Completer  = (partial: string) => Promise<string[]>;
type DisplayFn  = (value: string) => string;
````

---

### Pre-built validators (`v.*`)

```ts
import { v } from "@pi/extension-settings";

v.notEmpty()
v.hexColor()                       // #rrggbb or #rgb
v.url({ https?: boolean })
v.filePath({ exists?: boolean })
v.integer({ min?: number, max?: number })
v.float({ min?: number, max?: number })
v.duration()                       // "30s" | "5m" | "2h"
v.regex(pattern: RegExp, reason: string)
v.oneOf(values: string[])

// Composition
v.all(...validators: Validator[])  // all must pass
v.any(...validators: Validator[])  // at least one must pass
```

Custom validator: any function matching `(value: string) => { valid: boolean; reason?: string }`.

---

### Pre-built transforms (`t.*`)

```ts
import { t } from "@pi/extension-settings";

t.expandPath()    // ~/... → /home/...
t.trim()
t.lowercase()
t.uppercase()
t.normalizeUrl()  // add trailing slash, normalize protocol
t.pipe(...transforms: Transform[])  // compose in order
```

Custom transform: any function matching `(value: string) => string`.

---

### Pre-built completers (`c.*`)

```ts
import { c } from "@pi/extension-settings";

c.filePath()               // filesystem path (250ms debounce)
c.staticList(string[])     // fixed list filtered by prefix
```

Custom completer: any function matching `(partial: string) => Promise<string[]>`.

---

### Pre-built display functions (`d.*`)

```ts
import { d } from "@pi/extension-settings";

d.color()          // prepends ■ in the actual hex color; dim ■ if invalid
d.path()           // substitutes ~ for the home directory
d.badge(color: string)  // wraps value in a fixed-color inline badge
```

Custom display fn: any function matching `(value: string) => string`. May include ANSI escape sequences.

---

### Storage

- File: `settings.json` in `getAgentDir()`.
- Namespace: `extensions:settings.<extensionName>.<settingId>`.
- Group keys flattened with dot notation: `extensions:settings.pi-statusbar.colors.primary`.
- Scalar → string. `list` / `dict` → JSON array / object under the same key.
- `pi-extension-settings` reads and writes only the `extensions:settings` namespace.

---

<sup>Documentation drafted with AI assistance — Claude Opus 4.6 (Anthropic). Reviewed by a human maintainer before publishing.</sup>
