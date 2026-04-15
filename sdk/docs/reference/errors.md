# Error Reference

The SDK throws typed errors so you can catch and handle them precisely. All SDK errors extend `PiSettingsError`, which lets you catch any SDK error with a single `instanceof` check.

## Error hierarchy

```text
Error
└── PiSettingsError
    ├── SchemaError
    │   ├── DescriptionTooLongError
    │   ├── DocumentationTooShortError
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

## `DescriptionTooLongError`

Thrown when a node's `description` exceeds 128 characters.

```ts
class DescriptionTooLongError extends SchemaError {
  name: "DescriptionTooLongError";
  static readonly MAX_LENGTH: 128;
  readonly actual: number; // actual length of the description
}
```

**When thrown:** At `S.settings()` call time. Checked recursively on every node including nested section children and list struct properties.

**How to fix:** Shorten the description to 128 characters or fewer. Use the `documentation` field for longer documentation.

**Example:**

```ts
// Throws DescriptionTooLongError
S.settings({
  color: S.text({
    description: "x".repeat(200), // ← too long
    default: "",
  }),
});

// Fix: shorten the description
S.settings({
  color: S.text({
    description: "Accent color", // ✓ concise
    documentation: "The full description can be as long as needed...",
    default: "",
  }),
});
```

**Catch pattern:**

```ts
import { DescriptionTooLongError } from "pi-extension-settings/sdk";

try {
  const schema = S.settings({
    /* ... */
  });
} catch (err) {
  if (err instanceof DescriptionTooLongError) {
    console.error(
      `Description too long at "${err.nodeKey}": ${err.actual} chars (max ${DescriptionTooLongError.MAX_LENGTH})`,
    );
  }
}
```

---

## `DocumentationTooShortError`

Thrown when a node's `documentation` field is shorter than 64 characters.

```ts
class DocumentationTooShortError extends SchemaError {
  name: "DocumentationTooShortError";
  static readonly MIN_LENGTH: 64;
  readonly actual: number; // actual length of the documentation string
}
```

**When thrown:** At `S.settings()` call time, only when `documentation` is present and too short. Omitting the field entirely is always valid.

**How to fix:** Either remove the `documentation` field, or expand it to at least 64 characters.

**Example:**

```ts
// Throws DocumentationTooShortError
S.settings({
  color: S.text({
    description: "Accent color",
    documentation: "Too short.", // ← only 10 chars
    default: "",
  }),
});

// Fix option 1: omit documentation entirely
S.settings({
  color: S.text({
    description: "Accent color",
    default: "",
  }),
});

// Fix option 2: write ≥ 64 chars of documentation
S.settings({
  color: S.text({
    description: "Accent color",
    documentation:
      "The accent color is applied to interactive elements such as buttons and links.",
    default: "",
  }),
});
```

**Catch pattern:**

```ts
import { DocumentationTooShortError } from "pi-extension-settings/sdk";

try {
  const schema = S.settings({
    /* ... */
  });
} catch (err) {
  if (err instanceof DocumentationTooShortError) {
    console.error(
      `Documentation too short at "${err.nodeKey}": ${err.actual} chars (min ${DocumentationTooShortError.MIN_LENGTH})`,
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
    description: "Color theme",
    default: "blue", // ← "blue" not in values
    values: ["dark", "light", "system"],
  }),
});

// Fix: use a declared value as default
S.settings({
  theme: S.enum({
    description: "Color theme",
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
  DescriptionTooLongError,
  DocumentationTooShortError,
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
  if (err instanceof DescriptionTooLongError) {
    console.error(
      `[${err.nodeKey}] Description too long (${err.actual} chars)`,
    );
  } else if (err instanceof DocumentationTooShortError) {
    console.error(
      `[${err.nodeKey}] Documentation too short (${err.actual} chars, min ${DocumentationTooShortError.MIN_LENGTH})`,
    );
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
