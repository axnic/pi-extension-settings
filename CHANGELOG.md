# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-04-11

### Added

- Initial release.
- `/extensions:settings` slash command with a TUI panel: tree navigation, scoped search, inline editing, live save, and autocomplete.
- Type-safe SDK (`pi-extension-settings/sdk`): schema builders (`S.*`), the `ExtensionSettings<S>` accessor, and the `InferConfig<T>` type helper.
- 43 built-in hooks: 20 validators (`v.*`), 16 transforms (`t.*`), 2 completers (`c.*`), 5 display functions (`d.*`).
- Full SDK documentation under `sdk/docs/` (getting started, concepts, hooks, examples, reference).
- Design spec, schema analysis notes, and SDK internals under `docs/`.

---

<sup>Documentation drafted with AI assistance — Claude Opus 4.6 (Anthropic). Reviewed by a human maintainer before publishing.</sup>
