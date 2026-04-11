# pi-extension-settings — SDK Reference

This document is the authoritative reference for the `pi-extension-settings` SDK.
For the panel UI design and mockups, see [DESIGN.md](./DESIGN.md).

---

## Getting started

### 1. Register your extension

Add `pi-extension-settings` to your `packages` array **before** your extension:

```json
{
  "packages": ["./pi-extension-settings", "./my-extension"]
}
```

### 2. Define a schema and create an `ExtensionSettings` instance

```ts
// my-extension/index.ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
  ExtensionSettings,
  S,
  v,
  d,
  t,
} from "../pi-extension-settings/sdk/index.js";

const schema = S.settings({
  "api-url": S.text({
    tooltip: "API URL",
    description: "Base URL for the backend API.",
    default: "https://api.example.com",
    validation: v.url(),
    transform: t.normalizeUrl(),
  }),

  enabled: S.boolean({
    tooltip: "Enabled",
    description: "Enable or disable the extension.",
    default: true,
  }),

  mode: S.enum({
    tooltip: "Mode",
    default: "balanced",
    values: ["minimal", "balanced", "full"],
  }),
});

export default function myExtension(pi: ExtensionAPI) {
  const settings = new ExtensionSettings(pi, "my-extension", schema);

  const url = settings.get("api-url"); // string
  const enabled = settings.get("enabled"); // boolean
}
```

---

## `ExtensionSettings<S>` class

The main class. Generic over the schema `S` to infer return types.

### Constructor

```ts
new ExtensionSettings(pi: ExtensionAPI, extension: string, schema: S)
```

- **`pi`** — The `ExtensionAPI` instance passed to your extension factory.
- **`extension`** — Your extension's name (e.g., `"my-extension"`). Must be unique.
- **`schema`** — The result of `S.settings({ ... })`.

The constructor:

1. Listens for `pi-extension-settings:ready` and emits `pi-extension-settings:register` with your schema.
2. Listens for `pi-extension-settings:changed` to fire `onChange` listeners.

### `get(key)`

```ts
settings.get("api-url"); // → string
settings.get("enabled"); // → boolean
settings.get("appearance.theme"); // → string (group key, flattened with dots)
settings.get("tips"); // → Array<{ command: string; description: string }>
```

Returns the stored value, typed from the schema. Falls back to the schema `default` if no value has been saved yet.

### `set(key, value)`

```ts
settings.set("api-url", "https://api.newserver.com");
settings.set("enabled", false);
```

Serializes and writes the value to `~/.pi/agent/settings.json` (under the `"extensions:settings"` key).
Runs any `transform` hook (text fields only) before writing.
Fires registered `onChange` listeners synchronously.

### `onChange(key, callback)`

```ts
settings.onChange("api-url", (newUrl) => {
  reconnect(newUrl);
});

settings.onChange("enabled", (isEnabled) => {
  if (isEnabled) start();
  else stop();
});
```

Fires whenever the settings panel saves a change for this key, or when `set()` is called programmatically. The callback receives the typed value.

Listeners are session-scoped. No cleanup is needed unless you want to remove them manually.

### `getAll()`

```ts
const all = settings.getAll();
// all["api-url"] → string
// all["enabled"] → boolean
```

Returns a full snapshot of all settings, with defaults applied for any keys not yet in storage. Useful for initialization.

---

## Schema builders (`S.*`)

Import:

```ts
import { S } from "../pi-extension-settings/sdk/index.js";
```

All builders require a `tooltip` field (max 128 characters) — the inline label shown next to the control in the settings panel. An optional `description` field accepts full Markdown for the detail pane.

### `S.settings(def)`

Top-level entry point. Validates the schema at runtime and returns it (for TypeScript to infer the schema type). Throws `TooltipTooLongError` if any `tooltip` exceeds 128 characters, or `EnumDefaultMismatchError` if an enum default is not in `values`.

