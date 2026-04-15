# API Reference

Complete list of symbols exported from the SDK public entry points.

```ts
import { S, ExtensionSettings } from "pi-extension-settings/sdk";
import { v, t, c, d } from "pi-extension-settings/sdk/hooks";
```

---

## Core classes

### `ExtensionSettings<S>`

The primary runtime accessor. Wraps a schema, registers with the pi settings panel, and provides typed read/write/subscribe methods.

```ts
class ExtensionSettings<S extends Record<string, SettingNode>> {
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

See [ExtensionSettings](../concepts/extension-settings.md) for full documentation.

---

## Schema builder (`S`)

The `S` namespace contains all schema builder functions.

| Function          | Returns   | Description                                             |
| ----------------- | --------- | ------------------------------------------------------- |
| `S.settings(def)` | `T`       | Entry point. Validates the schema and returns it typed. |
| `S.text(opts)`    | `Text`    | Free-form string input node.                            |
| `S.number(opts)`  | `Number`  | Numeric input node (returns a native JS `number`).      |
| `S.boolean(opts)` | `Boolean` | Toggle node.                                            |
| `S.enum(opts)`    | `Enum`    | Cycling selector node.                                  |
| `S.list(opts)`    | `List`    | Growable list of structured items.                      |
| `S.dict(opts)`    | `Dict`    | String → string dictionary.                             |
| `S.section(opts)` | `Section` | Collapsible group of child nodes.                       |
| `S.struct(opts)`  | `Struct`  | Item shape descriptor for `S.list`.                     |

See [Schema Builder](../concepts/schema-builder.md) for full documentation.

---

## Validators (`v`)

The `v` namespace contains validator factory functions. All return `ValidationFn<T>`.
Import from `pi-extension-settings/sdk/hooks`.

### General

| Function                   | Description                              |
| -------------------------- | ---------------------------------------- |
| `v.notEmpty()`             | Reject empty or whitespace-only strings. |
| `v.regex(pattern, reason)` | Test against a regular expression.       |
| `v.oneOf(allowed)`         | Accept only values from an allowlist.    |

### Composition

| Function               | Description                       |
| ---------------------- | --------------------------------- |
| `v.all(...validators)` | All validators must pass.         |
| `v.any(...validators)` | At least one validator must pass. |

### File system

| Function              | Description                                        |
| --------------------- | -------------------------------------------------- |
| `v.filePath(exists?)` | Valid filesystem path; optionally check existence. |

### Numeric

| Function                  | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| `v.integer()`             | Must be an integer (no fractional part).               |
| `v.positive(allowZero?)`  | Positive number (> 0, or ≥ 0 with `allowZero`).        |
| `v.negative()`            | Strictly negative number (< 0).                        |
| `v.range({ min?, max? })` | Number within an inclusive range.                      |
| `v.percentage()`          | Value 0–1 (Number) or 0–100 (Text, with optional `%`). |

### URI / URL

| Function                 | Description                                          |
| ------------------------ | ---------------------------------------------------- |
| `v.uri(allowedSchemes?)` | RFC-3986-like URI, with optional scheme restriction. |
| `v.uriRFC()`             | Alias for `v.uri()`.                                 |
| `v.url(enforceHttps?)`   | HTTP/HTTPS URL using the built-in URL parser.        |

### Color

| Function             | Description                          |
| -------------------- | ------------------------------------ |
| `v.hexColor()`       | CSS hex color (`#rgb` or `#rrggbb`). |
| `v.rgbColor()`       | `rgb()` / `rgba()` notation.         |
| `v.hsvColor()`       | `hsv()` / `hsb()` notation.          |
| `v.hsbColor()`       | Alias for `v.hsvColor()`.            |
| `v.htmlNamedColor()` | CSS4 named color (148 colors).       |

### Keyboard

| Function         | Description                                                        |
| ---------------- | ------------------------------------------------------------------ |
| `v.keybinding()` | Keyboard binding string (e.g. `ctrl+k`). Suggests fixes for typos. |

See [Validators](../hooks/validators.md) for full documentation.

---

## Transforms (`t`)

The `t` namespace contains transform factory functions. All return `TransformFn`.
Import from `pi-extension-settings/sdk/hooks`.

### Composition

| Function                   | Description                |
| -------------------------- | -------------------------- |
| `t.pipe(...transforms)`    | Left-to-right composition. |
| `t.compose(...transforms)` | Right-to-left composition. |

### Text normalization

| Function         | Description                                 |
| ---------------- | ------------------------------------------- |
| `t.trim()`       | Remove leading/trailing whitespace.         |
| `t.lowercase()`  | Convert to lowercase.                       |
| `t.uppercase()`  | Convert to uppercase.                       |
| `t.capitalize()` | Capitalize first character, lowercase rest. |
| `t.titleCase()`  | Capitalize each word.                       |
| `t.camelCase()`  | Convert to camelCase.                       |
| `t.kebabCase()`  | Convert to kebab-case.                      |
| `t.snakeCase()`  | Convert to snake_case.                      |

### Path

| Function         | Description                       |
| ---------------- | --------------------------------- |
| `t.expandPath()` | Expand `~` to the home directory. |

