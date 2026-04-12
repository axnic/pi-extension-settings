# Validators

Validators check a value before it is saved. If validation fails, the save is blocked and the reason string is shown to the user.

Import from the `v` namespace:

```ts
import { v } from "pi-extension-settings/sdk/hooks";
```

Assign to the `validation` field of a `Text`, `Number`, `List`, or `Dict` node:

```ts
S.text({ tooltip: "API URL", default: "", validation: v.url() });
```

## Basic

### `v.notEmpty()`

Rejects empty strings and whitespace-only strings.

```ts
validation: v.notEmpty();
// Rejects: "", "   "
// Accepts: "hello", " x "
```

### `v.regex(pattern, reason)`

Tests the value against a regular expression.

```ts
validation: v.regex(/^\d{4}$/, "Must be a 4-digit year");
// Rejects: "abc", "12345"
// Accepts: "2024"
```

| Parameter | Type     | Description                            |
| --------- | -------- | -------------------------------------- |
| `pattern` | `RegExp` | The pattern to test against.           |
| `reason`  | `string` | The failure message shown to the user. |

### `v.oneOf(allowed)`

Accepts only values from an explicit allowlist (case-sensitive).

```ts
validation: v.oneOf(["north", "south", "east", "west"]);
// Rejects: "North", "up"
// Accepts: "north", "east"
```

## Composition

### `v.all(...validators)`

All validators must pass. Stops at the first failure and returns its reason.

```ts
validation: v.all(v.notEmpty(), v.url(true));
```

### `v.any(...validators)`

At least one validator must pass. If all fail, their reasons are joined with `" or "`.

```ts
validation: v.any(v.hexColor(), v.rgbColor(), v.htmlNamedColor());
// Failure: "Must be a hex color or Must be an rgb() color or Must be a named color"
```

## File System

### `v.filePath(exists?)`

Validates that a value looks like a valid filesystem path. Optionally checks that the path actually exists on disk.

```ts
validation: v.filePath(); // syntax only
validation: v.filePath(true); // must also exist
```

| Parameter | Type      | Default | Description                                                |
| --------- | --------- | ------- | ---------------------------------------------------------- |
| `exists`  | `boolean` | `false` | If `true`, calls `existsSync()` to verify the path exists. |

## Numeric

Numeric validators target `Number` nodes and return `ValidationFn<NumValue>`.
Combine them with `v.all()` when you need multiple constraints.

### `v.integer()`

Validates that the number has no fractional part.

```ts
validation: v.integer();
// Accepts: 0, 1, -7, 42
// Rejects: 2.5, 0.1, -1.9
```

Combine with `v.range()` to also enforce bounds:

```ts
validation: v.all(v.integer(), v.range({ min: 1, max: 65535 }));
```

### `v.positive(allowZero?)`

Validates a positive number. With `allowZero: true`, also accepts `0`.

```ts
validation: v.positive(); // value > 0
validation: v.positive(true); // value >= 0
```

### `v.negative()`

Validates that the number is strictly negative (< 0).

```ts
validation: v.negative();
// Accepts: -1, -0.5, -100
// Rejects: 0, 1, 0.001
```

### `v.range({ min?, max? })`

Validates a number within an inclusive range. Either bound may be omitted.

```ts
validation: v.range({ min: 0, max: 100 }); // 0 ≤ n ≤ 100
validation: v.range({ min: 1 }); // n ≥ 1 (no upper bound)
validation: v.range({ max: 255 }); // n ≤ 255 (no lower bound)
```

### `v.percentage()`

Validates a percentage value. Behaviour differs by node type:

- **`Number` nodes** (`NumValue`): value must be between **0 and 1** (e.g. `0.75` for 75 %).
- **`Text` nodes** (`TextValue`): value must be a number string between 0 and 100, with or without a trailing `%` sign.