```ts
const schema = S.settings({
  key: S.text({ ... }),
  // ...
});
```

### `S.text(opts)`

The base type. All specialisations (color, path, URL, …) are text fields with added hooks.

```ts
S.text({
  tooltip: string;          // inline label (max 128 chars)
  description?: string;     // full Markdown documentation
  default: string;          // value when nothing is saved
  validation?: ValidationFn; // run as user types (150ms debounce)
  transform?: TransformFn;   // run on confirm, before save
  complete?: CompleteFn;     // supply suggestions (250ms debounce)
  display?: DisplayFn;       // render the stored value (e.g. ■ #ff930f)
})
```

**Example — hex color:**

```ts
S.text({
  tooltip: "Primary color",
  default: "#3b82f6",
  validation: v.hexColor(),
  display: d.color(),
});
```

**Example — file path:**

```ts
S.text({
  tooltip: "Config path",
  default: "~/.pi/agent/my-extension.json",
  transform: t.expandPath(),
  display: d.path(),
  complete: c.filePath(),
});
```

### `S.number(opts)`

A numeric input that stores and returns a native JS `number`. Prefer this over `S.text()` + numeric validators for semantically numeric settings — `settings.get()` returns a `number` directly.

```ts
S.number({
  tooltip: string;
  description?: string;
  default: number;
  validation?: ValidationFn<number>;
  display?: DisplayFn<number>;
})
```

**Example:**

```ts
S.number({
  tooltip: "Port",
  default: 8080,
  validation: v.all(v.integer(), v.range({ min: 1, max: 65535 })),
});
```

### `S.boolean(opts)`

```ts
S.boolean({
  tooltip: string;
  description?: string;
  default: boolean;
  display?: DisplayFn<boolean>;
})
```

`Enter` or `Space` toggles and saves immediately.

### `S.enum(opts)`

```ts
S.enum({
  tooltip: string;
  description?: string;
  default: string;
  values: Array<string | { value: string; label: string }>;
  display?: DisplayFn<string>;
})
```

`Enter` or `Space` cycles to the next option and saves immediately.
All options are shown inline: `[selected]  dim-option  dim-option`.

**Example with labels:**

```ts
S.enum({
  tooltip: "Log level",
  default: "info",
  values: [
    { value: "error", label: "Error only" },
    { value: "warn", label: "Warnings" },
    { value: "info", label: "Info" },
    { value: "debug", label: "Debug" },
  ],
});
```

### `S.list(opts)`

A list of structured objects. Each item has the shape described by `items` (a `Struct` from `S.struct()`).

```ts
S.list({
  tooltip: string;
  description?: string;
  addLabel?: string;    // text for the "+ Add …" row (default "Add item")
  default?: ListItem[];
  items: Struct;        // created with S.struct({ properties: {...} })
  validation?: ValidationFn<ListItem>;
  display?: DisplayFn<ListItem>;
})
```

`Enter` expands/collapses the list inline. Inside the list:

- `↑`/`↓` navigate items
- `r` reset setting to schema default (default)
- `Space` collapse/expand focused header (default)
- `Shift+Space` collapse all visible sections (default)
- `Shift+↑`/`Shift+↓` reorder (defaults)
- `d` delete list item (default)
- These bindings are configurable via `pi-extension-settings > Controls`
- Start mode is configurable via `pi-extension-settings > Behavior > Start in search mode`
- Binding fields validate known key tokens (modifiers + key)
- Binding display renders `+` dimmed with spaces (`ctrl + shift + up`)
- Trailing `+` is hidden in display (`ctrl+` displays as `ctrl`)
- `Enter` on `+ Add …` opens a form

**Example:**

```ts
S.list({
  tooltip: "Tips",
  addLabel: "Add another tip",
  default: [{ command: "/", description: "browse commands" }],
  items: S.struct({
    properties: {
      command: S.text({
        tooltip: "command",
        default: "",
        validation: v.notEmpty(),
      }),
      description: S.text({ tooltip: "description", default: "" }),
    },
  }),
});
```