### URL

| Function           | Description                                               |
| ------------------ | --------------------------------------------------------- |
| `t.normalizeUrl()` | Lowercase protocol/hostname; ensure trailing `/` on root. |

### Color → hex

| Function             | Description                                                    |
| -------------------- | -------------------------------------------------------------- |
| `t.rgbToHex()`       | Convert `rgb()` to `#rrggbb`; pass through otherwise.          |
| `t.hsvToHex()`       | Convert `hsv()` to `#rrggbb`; pass through otherwise.          |
| `t.hsbToHex()`       | Alias for `t.hsvToHex()`.                                      |
| `t.htmlNamedToHex()` | Convert CSS4 named color to `#rrggbb`; pass through otherwise. |

See [Transforms](../hooks/transforms.md) for full documentation.

---

## Completers (`c`)

The `c` namespace contains completer factory functions. All return `CompleteFn`.
Import from `pi-extension-settings/sdk/hooks`.

| Function               | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `c.filePath()`         | Filesystem path completion with `~` expansion.   |
| `c.staticList(values)` | Case-insensitive prefix match from a fixed list. |

See [Completers](../hooks/completers.md) for full documentation.

---

## Display functions (`d`)

The `d` namespace contains display function factories. All return `DisplayFn<T>`.
Import from `pi-extension-settings/sdk/hooks`.

| Function            | Description                                                          |
| ------------------- | -------------------------------------------------------------------- |
| `d.color()`         | Live truecolor swatch + value. Supports hex, rgb, hsv, named colors. |
| `d.badge(hexColor)` | Bracketed badge with a fixed hex color.                              |
| `d.path()`          | Collapse home directory to `~`.                                      |
| `d.dictEntry()`     | Bold key + dim `→` + plain value (for `Dict` nodes).                 |
| `d.keybinding()`    | Dim `" + "` separators between binding parts (for keybinding text).  |

See [Display Functions](../hooks/display.md) for full documentation.

---

## Node helpers

Utility functions for inspecting nodes at runtime.

| Function        | Signature                                 | Description                           |
| --------------- | ----------------------------------------- | ------------------------------------- |
| `isLeafNode`    | `(node: SettingNode) => node is LeafNode` | Returns `true` for non-Section nodes. |
| `isSectionNode` | `(node: SettingNode) => node is Section`  | Returns `true` for Section nodes.     |

---

## Errors

| Class                        | Extends           | Description                                  |
| ---------------------------- | ----------------- | -------------------------------------------- |
| `PiSettingsError`            | `Error`           | Base class for all SDK errors.               |
| `SchemaError`                | `PiSettingsError` | Invalid schema definition.                   |
| `DescriptionTooLongError`    | `SchemaError`     | Description exceeds 128 characters.          |
| `DocumentationTooShortError` | `SchemaError`     | Documentation is shorter than 64 characters. |
| `EnumDefaultMismatchError`   | `SchemaError`     | Enum default not in declared values.         |
| `SettingNotFoundError`       | `PiSettingsError` | Key not found in schema at runtime.          |

See [Error Reference](./errors.md) for full documentation.

---

## Types

All TypeScript types exported from the SDK:

| Type                    | Description                                                                  |
| ----------------------- | ---------------------------------------------------------------------------- |
| `InferConfig<T>`        | Infer the flat config type from a schema.                                    |
| `TextValue`             | `string`                                                                     |
| `NumValue`              | `number`                                                                     |
| `BoolValue`             | `boolean`                                                                    |
| `ListItem`              | `string \| number \| boolean \| Record<string, string \| number \| boolean>` |
| `DictEntry`             | `{ key: string; value: string }`                                             |
| `ValidationResult`      | `{ valid: true } \| { valid: false; reason: string \| string[] }`            |
| `ValidationFn<T>`       | `(value: T) => ValidationResult`                                             |
| `TransformFn`           | `(value: string) => string`                                                  |
| `CompleteFn`            | `(partial: string) => Promise<string[]>`                                     |
| `DisplayFn<T>`          | `(value: T, theme: Theme) => string`                                         |
| `ListDisplayFn<T>`      | `(items: T[], theme: Theme) => string[]`                                     |
| `SettingChangedPayload` | `{ key: string }` — event payload for setting changes                        |
| `Text`                  | Text node interface                                                          |
| `Number`                | Number node interface                                                        |
| `Boolean`               | Boolean node interface                                                       |
| `Enum`                  | Enum node interface                                                          |
| `List`                  | List node interface                                                          |
| `Dict`                  | Dict node interface                                                          |
| `Section`               | Section node interface                                                       |
| `Struct`                | Struct descriptor interface                                                  |
| `SettingNode`           | `Text \| Number \| Boolean \| Enum \| List \| Dict \| Section`               |
| `LeafNode`              | `Text \| Number \| Boolean \| Enum \| List \| Dict`                          |

See [Type Reference](./types.md) for full documentation.

---

<sup>Documentation drafted with AI assistance — Claude Opus 4.6 (Anthropic). Reviewed by a human maintainer before publishing.</sup>
