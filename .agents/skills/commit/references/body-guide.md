# Commit Body Guide

## Good body — explains WHY

```text
The settings panel crashed on startup when no extension had registered a
schema yet. The root cause was that the registry iterated over an undefined
map on first access instead of returning an empty iterator.

Returning an empty map as the default value was chosen over lazy
initialization because it keeps the read path free of null checks and
avoids a separate initialisation step that callers would have to trigger.
```

## Bad body — describes the diff, not the reason

```text
Added a null check in registry.ts. Changed the return type to include
an empty map. Updated the tests to cover the new case.
```

## Full commit example

```text
feat(sdk): Add pipe composition helper for transform hooks

The SDK exposed individual transform hooks (t.trim, t.normalizeUrl, …)
but provided no ergonomic way to chain them. Extension authors were
working around this by nesting calls — t.trim(t.normalizeUrl(value)) —
which was hard to read and easy to get wrong when the order mattered.

A dedicated t.pipe(...transforms) helper was chosen over an operator-style
API (value |> t.trim |> t.normalizeUrl) because the pipeline proposal is
still stage 2 and we cannot depend on it in a library targeting Node ≥24.
A class-based builder (new Transform().pipe(…).pipe(…)) was also
considered but rejected as too heavyweight for what is essentially a
one-liner convenience.

Co-authored-by: Claude Sonnet 4.6 <claude@anthropic.com>
Signed-off-by: Your Name <your@email.com>
```
