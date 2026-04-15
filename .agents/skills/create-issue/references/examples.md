# Issue Examples

Good and bad examples to calibrate quality before creating an issue.

## Title quality

### Bug report titles

| ✅ Good                                                 | ❌ Bad                      |
| ------------------------------------------------------- | --------------------------- |
| `S.number() validator fires on optional empty field`    | `Bug in number validator`   |
| `Enter key does not commit edits on number inputs`      | `Enter key issue`           |
| `Panel crashes on startup when no schema is registered` | `Fix crash`                 |
| `settings.get() returns undefined for unset nested key` | `settings.get doesn't work` |

**Rule:** The title should describe the **symptom** or **broken behaviour** —
not the suspected fix, and not a generic label like "bug" or "issue".

### Feature request titles

| ✅ Good                                                     | ❌ Bad                          |
| ----------------------------------------------------------- | ------------------------------- |
| `Add S.color() builder for hex color settings`              | `New builder`                   |
| `t.pipe() helper for composing transform hooks`             | `Add pipe function`             |
| `Render documentation Markdown using marked-terminal`       | `Markdown support`              |
| `Rename description field to documentation with min length` | `description field improvement` |

**Rule:** The title should describe **what capability is added** or **what
changes** — concrete enough that a developer understands scope immediately.

---

## Completed issue bodies

### Bug report example

**Title:** `Enter key does not commit edits on number inputs`

```markdown
### Summary

Pressing Enter while editing a number leaf does not save the value; the panel
stays in edit mode. Text inputs commit on Enter as expected.

### Area

Extension – TUI panel / UI

### Package version

0.4.0

### Node.js version

v22.11.0

### Steps to reproduce

1. Open `/extensions:settings` in pi.
2. Navigate to any setting with a `S.number()` node.
3. Press Enter to start editing.
4. Type a new number.
5. Press Enter to confirm.

### Expected behavior

The edited value is saved and the panel exits edit mode, identical to text inputs.

### Actual behavior

The cursor remains in edit mode; the value is not persisted. Pressing Escape
discards the edit as expected.

### Additional context

Tested on macOS 14.4, pi version 1.2.3.
```

---

### Feature request example

**Title:** `Add t.pipe() helper for composing transform hooks`

````markdown
### Summary

Add a `t.pipe(...transforms)` helper that chains multiple transform hooks
left-to-right, so extension authors don't have to nest calls manually.

### Area

SDK – hooks (validators, transforms, completers, display)

### Type of change

New capability (adds something that doesn't exist)

### Motivation / problem

When multiple transforms are needed (e.g., trim, then normalise URL, then
lowercase), authors write `t.trim(t.normalizeUrl(t.lowercase(value)))`.
The nesting order is counter-intuitive (right-to-left) and breaks when
adding a fourth transform.

### Proposed solution

```ts
// Before
transform: (v) => t.trim(t.normalizeUrl(v));

// After
transform: t.pipe(t.trim, t.normalizeUrl);
```
````

`t.pipe` accepts an arbitrary number of transform functions and returns a
single function that applies them left-to-right.

### Alternatives considered

Operator-style pipeline (`value |> t.trim |> t.normalizeUrl`) was considered
but the TC39 pipeline proposal is still Stage 2 and cannot be used in a
library targeting Node ≥ 22.

### Additional context

Related: #42 (t.normalizeUrl implementation).

```

```
