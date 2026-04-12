# Error Reference

The SDK throws typed errors so you can catch and handle them precisely. All SDK errors extend `PiSettingsError`, which lets you catch any SDK error with a single `instanceof` check.

## Error hierarchy

```text
Error
└── PiSettingsError
    ├── SchemaError
    │   ├── TooltipTooLongError
    │   └── EnumDefaultMismatchError
    └── SettingNotFoundError
```

---

## `PiSettingsError`

Base class for every error thrown by the SDK.

```ts
class PiSettingsError extends Error {
  name: "PiSettingsError";
}
```

Catching `PiSettingsError` is sufficient to handle any SDK error:

```ts
try {
  const settings = new ExtensionSettings(pi, "my-ext", schema);
} catch (err) {
  if (err instanceof PiSettingsError) {
    console.error("SDK error:", err.message);
  } else {
    throw err;
  }
}
```

---

## `SchemaError`

Thrown when a schema node definition is structurally invalid. The `nodeKey` property provides the dotted path to the offending node.

```ts
class SchemaError extends PiSettingsError {
  name: "SchemaError";
  readonly nodeKey: string | undefined;
}
```

**When thrown:** Automatically by `S.settings()` when the schema tree contains an invalid node. Not thrown directly by SDK consumers.

**Message format:** `"[appearance.theme] <reason>"`

---

## `TooltipTooLongError`

Thrown when a node's `tooltip` exceeds 128 characters.

```ts
class TooltipTooLongError extends SchemaError {
  name: "TooltipTooLongError";
  static readonly MAX_LENGTH: 128;
  readonly actual: number; // actual length of the tooltip
}
```

**When thrown:** At `S.settings()` call time. Checked recursively on every node including nested section children and list struct properties.

**How to fix:** Shorten the tooltip to 128 characters or fewer. Use the `description` field for longer documentation.

**Example:**

```ts
// Throws TooltipTooLongError
S.settings({
  color: S.text({
    tooltip: "x".repeat(200), // ← too long
    default: "",
  }),
});

// Fix: shorten the tooltip
S.settings({
  color: S.text({
    tooltip: "Accent color", // ✓ concise
    description: "The full description can be as long as needed...",
    default: "",
  }),
});
```

**Catch pattern:**

```ts
import { TooltipTooLongError } from "pi-extension-settings/sdk";

try {
  const schema = S.settings({
    /* ... */
  });
} catch (err) {
  if (err instanceof TooltipTooLongError) {
    console.error(
      `Tooltip too long at "${err.nodeKey}": ${err.actual} chars (max ${TooltipTooLongError.MAX_LENGTH})`,
    );
  }
}
```

---

## `EnumDefaultMismatchError`

Thrown when an `Enum` node's `default` value is not present in its declared `values` array.

```ts
class EnumDefaultMismatchError extends SchemaError {
  name: "EnumDefaultMismatchError";
  readonly defaultValue: string; // the invalid default
  readonly allowedValues: readonly string[]; // the declared choices
}
```

**When thrown:** At `S.settings()` call time. Checked on every `Enum` node including those inside `Section` children and `List` struct properties.

**How to fix:** Ensure the `default` value exactly matches one of the strings in `values` (or the `value` field of an object entry).

**Example:**

```ts
// Throws EnumDefaultMismatchError
S.settings({
  theme: S.enum({
    tooltip: "Color theme",
    default: "blue", // ← "blue" not in values
    values: ["dark", "light", "system"],
  }),
});

// Fix: use a declared value as default
S.settings({
  theme: S.enum({
    tooltip: "Color theme",
    default: "dark", // ✓ matches
    values: ["dark", "light", "system"],
  }),
});
```

**Catch pattern:**

```ts
import { EnumDefaultMismatchError } from "pi-extension-settings/sdk";

try {
  const schema = S.settings({
    /* ... */
  });
} catch (err) {
  if (err instanceof EnumDefaultMismatchError) {
    console.error(
      `Invalid default "${err.defaultValue}" at "${err.nodeKey}". ` +
        `Allowed: ${err.allowedValues.join(", ")}`,
    );
  }
}
```

---

## `SettingNotFoundError`

Thrown when `ExtensionSettings.get()` or `ExtensionSettings.set()` is called with a key that does not exist in the registered schema.

```ts
class SettingNotFoundError extends PiSettingsError {
  name: "SettingNotFoundError";
  readonly key: string; // the key that was not found
  readonly extension: string; // the extension identifier
}
```

**When thrown:** At runtime, when `get()` or `set()` is called with an invalid key. TypeScript generics on `get()` and `set()` normally catch this at compile time; this error is the runtime safety net for dynamic usage.

**How to fix:** Check for typos in the key string, or update the schema if a key was renamed.

**Example:**

```ts
settings.get("typo-key"); // throws SettingNotFoundError
```

**Catch pattern:**

```ts
import { SettingNotFoundError } from "pi-extension-settings/sdk";

try {
  const value = settings.get("unknown-key");
} catch (err) {
  if (err instanceof SettingNotFoundError) {
    console.error(`Key "${err.key}" not found in extension "${err.extension}"`);
  }
}
```

---

## Catching any SDK error

```ts
import {
  PiSettingsError,
  TooltipTooLongError,
  EnumDefaultMismatchError,
  SettingNotFoundError,
} from "pi-extension-settings/sdk";

try {
  const schema = S.settings({
    /* ... */
  });
  const settings = new ExtensionSettings(pi, "my-ext", schema);
  settings.get("some-key");
} catch (err) {
  if (err instanceof TooltipTooLongError) {
    console.error(`[${err.nodeKey}] Tooltip too long (${err.actual} chars)`);
  } else if (err instanceof EnumDefaultMismatchError) {
    console.error(
      `[${err.nodeKey}] Default "${err.defaultValue}" not in [${err.allowedValues.join(", ")}]`,
    );
  } else if (err instanceof SettingNotFoundError) {
    console.error(`Key "${err.key}" not found in "${err.extension}"`);
  } else if (err instanceof PiSettingsError) {
    console.error("Unhandled SDK error:", err.message);
  } else {
    throw err;
  }
}
```

---

<sup>Documentation drafted with AI assistance — Claude Opus 4.6 (Anthropic). Reviewed by a human maintainer before publishing.</sup>
