# Concepts

The SDK is built around three core abstractions that work together:

## Schema Builder (`S`)

The `S` namespace contains fluent builder functions that construct typed setting node definitions. You call `S.settings({...})` once at module level to define your extension's entire settings surface.

[Read more →](./schema-builder.md)

## Node Types

Nodes are the building blocks of a schema. Each node type maps to a specific UI control in the settings panel and carries its own configuration options (default value, validation, display, etc.).

| Node      | UI control        | Value type               |
| --------- | ----------------- | ------------------------ |
| `Text`    | Text input        | `string`                 |
| `Number`  | Numeric input     | `number`                 |
| `Boolean` | Toggle            | `boolean`                |
| `Enum`    | Cycling selector  | `string`                 |
| `List`    | Growable table    | `ListItem[]`             |
| `Dict`    | Key/value editor  | `Record<string, string>` |
| `Section` | Collapsible group | _(container)_            |

[Read more →](./node-types.md)

## ExtensionSettings

`ExtensionSettings` is the runtime accessor. It wraps the schema, handles registration with the pi settings panel, and exposes typed `get()`, `set()`, `onChange()`, and `getAll()` methods.

[Read more →](./extension-settings.md)

---

<sup>Documentation drafted with AI assistance — Claude Opus 4.6 (Anthropic). Reviewed by a human maintainer before publishing.</sup>
