# AGENTS.md

Context and instructions for AI coding agents working in this repository.

## Dev Environment

All dev tooling is managed via [mise](https://mise.run).

```sh
# Setup (run once after clone)
mise trust && mise install
npm install
mise run git:hooks        # install lefthook git hooks
```

Common commands (short aliases available — see `mise.toml`):

```sh
mise run lint             # run Biome + markdownlint in parallel
mise run lint:fix         # auto-fix all lint issues
mise run build            # compile extension to dist/ + compile SDK to sdk/dist/
mise run build:extension  # compile extension only (tsc -p tsconfig.json → dist/)
mise run build:sdk        # compile SDK only (sdk/tsconfig.json → sdk/dist/)
```

Linter configs: `biome.json` (TypeScript/JS), `.markdownlint.json` (Markdown), `.commitlintrc.js` (commit messages).

> **Extension build:** `tsconfig.json` at the repo root compiles `index.ts` + `src/` to `dist/`.
> During local development, pi loads `.ts` files directly and no build is needed.
> The compiled `dist/` is used for distribution and production deployments.
>
> **SDK build:** `sdk/tsconfig.json` compiles `sdk/src/` to `sdk/dist/`. The SDK is distributed
> as a package and must be compiled before publishing (`sdk/package.json` → `main: dist/index.js`).

## Testing

```sh
npm test                             # run full vitest suite (all spec files)
npm run test:watch                   # watch mode
npx vitest run src/ui/model.spec.ts  # run a single test file
npx vitest run --reporter=verbose    # verbose output
```

Test layout:

- `src/**/*.spec.ts` — extension internals (registry, storage, UI model/input)
- `sdk/src/**/*.spec.ts` — SDK hook unit tests (pure functions, no pi dependency)
- `src/selfuse.spec.ts` — dog-fooding integration test

Tests live beside the source they test (colocated). SDK hook tests cover pure functions; `src/ui/model.spec.ts` tests the reducer directly.

## Commit / PR Instructions

Commit format follows **Conventional Commits with a mandatory scope**:

```
type(scope): Subject
```

The scope is **required** and must be one of: `sdk`, `ui`, `core`, `settings`, `docs`, `deps`, `tooling`. The subject uses sentence case. The `commit-msg` git hook enforces this automatically (via `commitlint`). See `.commitlintrc.js` for the full ruleset.

Run `mise run lint:commitlint` to validate a commit message manually.

## Architecture

The repo has two independent, separately importable layers.

### Extension (`index.ts` + `src/`)

The pi extension itself, registered in pi via `~/.pi/agent/settings.json`. On startup it:

1. Clears the in-memory registry.
2. Emits `pi-extension-settings:ready` → consumer extensions respond with `pi-extension-settings:register` carrying their schema.
3. Stores all registered schemas in the `Registry` (`src/core/registry.ts`).
4. Registers the `/extensions:settings` slash command, which opens the TUI panel (`src/ui/panel.ts`).

Key files:

- **`index.ts`** — entry point; wires the event protocol.
- **`src/core/registry.ts`** — in-memory `Map<extensionName, SettingNode schema>`.
- **`src/core/storage.ts`** — reads/writes `~/.pi/agent/settings.json` (plain JSON, no encryption — never store secrets here). Also the shared boundary with the SDK layer.
- **`src/settings.ts`** — the extension's own schema, dog-fooded via the SDK.

### SDK (`sdk/`)

A standalone library — zero dependency on the panel internals — imported by consumer extensions as `pi-extension-settings/sdk`. Public surface is `sdk/index.ts`.

- **`sdk/src/core/schema.ts`** — `S.settings()` and node builders: `S.text()`, `S.number()`, `S.boolean()`, `S.enum()`, `S.list()`, `S.dict()`, `S.section()`, `S.struct()`.
- **`sdk/src/core/extension-settings.ts`** — `ExtensionSettings<S>` class with typed `get()`, `set()`, `onChange()`, `getAll()`. Types inferred via `InferConfig<S>`.
- **`sdk/src/core/nodes.ts`** — discriminated union of all setting node types (`text`, `number`, `boolean`, `enum`, `list`, `dict`, `section`), tagged with `_tag`.
- **`sdk/src/core/errors.ts`** — typed error classes.
- **`sdk/src/hooks/`** — 43 hook implementations (validators `v.*`, transforms `t.*`, completers `c.*`, display functions `d.*`), one file per hook family, each with a colocated `.spec.ts`.

### UI (`src/ui/`)

- `model.ts` — pure functional reducer; all state transitions are side-effect-free (cheap to unit-test).
- `panel.ts` — wires the model to the pi TUI API (`ctx.ui.custom`); emits `pi-extension-settings:changed` on save.
- `renderer.ts` — renders model state to an array of strings (one per line).
- `input.ts` — maps raw key sequences to model actions.
- `state.ts` / `keys.ts` — state types and key binding constants.

### Event Protocol (Extension ↔ SDK)

```
session_start (startup|reload)
  → extension clears registry
  → extension emits "pi-extension-settings:ready"
    → each ExtensionSettings instance responds with "pi-extension-settings:register" { extension, nodes }
      → registry.set(extension, nodes)
```

`ExtensionSettings` instances listen for `pi-extension-settings:changed` to fire `onChange` callbacks.

## Key Conventions

### Node types use `_tag` discriminated unions

Every `SettingNode` has a `_tag` field (`"text"`, `"number"`, `"boolean"`, `"enum"`, `"list"`, `"dict"`, `"section"`). Use `node._tag` or the `isLeafNode()` / `isSectionNode()` helpers for exhaustive switches. Never use `instanceof`.

### Dotted key paths for nested settings

The `.` character is reserved as a path separator. `settings.get("appearance.theme")` navigates `appearance` (Section) → `theme` (leaf). **Keys must never contain a literal `.`** — use kebab-case (`font-size`, `api-url`).

### `tooltip` vs `description`

Every node requires `tooltip` (≤ 128 chars, enforced at schema construction time). The optional `description` field accepts Markdown and is shown in a collapsible sidebar.

### Extension identifier

The second argument to `ExtensionSettings(pi, id, schema)` is the storage namespace. Renaming it orphans saved values.

### Public SDK exports

All public SDK symbols are re-exported from `sdk/index.ts`. When adding a new hook or builder, export it from there and add documentation under `sdk/docs/`.
