# Schema Builder

The `S` namespace is the single entry point for describing your extension's settings. Every node in a schema is constructed by calling one of the `S.*` builder functions. You never instantiate node objects directly.

---

## Mental model

A **schema** is a tree.

- **Leaves** carry values (`Text`, `Boolean`, `Enum`, `List`, `Dict`).
- **Branches** group related leaves (`Section`).
- `S.settings({...})` is the root — it validates the tree and hands it back typed.

```mermaid
flowchart TD
    Root["S.settings()"] --> A["S.text / S.number / S.boolean / S.enum"]
    Root --> B["S.list"]
    Root --> C["S.dict"]
    Root --> D["S.section"]
    D --> E["(nested children)"]
    B --> F["S.struct<br/>(list item shape)"]
```

---

## `S.settings()` — the entry point

Wraps a schema definition, runs runtime validation, and returns it with the correct TypeScript inference shape.

```ts
const schema = S.settings({
  color: S.text({ tooltip: "Accent color", default: "#ff6b6b" }),
});
```

### Runtime validation

`S.settings()` walks the entire tree (including nested sections and list struct properties) and enforces two invariants:

| Check                             | Error thrown                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------- |
| `tooltip` length ≤ 128 characters | [`TooltipTooLongError`](../reference/errors.md#tooltiptoolongerror)           |
| `Enum` default ∈ `values`         | [`EnumDefaultMismatchError`](../reference/errors.md#enumdefaultmismatcherror) |

> [!IMPORTANT]
> These checks happen synchronously when you call `S.settings()` at module load time. Schema bugs fail fast, not silently at runtime.

### Compile-time inference

The return type carries every branch of the tree, which is what `InferConfig<T>` uses to produce the flat key → value map.

```ts
const schema = S.settings({ color: S.text({ tooltip: "Color", default: "" }) });
type Config = InferConfig<typeof schema>; // { color: string }
```

---

## Which builder should I use?

```mermaid
flowchart TD
    Q["What are you storing?"]
    Q --> T1["Free-form text"]
    T1 --> TA["S.text<br/>+ validator + transform"]
    Q --> T1b["Number"]
    T1b --> TN["S.number<br/>+ validator"]
    Q --> T2["Yes/no toggle"]
    T2 --> TB["S.boolean"]
    Q --> T3["One of N fixed choices"]
    T3 --> TC["S.enum"]
    Q --> T4["Many structured items<br/>(table rows)"]
    T4 --> TD["S.list<br/>(with S.struct items)"]
    Q --> T5["Many key/value pairs<br/>(headers, env vars)"]
    T5 --> TE["S.dict"]
    Q --> T6["Group of related settings"]
    T6 --> TF["S.section<br/>(nestable)"]
```

---

## `S.text(opts)`

A free-form text input. Every specialized input (color picker, URL field, path browser, number field) is built on top of `S.text` by attaching hooks.

```ts
S.text({
  tooltip: "API base URL",
  description: "Root URL used for every outbound HTTP request.",
  default: "https://api.example.com",
  validation: v.url(true),
  transform: t.normalizeUrl(),
  complete: c.staticList([
    "https://api.example.com",
    "https://api.staging.example.com",
  ]),
  display: d.path(),
});
```

| Field         | Type                   | Required | Description                              |
| ------------- | ---------------------- | -------- | ---------------------------------------- |
| `tooltip`     | `string`               | Yes      | Inline label (max 128 chars).            |
| `description` | `string`               | No       | Full Markdown docs.                      |
| `default`     | `string`               | Yes      | Value used when nothing is stored.       |
| `validation`  | `ValidationFn<string>` | No       | Blocks save on failure.                  |
| `transform`   | `TransformFn`          | No       | Mutates the value before storage.        |
| `complete`    | `CompleteFn`           | No       | Async autocomplete suggestions.          |
| `display`     | `DisplayFn<string>`    | No       | Converts stored value to display string. |

> [!TIP]
> `Text` is the **only** node type that supports the full hook stack (`validation`, `transform`, `complete`, `display`). Boolean and Enum support only `display`; List and Dict support `validation` and `display` (on their items/entries).

---

## `S.number(opts)`

A numeric input that stores and returns a native JS `number`. Prefer this over `S.text()` for any semantically numeric setting.

```ts
S.number({
  tooltip: "Port number",
  default: 8080,
  validation: v.all(v.integer(), v.range({ min: 1, max: 65535 })),
});
```

| Field         | Type                   | Required | Description                              |
| ------------- | ---------------------- | -------- | ---------------------------------------- |
| `tooltip`     | `string`               | Yes      | Inline label (max 128 chars).            |
| `description` | `string`               | No       | Full Markdown docs.                      |
| `default`     | `number`               | Yes      | Value used when nothing is stored.       |
| `validation`  | `ValidationFn<number>` | No       | Blocks save on failure.                  |
| `display`     | `DisplayFn<number>`    | No       | Converts stored value to display string. |

> [!NOTE]
> The numeric validators (`v.integer`, `v.positive`, `v.negative`, `v.range`) target `Number` nodes. The `v.percentage` validator also accepts `Text` nodes (0–100 range with optional `%`).

---

## `S.boolean(opts)`

A toggle that flips between `true` and `false`.

```ts
S.boolean({
  tooltip: "Enable dark mode",
  default: true,
  display: (val, theme) =>
    val ? theme.fg("accent", "on") : theme.fg("dim", "off"),
});
```

| Field     | Type                 | Required |
| --------- | -------------------- | -------- |
| `default` | `boolean`            | Yes      |
| `display` | `DisplayFn<boolean>` | No       |

---

## `S.enum(opts)`

A cycling selector that steps through a fixed, ordered set of choices. The user clicks to advance to the next value — there is no free-text input.

```ts
S.enum({
  tooltip: "Log level",
  default: "info",
  values: [
    { value: "debug", label: "Debug (verbose)" },
    { value: "info", label: "Info" },
    { value: "warn", label: "Warnings only" },
    { value: "error", label: "Errors only" },
  ],
});
```

| Field     | Type                                | Required | Description              |
| --------- | ----------------------------------- | -------- | ------------------------ |
| `default` | `string`                            | Yes      | Must be one of `values`. |
| `values`  | `Array<string \| { value; label }>` | Yes      | Ordered choices.         |
| `display` | `DisplayFn<string>`                 | No       |                          |

### Plain strings vs labeled entries

```ts
// Plain strings — stored value equals display label
values: ["dark", "light", "system"];

// Labeled entries — stored value and display label are separate
values: [
  { value: "dark", label: "Dark mode" },
  { value: "light", label: "Light mode" },
  { value: "system", label: "Follow system" },
];
```

Use labeled entries when the stored value is a stable technical identifier that should not change with UI copy.

> [!WARNING]
> If `default` is not present in `values`, `S.settings()` throws `EnumDefaultMismatchError`. The check compares against `value` (not `label`) for labeled entries.

---

## `S.list(opts)`

A growable list of structured objects. Each item has the shape defined by `items` (a `Struct`). The panel renders the list as a table with an "add item" button.

```ts
S.list({
  tooltip: "Allowed origins",
  addLabel: "Add origin",
  default: [{ url: "https://localhost:3000", active: true }],
  items: S.struct({
    properties: {
      url: S.text({ tooltip: "URL", default: "" }),
      active: S.boolean({ tooltip: "Enabled", default: true }),
    },
  }),
  validation: (item) =>
    item.url ? { valid: true } : { valid: false, reason: "URL is required" },
  display: (item, theme) =>
    `${item.active ? "on " : "off"} ${theme.fg("dim", item.url)}`,
});
```

| Field        | Type                      | Required | Description                            |
| ------------ | ------------------------- | -------- | -------------------------------------- |
| `default`    | `ListItem[]`              | No       | Initial contents. Defaults to `[]`.    |
| `items`      | `Struct`                  | Yes      | See [`S.struct`](#sstructopts).        |
| `addLabel`   | `string`                  | No       | Label for the "add" button.            |
| `validation` | `ValidationFn<ListItem>`  | No       | Validates each item.                   |
| `display`    | `ListDisplayFn<ListItem>` | No       | Converts all items to display strings. |

---

## `S.dict(opts)`

A string → string dictionary of arbitrary key/value pairs.

```ts
S.dict({
  tooltip: "HTTP headers",
  description: "Extra headers sent with every outbound request.",
  addLabel: "Add header",
  default: { "Content-Type": "application/json" },
  validation: (entry) =>
    entry.key ? { valid: true } : { valid: false, reason: "Key is required" },
});
```

| Field        | Type                      | Required | Description                        |
| ------------ | ------------------------- | -------- | ---------------------------------- |
| `default`    | `Record<string, string>`  | No       | Initial entries. Defaults to `{}`. |
| `addLabel`   | `string`                  | No       | Label for the "add entry" button.  |
| `validation` | `ValidationFn<DictEntry>` | No       | Validates each `{ key, value }`.   |
| `display`    | `DisplayFn<DictEntry>`    | No       | Renders a single entry row.        |

---

## `S.section(opts)`

Groups related settings under a collapsible header. The `tooltip` field doubles as the section header label.

```ts
S.section({
  tooltip: "Appearance",
  description: "Controls the visual theme applied to the extension.",
  children: {
    theme: S.enum({
      tooltip: "Color theme",
      default: "dark",
      values: ["dark", "light"],
    }),
    advanced: S.section({
      tooltip: "Advanced",
      children: {
        "line-height": S.text({ tooltip: "Line height", default: "1.5" }),
      },
    }),
  },
});
```

| Field      | Type                          | Required |
| ---------- | ----------------------------- | -------- |
| `children` | `Record<string, SettingNode>` | Yes      |

Sections nest to any depth. `InferConfig` flattens them automatically using dot-separated keys:

```ts
settings.get("appearance.theme"); // "dark" | "light"
settings.get("appearance.advanced.line-height"); // "1.5"
```

> [!NOTE]
> Sections are containers, not leaves. You cannot call `settings.get("appearance")` — you address the leaves inside them.

---

## `S.struct(opts)`

Describes the shape of each item in a `List` node.

```ts
S.struct({
  properties: {
    host: S.text({ tooltip: "Hostname", default: "" }),
    port: S.text({ tooltip: "Port", default: "22" }),
    protocol: S.enum({
      tooltip: "Protocol",
      default: "ssh",
      values: ["ssh", "sftp"],
    }),
    enabled: S.boolean({ tooltip: "Active", default: true }),
  },
});
```

> [!IMPORTANT]
>
> - `Struct` is **not** a `SettingNode`. It cannot appear at the top level of a schema.
> - Properties are limited to scalar types (`Text`, `Number`, `Boolean`, `Enum`). No nested lists, dicts, or sections inside a struct — list items must stay simple enough to render as table rows.

---

## `InferConfig<T>`

The TypeScript utility type that extracts the flat runtime config from a schema. Sections are transparently flattened using dot notation.

```ts
const schema = S.settings({
  "gradient-from": S.text({ tooltip: "Start color", default: "#ff930f" }),
  appearance: S.section({
    tooltip: "Appearance",
    children: {
      theme: S.enum({
        tooltip: "Theme",
        default: "dark",
        values: ["dark", "light"],
      }),
    },
  }),
  keys: S.list({
    tooltip: "SSH keys",
    items: S.struct({
      properties: { host: S.text({ tooltip: "Host", default: "" }) },
    }),
  }),
});

type Config = InferConfig<typeof schema>;
// {
//   "gradient-from": string;
//   "appearance.theme": string;
//   "keys": ListItem[];
// }
```

This inferred type flows through every method on `ExtensionSettings`:

- `get<K extends keyof Config>(k: K): Config[K]`
- `set<K extends keyof Config>(k: K, v: Config[K]): void`
- `onChange<K extends keyof Config>(k: K, cb: (v: Config[K]) => void): void`
- `getAll(): Config`

---

## Common pitfalls

> [!CAUTION]
> **Passing a raw node object instead of calling `S.*`.** Builders stamp the internal `_tag` discriminant. Objects built by hand will not match the union type and will not work with inference.

> [!CAUTION]
> **Forgetting to wrap the top-level schema in `S.settings()`.** Without it, runtime validation never runs. Schema bugs will surface much later and much more cryptically.

> [!CAUTION]
> **Using a long tooltip as documentation.** The 128-character limit is enforced to keep the UI scannable. Use `description` for long Markdown content — it has no length limit.

> [!CAUTION]
> **Nesting non-scalar nodes inside a `Struct`.** Struct properties must be `Text`, `Boolean`, or `Enum`. List items are rendered as table rows and cannot contain nested lists or sections.

---

## What's next

- **[Node Types](./node-types.md)** — Full field-by-field reference for every node type.
- **[ExtensionSettings](./extension-settings.md)** — How the runtime accessor uses the schema.
- **[Hooks](../hooks/README.md)** — The pre-built validators, transforms, completers, and display functions you attach to nodes.

---

<sup>Documentation drafted with AI assistance — Claude Opus 4.6 (Anthropic). Reviewed by a human maintainer before publishing.</sup>
