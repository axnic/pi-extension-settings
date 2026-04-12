<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/banner.dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="docs/assets/banner.light.png" />
    <img src="docs/assets/banner.light.png" width="1100" alt="pi-extension-settings banner" />
  </picture>
</p>

<h1 align="center">pi-extension-settings</h1>

<p align="center">
  A centralized settings panel and type-safe SDK for pi extensions.
</p>

<p align="center">
  <a href="./sdk/docs/README.md">Documentation</a> ·
  <a href="./sdk/docs/getting-started.md">Getting started</a> ·
  <a href="./sdk/docs/examples/README.md">Examples</a> ·
  <a href="./sdk/docs/reference/api.md">SDK reference</a>
</p>

---

- [Why](#why)
- [Features](#features)
- [Install](#install)
- [UI — the settings panel](#ui--the-settings-panel)
- [For extension authors](#for-extension-authors)
- [Documentation](#documentation)
- [Project layout](#project-layout)
- [Contributing](#contributing)
- [License](#license)

---

## Why

Every pi extension eventually needs settings. Without a shared framework, each one re-invents storage, validation, UI, and change listeners — and the TypeScript types drift from the on-disk format over time.

`pi-extension-settings` solves this once. You declare a schema; the framework gives you typed accessors, validation, a rendered TUI panel, and live change events.

No UI code. No custom storage. No hand-rolled types.

## Features

### For users

- **Unified settings panel** — Browse and edit settings from all installed extensions in one place. Open it with `/extensions:settings`.
- **Keyboard-first** — Navigate, search, inline-edit, reorder, and delete without leaving the keyboard.
- **Live save** — Every confirmed edit persists immediately, and other extensions react in real time.

### For extension authors

- **Type-safe accessors** — `ExtensionSettings<S>` exposes `get()`, `set()`, `onChange()`, and `getAll()`, all inferred from your schema at compile time.
- **Declarative schema builders** — One call to `S.settings({...})` covers defaults, validation, transforms, autocompletion, and display format — per setting.
- **Rich node types** — Text, Number, Boolean, Enum, List (structured rows), Dict (key/value maps), and nestable Sections.
- **43 built-in hooks** — validators (`v.*`), transforms (`t.*`), completers (`c.*`), and display functions (`d.*`), composable via `v.all` / `v.any` / `t.pipe` / `t.compose`, and more.

## Install

Run one of the following from inside pi:

```sh
pi install npm:@alnic/pi-extension-settings      # recommended
pi install git:github.com/xunleii/pi-extension-settings@v0.0.1
```

> **Note** — The order of extensions in your `packages` list does not matter; pi resolves dependencies automatically.

> **Warning** — The `git:` install method has not been fully tested. Extensions that depend on this SDK require the npm package at runtime; the git install may not satisfy that requirement correctly.

Restart pi. The extension registers the `/extensions:settings` slash command on startup.

## UI — the settings panel

Open the panel with:

```text
/extensions:settings
```

The panel aggregates settings from every registered extension into a single tree view.

### Layout and navigation

```text
─────────────────────────────────────────────────────────────────────────────
>

→[-] pi-extension-settings
  ├ [-] behavior
  │  └ start-in-search-mode  false •
  └ [-] controls
     ├ reset-to-default      r
     ├ collapse-expand       space
     ├ collapse-all          shift + space
     ├ reorder-item-up       shift + up
     ├ reorder-item-down     shift + down
     └ delete-item           d
 [-] pi-welcome
  ├ gradient-from         ■ #ff930f
  ├ gradient-to           ■ #fff95b
  └ tips                  5 items configured

(10 settings · 2 sections)

[extension] pi-extension-settings (7 settings)

<space> collapse/expand · <enter> to enter section · </> search · <esc> cancel · <shift+space> collapse all
```

- `→` marks the current cursor position; use `↑`/`↓` to move.
- `•` next to a value means it differs from the schema default (modified).
- `space` — collapse or expand a section.
- `enter` on a section header — scope the view to that extension only; `esc` to return.
- `/` — open search; results filter and highlight as you type.
- `r` — reset the selected setting to its default.
- `d` — delete an item from a list or dict.

### Inline validation

Editors validate on every keystroke. A failing validation blocks the save and shows the reason inline:

```text
→  api-url  https://not a url█
            ✖ must be a valid URL
```

A passing edit saves immediately on `enter` and the cursor returns to the tree.

---

A short asciinema demo showing navigation, inline editing, and list operations will be available in `docs/` once recorded.

## For extension authors

### Getting started

Add `pi-extension-settings` as a peer dependency in your `package.json` — it is provided at runtime by the installed extension, but you need it locally for types and SDK imports during development:

```json
{
  "peerDependencies": {
    "pi-extension-settings": "*"
  },
  "devDependencies": {
    "pi-extension-settings": "*"
  }
}
```

Then declare a schema and instantiate `ExtensionSettings`:

```ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { ExtensionSettings, S, v, t } from "pi-extension-settings/sdk";

const schema = S.settings({
  "api-url": S.text({
    tooltip: "API base URL",
    default: "https://api.example.com",
    validation: v.url(true),
    transform: t.normalizeUrl(),
  }),
  theme: S.enum({
    tooltip: "Color theme",
    default: "dark",
    values: ["dark", "light", "system"],
  }),
  enabled: S.boolean({
    tooltip: "Enable extension",
    default: true,
  }),
});

export default function myExtension(pi: ExtensionAPI) {
  const settings = new ExtensionSettings(pi, "my-extension", schema);

  // Fully typed reads — type inferred from the schema.
  const url = settings.get("api-url"); // string
  const on = settings.get("enabled"); // boolean

  // Fully typed write — transform runs before save.
  settings.set("theme", "light");

  // React to user edits made from the panel (or programmatic set() calls).
  settings.onChange("theme", (next) => applyTheme(next));
}
```

The settings panel UI is generated from your schema automatically — no UI code required.

### Guidelines

> **Keys must not contain `.`** — dots are reserved for section path separators (e.g. `appearance.theme` is the key `theme` inside the `appearance` section). Use kebab-case for multi-word keys (`api-url`, `font-size`).

> **Use a stable extension identifier** — the string passed as the second argument to `ExtensionSettings` is your storage namespace. Renaming it strands previously saved values.

> **Do not store secrets** — `~/.pi/agent/settings.json` is plain text. Use environment variables or a system keychain for API keys and tokens.

> **Keep tooltips short** — the 128-character limit is enforced at schema construction time (`S.settings()` throws immediately). Use the `description` field for longer Markdown documentation.

### Further reading

The SDK documentation covers everything else in depth:

| Topic                                                | Page                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Full Getting Started walkthrough                     | [sdk/docs/getting-started.md](./sdk/docs/getting-started.md)                         |
| All node types (`S.*`)                               | [sdk/docs/concepts/schema-builder.md](./sdk/docs/concepts/schema-builder.md)         |
| Lifecycle, `get` / `set` / `onChange` / `getAll`     | [sdk/docs/concepts/extension-settings.md](./sdk/docs/concepts/extension-settings.md) |
| All 43 hooks (`v.*`, `t.*`, `c.*`, `d.*`)            | [sdk/docs/hooks/README.md](./sdk/docs/hooks/README.md)                               |
| Progressive examples (weather widget → AI assistant) | [sdk/docs/examples/README.md](./sdk/docs/examples/README.md)                         |
| Full API reference                                   | [sdk/docs/reference/api.md](./sdk/docs/reference/api.md)                             |

## Documentation

| Resource                                      | Audience          | What's inside                                                              |
| --------------------------------------------- | ----------------- | -------------------------------------------------------------------------- |
| [SDK guide](./sdk/docs/README.md)             | Extension authors | Getting started, concepts, hooks, and the full API reference               |
| [SDK examples](./sdk/docs/examples/README.md) | Extension authors | Three progressive examples: weather widget → code formatter → AI assistant |
| [API reference](./sdk/docs/reference/api.md)  | Extension authors | Every exported symbol with its signature                                   |
| [Hooks reference](./sdk/docs/hooks/README.md) | Extension authors | All 43 validators, transforms, completers, and display functions           |
| [Design spec](./docs/DESIGN.md)               | Contributors      | Panel architecture, mockups, and behavior specs                            |
| [Schema analysis](./docs/ANALYZE.md)          | Contributors      | Runtime schema introspection API                                           |
| [SDK internals](./docs/SDK.md)                | Contributors      | Event protocol, registry, storage layer                                    |

## Project layout

```text
pi-extension-settings/
├── index.ts                   Extension entry point (command + event wiring)
├── sdk/
│   ├── index.ts               Public SDK surface
│   ├── docs/                  Full SDK documentation
│   ├── examples/              Runnable example extensions
│   └── src/
│       ├── core/              Schema, ExtensionSettings, nodes, errors
│       └── hooks/             43 hook implementations
├── src/
│   ├── settings.ts            Own-settings schema (dog-fooding the SDK)
│   ├── core/                  Registry and storage
│   └── ui/                    Panel, model, renderer, input, state
└── docs/                      Banner, design spec, SDK internals
```

The repository is split into two distinct layers:

- **Extension** (`index.ts`, `src/`) — the pi extension itself. It registers the `/extensions:settings` slash command, owns the TUI panel, and manages the central registry that aggregates schemas from all participating extensions.
- **SDK** (`sdk/`) — the public library that other extensions import. It is completely independent of the panel; it exposes the schema builders, the `ExtensionSettings` accessor, and all 43 hooks. The SDK communicates with the extension at runtime via pi's event bus.

This separation means you can use the SDK in your extension without caring about how the panel is implemented — and the panel can evolve without breaking the SDK's public API.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for local setup, how to register the extension with pi during development, and how to run the tests.

## License

Apache 2.0 — see [LICENSE](./LICENSE).

---

<sup>This project was vibe-coded with AI assistance (Claude, GPT-5, Gemmini) and reviewed by the maintainer before publishing.</sup>