```ts
// Number node — 0 to 1
S.number({ validation: v.percentage() });
// Accepts: 0, 0.5, 1
// Rejects: -0.01, 1.01

// Text node — 0 to 100 (with optional %)
S.text({ validation: v.percentage() });
// Accepts: "50", "75%", "0", "100%"
// Rejects: "101", "-1", "fifty"
```

## URI / URL

### `v.uri(allowedSchemes?)`

Validates an RFC-3986-like URI. Optionally restricts to a set of allowed schemes.

```ts
validation: v.uri(); // any scheme
validation: v.uri(["https", "http", "ftp"]); // only these schemes
```

### `v.uriRFC()`

Alias for `v.uri()` with no scheme restriction.

### `v.url(enforceHttps?)`

Validates an HTTP or HTTPS URL using the built-in `URL` parser.

```ts
validation: v.url(); // http or https
validation: v.url(true); // https only
```

## Color

### `v.hexColor()`

Validates a CSS hex color in short (`#rgb`) or long (`#rrggbb`) form.

```ts
validation: v.hexColor();
// Accepts: "#fff", "#ffffff", "#FF6B6B"
// Rejects: "fff", "#gg0000", "#ffff"
```

### `v.rgbColor()`

Validates `rgb()` or `rgba()` notation.

```ts
validation: v.rgbColor();
// Accepts: "rgb(255,0,0)", "rgba(0,128,255,0.5)"
// Rejects: "rgb(300,0,0)", "hsl(0,100%,50%)"
```

### `v.hsvColor()` / `v.hsbColor()`

Validates `hsv(h,s,v)` or `hsb(h,s,b)` notation. Both are identical aliases.

```ts
validation: v.hsvColor();
validation: v.hsbColor();
// Accepts: "hsv(360,100,100)", "hsb(0,50,75)"
```

### `v.htmlNamedColor()`

Validates a CSS4 named color. Checks against a lookup table of 148 standard color names.

```ts
validation: v.htmlNamedColor();
// Accepts: "coral", "rebeccapurple", "dodgerblue"
// Rejects: "brightred", "customblue"
```

## Keyboard

### `v.keybinding()`

Validates a keyboard binding string — a `+`-separated sequence of zero or more modifier keys followed by exactly one non-modifier key.

**Accepted modifiers:** `ctrl`, `alt`, `shift`, `meta`, `cmd`, `option`

**Accepted key names:** `up`, `down`, `left`, `right`, `enter`, `escape`, `esc`, `tab`, `backspace`, `delete`, `home`, `end`, `space`, `a`–`z`, `0`–`9`, `f1`–`f12`

When an unknown token is typed, the validator suggests the closest known token if it is within 2 edits — making typos like `"ctrol"` immediately actionable.

```ts
validation: v.keybinding();
// Accepts: "ctrl+k", "shift+up", "space", "d", "ctrl+shift+f5"
// Rejects: "ctrol+k"    → Unknown key "ctrol" — did you mean "ctrl"?
// Rejects: "ctrl+"      → Missing key after "+"
// Rejects: "ctrl+ctrl"  → Duplicate modifier "ctrl"
// Rejects: "ctrl+alt"   → "alt" is a modifier — add a non-modifier key after it, e.g. "alt+k"
```

Typically paired with `d.keybinding()` for consistent rendering:

```ts
S.text({
  tooltip: "Toggle panel",
  default: "ctrl+k",
  validation: v.keybinding(),
  display: d.keybinding(),
});
```

## Combining color validators

A common pattern is to accept any color format:

```ts
S.text({
  tooltip: "Accent color",
  default: "#ff6b6b",
  validation: v.any(
    v.hexColor(),
    v.rgbColor(),
    v.hsvColor(),
    v.htmlNamedColor(),
  ),
  transform: t.pipe(t.rgbToHex(), t.hsvToHex(), t.htmlNamedToHex()),
  display: d.color(),
});
```

---

<sup>Documentation drafted with AI assistance — Claude Opus 4.6 (Anthropic). Reviewed by a human maintainer before publishing.</sup>
