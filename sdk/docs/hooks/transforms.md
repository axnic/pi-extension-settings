# Transforms

Transforms mutate a value before it is written to storage. They are applied after validation passes, so the value is guaranteed to be valid when a transform runs.

Import from the `t` namespace:

```ts
import { t } from "pi-extension-settings/sdk";
```

Assign to the `transform` field of a `Text` node (transforms are only available on `Text` nodes):

```ts
S.text({ tooltip: "Username", default: "", transform: t.lowercase() });
```

## Composition

### `t.pipe(...transforms)`

Applies transforms left-to-right. The output of each transform is the input to the next.

```ts
transform: t.pipe(t.trim(), t.lowercase());
// "  Hello World  " → "  Hello World  " (trim) → "hello world"

transform: t.pipe(t.rgbToHex(), t.hsvToHex(), t.htmlNamedToHex());
// Converts any color format to hex, passing through values it does not recognize
```

### `t.compose(...transforms)`

Applies transforms right-to-left. `compose(a, b)(v)` is equivalent to `a(b(v))`.

```ts
transform: t.compose(t.uppercase(), t.trim());
// Trims first (right-most), then uppercases
```

`t.pipe` is generally preferred for readability.

## Text Normalization

### `t.trim()`

Removes leading and trailing whitespace.

```ts
transform: t.trim();
// "  hello  " → "hello"
```

### `t.lowercase()`

Converts the entire string to lowercase.

```ts
transform: t.lowercase();
// "Hello World" → "hello world"
```

### `t.uppercase()`

Converts the entire string to uppercase.

```ts
transform: t.uppercase();
// "hello world" → "HELLO WORLD"
```

### `t.capitalize()`

Capitalizes the first character and lowercases the rest.

```ts
transform: t.capitalize();
// "hello world" → "Hello world"
// "HELLO" → "Hello"
```

### `t.titleCase()`

Capitalizes the first letter of each word.

```ts
transform: t.titleCase();
// "hello world" → "Hello World"
```

### `t.camelCase()`

Converts to camelCase. Splits on whitespace, hyphens, and underscores.

```ts
transform: t.camelCase();
// "hello world" → "helloWorld"
// "my-variable" → "myVariable"
```

### `t.kebabCase()`

Converts to kebab-case (lowercase words joined by hyphens).

```ts
transform: t.kebabCase();
// "Hello World" → "hello-world"
// "myVariable"  → "my-variable"
```

### `t.snakeCase()`

Converts to snake_case (lowercase words joined by underscores).

```ts
transform: t.snakeCase();
// "Hello World" → "hello_world"
// "myVariable"  → "my_variable"
```

## Path

### `t.expandPath()`

Expands a leading `~` or `~/` to the user's home directory.

```ts
transform: t.expandPath();
// "~/projects"        → "/Users/alice/projects"
// "~/.ssh/id_rsa"     → "/Users/alice/.ssh/id_rsa"
// "/absolute/path"    → "/absolute/path"  (unchanged)
```

Typically paired with `v.filePath()` and `c.filePath()`:

```ts
S.text({
  tooltip: "Config file",
  default: "~/.config/app.json",
  validation: v.filePath(),
  transform: t.pipe(t.trim(), t.expandPath()),
  complete: c.filePath(),
  display: d.path(),
});
```

## URL

### `t.normalizeUrl()`

Lowercases the protocol and hostname, and ensures a trailing `/` when the URL has no path component.

```ts
transform: t.normalizeUrl();
// "HTTPS://API.EXAMPLE.COM"    → "https://api.example.com/"
// "https://api.example.com/v1" → "https://api.example.com/v1"
```

## Color → Hex

These transforms convert a specific color format to `#rrggbb` hex. Values that do not match the expected format are passed through unchanged, making them safe to chain.

### `t.rgbToHex()`

Converts `rgb(r,g,b)` or `rgba(r,g,b,a)` to `#rrggbb`.

```ts
transform: t.rgbToHex();
// "rgb(255,107,107)"   → "#ff6b6b"
// "#ff6b6b"            → "#ff6b6b"  (unchanged)
```

### `t.hsvToHex()` / `t.hsbToHex()`

Converts `hsv(h,s,v)` or `hsb(h,s,b)` to `#rrggbb`. Both are identical aliases.

```ts
transform: t.hsvToHex();
transform: t.hsbToHex();
// "hsv(0,100,100)"  → "#ff0000"
```

### `t.htmlNamedToHex()`

Converts a CSS4 named color to `#rrggbb`. Pass-through for unrecognized values.

```ts
transform: t.htmlNamedToHex();
// "coral"         → "#ff7f50"
// "rebeccapurple" → "#663399"
// "#ff0000"       → "#ff0000"  (unchanged)
```

### Normalize any color to hex

Combine all three transforms to accept any supported color format and store it as hex:

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
  transform: t.pipe(t.trim(), t.rgbToHex(), t.hsvToHex(), t.htmlNamedToHex()),
  display: d.color(),
});
```

---

<sup>Documentation drafted with AI assistance — Claude Opus 4.6 (Anthropic). Reviewed by a human maintainer before publishing.</sup>
