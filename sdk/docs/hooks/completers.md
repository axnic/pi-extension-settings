# Completers

Completers provide autocomplete suggestions as the user types in a `Text` field. They are async functions that receive the current partial input and return a list of suggestions.

Import from the `c` namespace:

```ts
import { c } from "pi-extension-settings/sdk/hooks";
```

Assign to the `complete` field of a `Text` node:

```ts
S.text({ description: "Config path", default: "", complete: c.filePath() });
```

## Type signature

Completers conform to the `CompleteFn` type:

```ts
type CompleteFn = (partial: string) => Promise<string[]>;
```

Completers run independently from validation — they never block a save.

## `c.filePath()`

Provides filesystem path completions. Behaves similarly to shell tab-completion.

```ts
complete: c.filePath();
```

**Behavior:**

- Expands a leading `~` to the user's home directory before listing.
- Lists directory contents for the path prefix the user has typed.
- Directory names are returned with a trailing `/` so the user can continue drilling down.
- Files are returned as-is.
- If the partial input is empty, lists the current directory.

**Example completions:**

| User types  | Suggestions returned                                       |
| ----------- | ---------------------------------------------------------- |
| `""`        | `["/Users/alice/", "/etc/", ...]`                          |
| `"~/pro"`   | `["/Users/alice/projects/", "/Users/alice/profile.txt"]`   |
| `"~/.ssh/"` | `["/Users/alice/.ssh/id_rsa", "/Users/alice/.ssh/config"]` |

Typically combined with `t.expandPath()` and `d.path()`:

```ts
S.text({
  description: "Config file",
  default: "~/.config/app.json",
  validation: v.filePath(),
  transform: t.pipe(t.trim(), t.expandPath()),
  complete: c.filePath(),
  display: d.path(),
});
```

## `c.staticList(values)`

Provides completions from a fixed list of strings. Matches are case-insensitive and filtered by prefix.

```ts
complete: c.staticList(["dark", "light", "system", "high-contrast"]);
```

**Behavior:**

- If the partial input is empty, returns all values.
- If the partial input is non-empty, returns values that start with the partial input (case-insensitive).

**Example completions:**

| User types | Suggestions returned                           |
| ---------- | ---------------------------------------------- |
| `""`       | `["dark", "light", "system", "high-contrast"]` |
| `"d"`      | `["dark"]`                                     |
| `"l"`      | `["light"]`                                    |
| `"HIGH"`   | `["high-contrast"]`                            |

Useful for `Text` nodes that accept values from a known set but where `Enum` is too restrictive (e.g., the user can also type a custom value):

```ts
S.text({
  description: "Language",
  default: "en",
  complete: c.staticList(["en", "fr", "de", "es", "ja", "zh"]),
});
```

## Custom completers

You can write your own completer by providing a function that matches the `CompleteFn` signature:

```ts
import type { CompleteFn } from "pi-extension-settings/sdk";

const myCompleter: CompleteFn = async (partial) => {
  const all = await fetchFromApi("/options");
  return all.filter((v) => v.startsWith(partial));
};

S.text({
  description: "Remote resource",
  default: "",
  complete: myCompleter,
});
```

---

<sup>Documentation drafted with AI assistance — Claude Opus 4.6 (Anthropic). Reviewed by a human maintainer before publishing.</sup>