### `S.dict(opts)`

A string→string dictionary.

```ts
S.dict({
  tooltip: string;
  description?: string;
  addLabel?: string;    // default "Add entry"
  default?: Record<string, string>;
  validation?: ValidationFn<DictEntry>;
  display?: DisplayFn<DictEntry>;
})
```

Displayed as `key  value` pairs. Same interaction as `list`.

**Example:**

```ts
S.dict({
  tooltip: "Bindings",
  addLabel: "Add binding",
  default: { "ctrl+k": "/clear", "ctrl+r": "/reset" },
});
```

### `S.section(opts)`

Groups related settings into a collapsible sub-folder in the panel.

```ts
S.section({
  tooltip: string;        // used as the section header label
  description?: string;
  children: Record<string, SettingNode>;
})
```

Section keys are flattened with dot notation in both the inferred type and `settings.json`:

```ts
S.section({
  tooltip: "Appearance",
  children: {
    theme: S.enum({
      tooltip: "Theme",
      default: "dark",
      values: ["dark", "light", "system"],
    }),
    "font-size": S.number({
      tooltip: "Font size",
      default: 14,
      validation: v.all(v.integer(), v.range({ min: 8, max: 32 })),
    }),
  },
});
```

```ts
settings.get("appearance.theme"); // → string
settings.get("appearance.font-size"); // → string
```

### `S.struct(opts)`

Describes the shape of each item in a `S.list()`. **Not** a `SettingNode` — only used as the `items` field of a list.

```ts
S.struct({
  properties: Record<string, Text | Number | Boolean | Enum>;
})
```

**Example:**

```ts
S.struct({
  properties: {
    host: S.text({ tooltip: "Hostname", default: "" }),
    port: S.text({ tooltip: "Port", default: "22" }),
  },
});
```

---

## Type inference (`InferConfig<T>`)

The `InferConfig<T>` utility type extracts the configuration shape from a schema.
You rarely need to use it directly, but it is useful for typing helper functions:

```ts
import type { InferConfig } from "../pi-extension-settings/sdk/index.js";

type MyConfig = InferConfig<typeof schema>;
// {
//   "api-url": string;
//   "enabled": boolean;
//   "appearance.theme": string;
//   "tips": Array<Record<string, string>>;
// }

function renderDashboard(config: MyConfig) {
  // config is fully typed
}
```

---

## Validators (`v.*`)

Validators run as the user types (in the inline edit mode). The first failing validator blocks `Enter` and shows `✗ reason` in the tooltip. When all validators pass, `✓ reason` is shown.

```ts
import { v } from "../pi-extension-settings/sdk/index.js";
```

| Validator                  | Description                                                  |
| -------------------------- | ------------------------------------------------------------ |
| `v.notEmpty()`             | Value must not be empty or whitespace-only                   |
| `v.hexColor()`             | Must be `#rgb` or `#rrggbb`                                  |
| `v.rgbColor()`             | Must be `rgb(r,g,b)` / `rgba(r,g,b,a)`                       |
| `v.hsvColor()`             | Must be `hsv(h,s,v)` / `hsb(h,s,b)`                          |
| `v.htmlNamedColor()`       | Must be a CSS4 named color (e.g. `coral`, `rebeccapurple`)   |
| `v.url(enforceHttps?)`     | Must be a valid URL; `true` requires HTTPS                   |
| `v.uri(allowedProtocols?)` | RFC-3986-like URI; optionally restrict allowed schemes       |
| `v.filePath(exists?)`      | File path; `true` checks the path exists on disk             |
| `v.integer()`              | Must be an integer (no fractional part)                      |
| `v.range({ min?, max? })`  | Must be a number within an inclusive range                   |
| `v.positive(allowZero?)`   | Must be positive (> 0, or ≥ 0 with `allowZero: true`)        |
| `v.negative()`             | Must be strictly negative (< 0)                              |
| `v.percentage()`           | `0`–`1` as a number, or `0`–`100` optionally with `%`        |
| `v.regex(pattern, reason)` | Must match a custom `RegExp`                                 |
| `v.oneOf(values)`          | Must be one of the provided strings                          |
| `v.keybinding()`           | Keyboard binding string (e.g. `ctrl+k`); suggests typo fixes |
| `v.all(...validators)`     | All validators must pass (first failure wins)                |
| `v.any(...validators)`     | At least one validator must pass                             |

