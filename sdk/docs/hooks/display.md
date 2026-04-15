# Display Functions

Display functions convert a stored value to a formatted string for rendering in the settings panel. ANSI escape sequences are allowed, and the active editor theme is provided so you can use semantic colors.

Import from the `d` namespace:

```ts
import { d } from "pi-extension-settings/sdk/hooks";
```

Assign to the `display` field of any leaf node:

```ts
S.text({ description: "Accent color", default: "#fff", display: d.color() });
```

## Type signature

Display functions conform to the `DisplayFn<T>` type (or `ListDisplayFn<T>` for `List` nodes):

```ts
type DisplayFn<T> = (value: T, theme: Theme) => string;
type ListDisplayFn<T> = (items: T[], theme: Theme) => string[];
```

`ListDisplayFn` receives all items at once so it can compute column alignment across the entire list.

The `theme` parameter gives access to semantic color helpers from the pi editor. Use `theme.fg("accent", text)`, `theme.fg("dim", text)`, etc. to render text in theme-aware colors rather than hard-coded ANSI sequences.

## `d.color()`

Renders a live truecolor swatch followed by the color value. Supports all color formats the SDK understands.

```ts
display: d.color();
```

**Supported formats:**

- Hex: `#rgb`, `#rrggbb` (e.g. `#ff6b6b`)
- RGB: `rgb(r,g,b)`, `rgba(r,g,b,a)` (e.g. `rgb(255,107,107)`)
- HSV/HSB: `hsv(h,s,v)`, `hsb(h,s,b)` (e.g. `hsv(0,58,100)`)
- CSS4 named colors: `coral`, `rebeccapurple`, `dodgerblue`, etc.

For unrecognized values, renders a dim placeholder swatch so the field does not break.

**Example output:**

```text
█ #ff6b6b        ← colored square + hex value
█ rgb(255,0,128) ← colored square + original value
█ coral          ← colored square + named color
```

Typically paired with a color validator and `t.*ToHex()` transform:

```ts
S.text({
  description: "Accent color",
  default: "#ff6b6b",
  validation: v.any(v.hexColor(), v.rgbColor(), v.htmlNamedColor()),
  transform: t.pipe(t.rgbToHex(), t.htmlNamedToHex()),
  display: d.color(),
});
```

## `d.badge(hexColor)`

Renders the value inside a bracketed badge with a fixed background color.

```ts
display: d.badge("#ff6b6b"); // red badge
display: d.badge("#4ecdc4"); // teal badge
```

| Parameter  | Type     | Description                                                 |
| ---------- | -------- | ----------------------------------------------------------- |
| `hexColor` | `string` | A hex color (`#rgb` or `#rrggbb`) for the badge background. |

**Example output:**

```text
[ production ]   ← rendered in red
[ development ]  ← rendered in teal
```

Useful for `Enum` nodes where each value should have a distinct visual identity:

```ts
const ENV_COLORS: Record<string, string> = {
  production: "#ff6b6b",
  staging: "#ffd93d",
  development: "#6bcb77",
};

S.enum({
  description: "Environment",
  default: "development",
  values: ["production", "staging", "development"],
  display: (val, theme) => d.badge(ENV_COLORS[val] ?? "#888")(val, theme),
});
```

## `d.path()`

Collapses the user's home directory prefix to `~`.

```ts
display: d.path();
```

**Example output:**

```text
/Users/alice/.config/app.json  → ~/.config/app.json
/Users/alice/projects/         → ~/projects/
/etc/hosts                     → /etc/hosts  (unchanged)
```

Typically used with `c.filePath()` and `t.expandPath()`:

```ts
S.text({
  description: "Config file",
  default: "~/.config/app.json",
  transform: t.pipe(t.trim(), t.expandPath()),
  complete: c.filePath(),
  display: d.path(),
});
```

Even though `t.expandPath()` expands `~` to an absolute path in storage, `d.path()` collapses it back for display — so the user always sees the short `~/...` form.

## `d.dictEntry()`

Renders a `DictEntry` as **bold key** + dim `→` + plain value. Used internally by the settings panel renderer for `Dict` nodes.

```ts
display: d.dictEntry();
```

**Example output:**

```text
NODE_ENV → production
API_KEY  → sk-...
```

You can use it directly on `Dict` nodes, or use it as a starting point for a custom display:

```ts
S.dict({
  description: "Environment variables",
  display: d.dictEntry(),
});
```

## `d.keybinding()`

Renders a keyboard binding with dim `" + "` separators between each part, making the individual keys easy to read at a glance.

```ts
display: d.keybinding();
```

**Example output:**

```text
ctrl + k
shift + up
ctrl + shift + f5
```

Typically paired with `v.keybinding()`:

```ts
S.text({
  description: "Toggle panel",
  default: "ctrl+k",
  validation: v.keybinding(),
  display: d.keybinding(),
});
```

## Custom display functions

Write a custom display function by matching the `DisplayFn<T>` signature:

```ts
import type { DisplayFn } from "pi-extension-settings/sdk";

const myDisplay: DisplayFn<string> = (value, theme) => {
  if (value.startsWith("https://")) {
    return theme.fg("accent", value);
  }
  return theme.fg("dim", value) + theme.fg("warn", " (not secure)");
};

S.text({
  description: "Server URL",
  default: "https://api.example.com",
  display: myDisplay,
});
```

---

<sup>Documentation drafted with AI assistance — Claude Opus 4.6 (Anthropic). Reviewed by a human maintainer before publishing.</sup>
