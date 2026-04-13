# Release Notes Examples

## Example 1 — Feature + fix + chore

### Input

```text
sha: a1b2c3d
subject: feat(sdk): Add S.struct() builder for nested object schemas
body: Enables typed nested objects within a settings schema without flattening keys.
author: Alice Martin (@alice)
pr: #38 (https://github.com/axnic/pi-extension-settings/pull/38)

---

sha: d4e5f6a
subject: fix(sdk): URL validator now accepts localhost without a TLD
body:
author: Bob Chen (@bob-chen)
pr: #45 (https://github.com/axnic/pi-extension-settings/pull/45)

---

sha: f7a8b9c
subject: chore(deps): Bump TypeScript to 5.5
body:
author: Alice Martin (@alice)
pr: #41 (https://github.com/axnic/pi-extension-settings/pull/41)
```

### Output

## What's new in v1.3.0

This release adds support for nested object schemas in the SDK settings API
and improves URL validation to work correctly in local development
environments. TypeScript users will benefit from stronger inference across
nested configuration structures.

### ▸ Changes

- ``✦ **sdk**: New `S.struct()` builder for typed nested object schemas`` ([#38](https://github.com/axnic/pi-extension-settings/pull/38) by [@alice](https://github.com/alice))
- ``✔ **sdk**: URL validator now accepts `localhost` and bare IP addresses`` ([#45](https://github.com/axnic/pi-extension-settings/pull/45) by [@bob-chen](https://github.com/bob-chen))
- `⚙ Bump TypeScript to 5.5` ([#41](https://github.com/axnic/pi-extension-settings/pull/41) by [@alice](https://github.com/alice))

### ◈ Contributors

Thanks to all the contributors to this release:

- [@alice](https://github.com/alice) ([#38](https://github.com/axnic/pi-extension-settings/pull/38), [#41](https://github.com/axnic/pi-extension-settings/pull/41))
- [@bob-chen](https://github.com/bob-chen) ([#45](https://github.com/axnic/pi-extension-settings/pull/45))

---

<sup>Release notes enhanced by [GitHub Copilot](https://github.com/features/copilot)</sup>

---

## Example 2 — Release candidate

### Input

```text
sha: b2c3d4e
subject: feat(ui): Add keyboard navigation to the settings panel
body: Arrow keys and Enter now navigate and confirm settings entries in the TUI.
author: Charlie Dupont (@charlie-d)
pr: #52 (https://github.com/axnic/pi-extension-settings/pull/52)

---

sha: e5f6a7b
subject: fix(core): Registry no longer overwrites entries on hot-reload
body:
author: Alice Martin (@alice)
pr: #50 (https://github.com/axnic/pi-extension-settings/pull/50)
```

### Output

## What's new in v1.3.0-rc.1

First release candidate for v1.3.0. This RC introduces keyboard navigation in
the settings panel and fixes a registry race condition that caused extensions
to lose their registered schemas on hot-reload.

### ▸ Changes

- `✦ **ui**: Keyboard navigation (↑ ↓ Enter) in the settings panel` ([#52](https://github.com/axnic/pi-extension-settings/pull/52) by [@charlie-d](https://github.com/charlie-d))
- `✔ **core**: Registry no longer overwrites entries on hot-reload` ([#50](https://github.com/axnic/pi-extension-settings/pull/50) by [@alice](https://github.com/alice))

### ◈ Contributors

Thanks to all the contributors to this release:

- [@charlie-d](https://github.com/charlie-d) ([#52](https://github.com/axnic/pi-extension-settings/pull/52))
- [@alice](https://github.com/alice) ([#50](https://github.com/axnic/pi-extension-settings/pull/50))

---

<sup>Release notes enhanced by [GitHub Copilot](https://github.com/features/copilot)</sup>