**Custom validator:**

```ts
import type { ValidationFn } from "../pi-extension-settings/sdk/index.js";

const noSpaces: ValidationFn<string> = (value) =>
  /\s/.test(value)
    ? { valid: false, reason: "must not contain spaces" }
    : { valid: true };
```

---

## Transforms (`t.*`)

Transforms run after `Enter` (on confirm), before the value is written to storage.

```ts
import { t } from "../pi-extension-settings/sdk/index.js";
```

| Transform            | Description                                          |
| -------------------- | ---------------------------------------------------- |
| `t.expandPath()`     | `~/...` → `/home/user/...`                           |
| `t.trim()`           | Remove leading/trailing whitespace                   |
| `t.lowercase()`      | Convert to lowercase                                 |
| `t.uppercase()`      | Convert to uppercase                                 |
| `t.capitalize()`     | First char uppercase, rest lowercase                 |
| `t.titleCase()`      | Title-case every word                                |
| `t.camelCase()`      | Convert to camelCase                                 |
| `t.kebabCase()`      | Convert to kebab-case                                |
| `t.snakeCase()`      | Convert to snake_case                                |
| `t.normalizeUrl()`   | Lowercase protocol + hostname; trailing `/` on root  |
| `t.rgbToHex()`       | `rgb(r,g,b)` → `#rrggbb`; pass through otherwise     |
| `t.hsvToHex()`       | `hsv(h,s,v)` / `hsb(h,s,b)` → `#rrggbb`              |
| `t.htmlNamedToHex()` | CSS4 named color → `#rrggbb`; pass through otherwise |
| `t.pipe(...fns)`     | Compose transforms left-to-right                     |
| `t.compose(...fns)`  | Compose transforms right-to-left                     |

**Custom transform:**

```ts
import type { TransformFn } from "../pi-extension-settings/sdk/index.js";

const removeProtocol: TransformFn = (value) =>
  value.replace(/^https?:\/\//, "");
```

---

## Completers (`c.*`)

Completers supply autocomplete suggestions. They are called 250ms after the user stops typing, and suggestions appear inline below the focused row.

```ts
import { c } from "../pi-extension-settings/sdk/index.js";
```

| Completer              | Description                     |
| ---------------------- | ------------------------------- |
| `c.filePath()`         | Filesystem paths, expanding `~` |
| `c.staticList(values)` | Fixed list filtered by prefix   |

**Custom completer:**

```ts
import type { CompleteFn } from "../pi-extension-settings/sdk/index.js";

const myCompleter: CompleteFn = async (partial) => {
  const all = await fetchFromApi();
  return all.filter((v) => v.startsWith(partial));
};
```

---

## Display functions (`d.*`)

Display functions run at render time. They transform the stored value into a displayable string (may include ANSI escape sequences). They do NOT affect the stored value or the inline edit bar.

```ts
import { d } from "../pi-extension-settings/sdk/index.js";
```

| Display fn       | Description                                                  |
| ---------------- | ------------------------------------------------------------ |
| `d.color()`      | Prepend `■` colored in the hex value; dim `■` if invalid     |
| `d.path()`       | Substitute home directory with `~`                           |
| `d.badge(color)` | Wrap value in a fixed hex-colored `[badge]`                  |
| `d.dictEntry()`  | Render a `DictEntry` as **bold key** + dim `→` + value       |
| `d.keybinding()` | Render binding with dim `" + "` separators (e.g. `ctrl + k`) |

