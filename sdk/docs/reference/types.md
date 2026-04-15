# Type Reference

All TypeScript types exported from the SDK. Import type-only symbols with `import type`:

```ts
import type {
  InferConfig,
  ValidationFn,
  DisplayFn,
  SettingNode,
} from "pi-extension-settings/sdk";
```

---

## Value types

These types describe the runtime values returned by `ExtensionSettings.get()`.

### `TextValue`

```ts
type TextValue = string;
```

Runtime value of a `Text` or `Enum` node.

### `NumValue`

```ts
type NumValue = number;
```

Runtime value of a `Number` node.

### `BoolValue`

```ts
type BoolValue = boolean;
```

Runtime value of a `Boolean` node.

### `ListItem`

```ts
type ListItem =
  | TextValue
  | NumValue
  | BoolValue
  | Record<string, TextValue | NumValue | BoolValue>;
```

Runtime value of a single item in a `List` node. Keys are field names from the list's `Struct`; values are their scalar values.

In practice, items are usually `Record<string, string | boolean>` matching the struct's property definitions.

### `DictEntry`

```ts
type DictEntry = { key: string; value: TextValue };
```

Runtime value of a single entry in a `Dict` node, as passed to `validation` and `display` hooks.

---

## Hook function types

### `ValidationResult`

```ts
type ValidationResult =
  | { valid: true }
  | { valid: false; reason: string | string[] };
```

Returned by every `ValidationFn`. On failure, `reason` is the message shown to the user in the settings panel. When `reason` is an array (produced by composition validators like `v.any()`), each entry is rendered on its own line.

### `ValidationFn<T>`

```ts
type ValidationFn<T extends TextValue | NumValue | ListItem | DictEntry> = (
  value: T,
) => ValidationResult;
```

A function that validates a value. Returns `{ valid: true }` on success or `{ valid: false; reason }` on failure.

**Type parameter `T`:**

- `TextValue` for `Text` nodes
- `NumValue` for `Number` nodes
- `ListItem` for per-item validation on `List` nodes
- `DictEntry` for per-entry validation on `Dict` nodes

> **Note:** The numeric validators `v.integer`, `v.positive`, `v.negative`, and `v.range` return `ValidationFn<NumValue>` for use with `Number` nodes. The `v.percentage` validator returns `ValidationFn<TextValue | NumValue>` and works with both `Text` and `Number` nodes.

A single `ValidationFn` is accepted per node. Compose multiple rules with `v.all(...)` or `v.any(...)`.

### `TransformFn`

```ts
type TransformFn = (value: TextValue) => TextValue;
```

Transforms a string value before it is written to storage. Only meaningful on `Text` nodes.

### `CompleteFn`

```ts
type CompleteFn = (partial: TextValue) => Promise<TextValue[]>;
```

Provides autocomplete suggestions for the current partial input. Returns a promise so the function can perform async I/O (e.g. filesystem listing). Only meaningful on `Text` nodes.

### `DisplayFn<T>`

```ts
type DisplayFn<T extends TextValue | NumValue | BoolValue | DictEntry> = (
  value: T,
  theme: Theme,
) => string;
```

Converts a stored value to a display string. ANSI escape sequences are allowed.

The `theme` parameter provides semantic color helpers from the pi editor:

- `theme.fg("accent", text)` — accent/highlight color
- `theme.fg("dim", text)` — de-emphasized color
- `theme.fg("warn", text)` — warning color
- etc.

**Type parameter `T`:**

- `TextValue` for `Text` and `Enum` nodes
- `NumValue` for `Number` nodes
- `BoolValue` for `Boolean` nodes
- `DictEntry` for `Dict` nodes (renders a single key/value row)

### `ListDisplayFn<T>`

```ts
type ListDisplayFn<T extends ListItem> = (items: T[], theme: Theme) => string[];
```

Converts the full list of items to an array of display strings (one per item). Called with all items so the function can compute column alignment across the entire list. Receives the active editor `theme` for ANSI styling.

Used as the `display` field on `List` nodes (instead of `DisplayFn`).

### `SettingChangedPayload`

```ts
type SettingChangedPayload = {
  key: string;
};
```

Payload emitted on the `pi-extension-settings:{extension}:changed` event. Only the key is transmitted; the SDK re-reads the current value from storage.

