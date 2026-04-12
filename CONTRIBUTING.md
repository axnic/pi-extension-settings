# Contributing

Thanks for your interest in `pi-extension-settings`. This guide covers local
development, how to exercise the extension inside pi, and how to run the tests.

## Prerequisites

- A working [pi](https://github.com/nicobailon/pi-mono) install at `~/.pi/agent/`
- [mise](https://mise.run) — manages the Node runtime and all dev tools
- Node.js 24 or newer (installed automatically via mise)

> **Why mise?** It pins the exact versions of Node and every linting tool used
> in this project, so `mise install` gives every contributor an identical
> environment without touching the system Node or relying on global npm installs.

## Set up locally

```sh
# Clone into pi's extensions directory (or symlink your dev checkout there)
cd ~/.pi/agent/extensions
git clone <your-fork-url> pi-extension-settings
cd pi-extension-settings

# Trust the mise config and install all pinned tools (Node, Trunk, markdownlint)
mise trust
mise install

# Install pnpm dependencies (workspace: root + sdk)
pnpm install
```

## Tooling (mise)

All dev tasks are declared in `mise.toml`. Run `mise tasks` to list them.
The most useful ones:

| Command             | Alias | What it does                                     |
| ------------------- | ----- | ------------------------------------------------ |
| `mise run lint`     | `l`   | Run all linters in parallel                      |
| `mise run lint:fix` | `lf`  | Auto-fix all lint issues in parallel             |
| `mise run build`    | `b`   | Type-check extension + compile SDK (always runs) |

Individual tasks when you only want a specific build target:

| Command                    | Alias | What it does                     |
| -------------------------- | ----- | -------------------------------- |
| `mise run build:extension` | `be`  | Type-check the extension only    |
| `mise run build:sdk`       | `bs`  | Compile SDK to `sdk/dist/` only  |
| `mise run lint:commitlint` | `lc`  | Validate the last commit message |

Tasks with `sources` configured are **incremental**: mise skips them when the
relevant files have not changed since the last run. The meta `build` task has
no source tracking and always runs — use it as a reliable "did everything
compile?" check.

### Linter configuration

| File           | Linter | Scope                                       |
| -------------- | ------ | ------------------------------------------- |
| .trunk/configs | Trunk  | Trunk-managed linters and formatter configs |

## Register the extension with pi

Add the extension path to the `packages` array in `~/.pi/agent/settings.json`.
It must appear **before** any extension that consumes its SDK:

```json
{
  "packages": [
    "./extensions/pi-extension-settings",
    "./extensions/some-other-extension"
  ]
}
```

## Reload pi

Restart the pi agent so it picks up the newly registered package and re-emits
the extension lifecycle events. Any running session must be restarted.

## Exercise the panel

Inside pi, run:

```text
/extensions:settings
```

This opens the TUI panel. Use it to verify your changes against a real
extension surface:

- **Navigation:** `↑`/`↓`, `Enter` on a section to scope the view, `Esc` to exit the scope.
- **Search:** `/` then type to filter.
- **Edit:** `Enter` on a setting, `Enter` to confirm, `Esc` to cancel.
- **Reset a value:** `r` (configurable via the panel's own Controls section).

## Run the tests

```sh
pnpm test
```

This runs the [vitest](https://vitest.dev) suite. The layout is:

- `src/**/*.spec.ts` — extension internals (settings, registry, UI reducers, self-use).
- `sdk/src/**/*.spec.ts` — SDK hook tests (validators, transforms, display functions, composition).

When you add a feature or fix a bug, add a test alongside the code change. The
SDK hooks are pure functions — prefer unit tests there. The UI layer has a
functional reducer (`src/ui/model.ts`) that is also cheap to test directly.

## Style

- TypeScript, ES modules.
- No build step — pi loads `.ts` files directly.
- Formatting and linting are handled by Trunk (.trunk/configs). Run
  `mise run lint:fix` before pushing to auto-fix most issues.
- Public SDK exports live in `sdk/index.ts`. If you add a new hook or builder,
  export it from there and document it under `sdk/docs/`.

## Writing a change

1. Branch from `main`.
2. Keep commits focused and self-contained.
3. Run `mise run lint` and `pnpm test` before pushing.
4. Open a pull request with a short description of the change and any manual
   testing steps.

## Reporting bugs

Open an issue with:

- pi version
- Node version
- A minimal schema or panel action that reproduces the issue
- Expected vs. actual behavior

---

<sup>Documentation drafted with AI assistance — Claude Opus 4.6 (Anthropic). Reviewed by a human maintainer before publishing.</sup>