**Custom display function:**

```ts
import type { DisplayFn } from "../pi-extension-settings/sdk/index.js";

const truncate: DisplayFn<string> = (value) =>
  value.length > 20 ? value.slice(0, 17) + "…" : value;
```

---

## Storage format

Settings are stored in `~/.pi/agent/settings.json` under the `"extensions:settings"` key:

```json
{
  "extensions:settings": {
    "my-extension": {
      "api-url": "https://api.example.com",
      "enabled": true,
      "mode": "balanced",
      "appearance.theme": "dark",
      "tips": [{ "command": "/", "description": "browse commands" }]
    }
  }
}
```

- Values are stored as their natural JSON types: booleans as `true`/`false`, numbers as numbers, arrays and objects as native JSON.
- Plain text and enum values are stored as strings.
- Section keys are flattened: `appearance.theme` is stored directly under the extension key.

---

## Event protocol

The SDK uses `pi.events` for the registration flow:

| Event                            | Direction                         | Payload                                                     | When                                 |
| -------------------------------- | --------------------------------- | ----------------------------------------------------------- | ------------------------------------ |
| `pi-extension-settings:ready`    | pi-extension-settings → consumers | `{}`                                                        | After session_start (startup/reload) |
| `pi-extension-settings:register` | consumer → pi-extension-settings  | `{ extension: string, nodes: Record<string, SettingNode> }` | In response to "ready"               |
| `pi-extension-settings:changed`  | pi-extension-settings → consumers | `{ extension: string, key: string, value: string }`         | After the panel saves a value        |

The `ExtensionSettings` class handles all of this automatically. You only need to know about these events if you're building a custom integration or debugging.

---

## Full example

```ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
  ExtensionSettings,
  S,
  v,
  t,
  c,
  d,
} from "../pi-extension-settings/sdk/index.js";

const schema = S.settings({
  endpoint: S.text({
    tooltip: "Endpoint",
    description: "Base URL of the proxy server.",
    default: "https://api.mycompany.com",
    validation: v.url(true),
    transform: t.normalizeUrl(),
  }),

  port: S.number({
    tooltip: "Port",
    description: "Listener port.",
    default: 8080,
    validation: v.all(v.integer(), v.range({ min: 1, max: 65535 })),
  }),

  enabled: S.boolean({
    tooltip: "Enabled",
    description: "Enable the proxy.",
    default: true,
  }),

  "log-level": S.enum({
    tooltip: "Log level",
    default: "warn",
    values: ["error", "warn", "info", "debug"],
  }),

  headers: S.dict({
    tooltip: "Custom headers",
    addLabel: "Add header",
    default: { "X-Client": "pi" },
  }),

  colors: S.section({
    tooltip: "Colors",
    children: {
      primary: S.text({
        tooltip: "Primary",
        default: "#3b82f6",
        validation: v.hexColor(),
        display: d.color(),
      }),
      accent: S.text({
        tooltip: "Accent",
        default: "#f59e0b",
        validation: v.hexColor(),
        display: d.color(),
      }),
    },
  }),
});

export default function myProxyExtension(pi: ExtensionAPI) {
  const settings = new ExtensionSettings(pi, "my-proxy", schema);

  // Read typed values
  const endpoint = settings.get("endpoint"); // string
  const port = settings.get("port"); // number
  const enabled = settings.get("enabled"); // boolean
  const primary = settings.get("colors.primary"); // string

  // React to changes
  settings.onChange("endpoint", (newEndpoint) => {
    reconnect(newEndpoint);
  });
  settings.onChange("enabled", (isEnabled) => {
    if (!isEnabled) shutdown();
  });

  // Programmatic write
  if (!enabled) {
    settings.set("enabled", true);
  }
}
```

---

<sup>Documentation drafted with AI assistance — Claude Opus 4.6 (Anthropic). Reviewed by a human maintainer before publishing.</sup>