---

## Node types

All node interfaces extend `BaseSettingNode`.

### `BaseSettingNode`

```ts
interface BaseSettingNode {
  description: string; // Required. Max 128 characters.
  documentation?: string; // Optional. Full Markdown documentation.
}
```

### `Text`

```ts
interface Text extends BaseSettingNode {
  _tag: "text";
  default: TextValue;
  validation?: ValidationFn<TextValue>;
  transform?: TransformFn;
  complete?: CompleteFn;
  display?: DisplayFn<TextValue>;
}
```

### `Number`

```ts
interface Number extends BaseSettingNode {
  _tag: "number";
  default: NumValue;
  validation?: ValidationFn<NumValue>;
  display?: DisplayFn<NumValue>;
}
```

`settings.get()` returns a native JS `number` — no `parseInt` / `parseFloat` needed at the use site.

### `Boolean`

```ts
interface Boolean extends BaseSettingNode {
  _tag: "boolean";
  default: BoolValue;
  display?: DisplayFn<BoolValue>;
}
```

### `Enum`

```ts
interface Enum extends BaseSettingNode {
  _tag: "enum";
  default: TextValue;
  values: Array<TextValue | { value: TextValue; label: string }>;
  display?: DisplayFn<TextValue>;
}
```

`default` must be present in `values`. If not, `S.settings()` throws `EnumDefaultMismatchError`.

### `List<T>`

```ts
interface List<T extends ListItem> extends BaseSettingNode {
  _tag: "list";
  default: T[];
  items: Struct;
  addLabel?: string;
  validation?: ValidationFn<T>;
  display?: ListDisplayFn<T>;
}
```

### `Dict`

```ts
interface Dict extends BaseSettingNode {
  _tag: "dict";
  default: Record<string, TextValue>;
  addLabel?: string;
  validation?: ValidationFn<DictEntry>;
  display?: DisplayFn<DictEntry>;
}
```

### `Section`

```ts
interface Section extends BaseSettingNode {
  _tag: "section";
  children: Record<string, SettingNode>;
}
```

### `Struct`

```ts
interface Struct {
  _tag: "struct";
  properties: Record<string, Text | Number | Boolean | Enum>;
}
```

`Struct` is not a `SettingNode`. It is used exclusively as the `items` field of a `List`.

---

## Union types

### `SettingNode`

```ts
type SettingNode = Text | Number | Boolean | Enum | List | Dict | Section;
```

Union of all top-level node types that can appear in a schema.

### `LeafNode`

```ts
type LeafNode = Text | Number | Boolean | Enum | List | Dict;
```

Nodes that hold a value directly (as opposed to `Section`, which is a container).

---

## Inference utilities

### `InferConfig<T>`

```ts
type InferConfig<T extends Record<string, SettingNode>> = /* ... */;
```

Extracts the flat runtime config type from a schema. `Section` nodes are transparently flattened: their children appear as dot-separated keys at the top level.

**Mapping rules:**

| Node tag    | Inferred key type                                |
| ----------- | ------------------------------------------------ |
| `"text"`    | `string`                                         |
| `"number"`  | `number`                                         |
| `"boolean"` | `boolean`                                        |
| `"enum"`    | `string`                                         |
| `"list"`    | `T["default"]` type, or `ListItem[]`             |
| `"dict"`    | `Record<string, string>`                         |
| `"section"` | _(children flattened as `"section.child"` keys)_ |

**Example:**

```ts
const schema = S.settings({
  name: S.text({ description: "Name", default: "" }),
  enabled: S.boolean({ description: "Enabled", default: true }),
  appearance: S.section({
    description: "Appearance",
    children: {
      theme: S.enum({
        description: "Theme",
        default: "dark",
        values: ["dark", "light"],
      }),
    },
  }),
  tags: S.list({
    description: "Tags",
    items: S.struct({
      properties: { value: S.text({ description: "Tag", default: "" }) },
    }),
  }),
});

type Config = InferConfig<typeof schema>;
// {
//   name: string;
//   enabled: boolean;
//   "appearance.theme": string;
//   tags: ListItem[];
// }
```

---

<sup>Documentation drafted with AI assistance — Claude Opus 4.6 (Anthropic). Reviewed by a human maintainer before publishing.</sup>
