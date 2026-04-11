---
name: commit
description: >
  Generates conventional commit messages for this project. Use this skill
  whenever you are asked to commit changes, write a commit message, or stage
  and commit files. The skill enforces the WHY-focused body style and the
  mandatory Co-authored-by transparency trailer.
---

# Conventional Commit Skill

This project follows [Conventional Commits](https://www.conventionalcommits.org/).

## Commit format

```
<type>(<scope>): <Subject starting with uppercase>

<body — one or more paragraphs explaining WHY>

<footer — Co-authored-by trailers>
```

## Types

| Type       | When to use                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | A new feature or capability                             |
| `fix`      | A bug fix                                               |
| `docs`     | Documentation-only changes                              |
| `style`    | Code style / formatting, no logic change                |
| `refactor` | Code restructuring, no feature or bug fix               |
| `perf`     | Performance improvement                                 |
| `test`     | Add or update tests                                     |
| `build`    | Build system, toolchain, or external dependency changes |
| `ci`       | CI/CD configuration changes                             |
| `chore`    | Maintenance that touches neither src nor tests          |
| `revert`   | Reverts a previous commit                               |

## Scopes

| Scope      | What it covers                            |
| ---------- | ----------------------------------------- |
| `sdk`      | SDK library (`sdk/`)                      |
| `ui`       | TUI settings panel (`src/ui/`)            |
| `core`     | Core extension logic (`src/core/`)        |
| `settings` | Own-settings schema (`src/settings.ts`)   |
| `docs`     | Documentation                             |
| `deps`     | Dependency updates                        |
| `tooling`  | Dev tooling (mise, biome, lefthook, etc.) |

## The body — WHY, not WHAT

The body is **required** and must explain:

- **Why** this change is being made (the motivation, the problem it solves)
- **What alternatives were considered** and why they were rejected
- **Trade-offs or limitations** the reviewer should be aware of

The body must **never** describe what the diff already shows. The diff shows
_what_ changed; the body tells the story _behind_ the change.

**Good body:**

```
The settings panel crashed on startup when no extension had registered a
schema yet. The root cause was that the registry iterated over an undefined
map on first access instead of returning an empty iterator.

Returning an empty map as the default value was chosen over lazy
initialization because it keeps the read path free of null checks and
avoids a separate initialisation step that callers would have to trigger.
```

**Bad body (describes the diff, not the reason):**

```
Added a null check in registry.ts. Changed the return type to include
an empty map. Updated the tests to cover the new case.
```

## Gathering context before writing

If the context needed to write a meaningful body is missing:

1. **Ask the user** — one focused question: "What problem does this change
   solve?" or "Why was this approach chosen over X?".
2. **Infer from the diff** — run `git diff --staged` (or `git diff HEAD` for
   already-committed changes) and `git log --oneline -10` to read the
   surrounding history. Use this to infer the intent, but flag any
   assumptions in the body with "Based on the diff, this appears to …".

Never fabricate motivation. If context cannot be inferred, ask.

## Co-authored-by — required, non-negotiable

**Every AI-assisted commit must include a `Co-authored-by` trailer.**

This project is built with AI assistance and treats that as a transparency
commitment, not a caveat to hide. The trailer goes in the footer, separated
from the body by a blank line.

Use the trailer matching the AI tool that generated or materially shaped the
commit:

| Tool                           | Trailer (example)                                                      |
| ------------------------------ | ---------------------------------------------------------------------- |
| GitHub Copilot (any model)     | `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` |
| Claude (Anthropic, direct)     | `Co-authored-by: Claude Sonnet 4.6 <claude@anthropic.com>`             |
| GPT / ChatGPT (OpenAI, direct) | `Co-authored-by: Codex <chatgpt@openai.com>`                           |

If the user says they do not want the trailer: acknowledge their choice,
explain that the project convention exists for transparency (the entire
commit history carries it), and still propose the full message with the
trailer included. The final decision is theirs, but the policy must be
surfaced explicitly — omitting it silently is not acceptable.

## Sign-off — required

**Every commit must be signed off** using `git commit --signoff` (or `-s`).

This adds a `Signed-off-by` trailer certifying that the contribution complies
with the project's Developer Certificate of Origin (DCO).

```
Signed-off-by: Your Name <your@email.com>
```

The sign-off trailer goes in the footer alongside any `Co-authored-by` trailers.

## Cryptographic signature — required

**Every commit must also be cryptographically signed** (SSH or GPG) so that
authorship can be verified independently of the DCO sign-off.

- **GPG:** `git commit -S` (configure `user.signingkey` in `.gitconfig`).
- **SSH:** set `gpg.format = ssh` and `user.signingkey` to your public key path,
  then `git commit -S` works the same way.
- To sign all commits automatically: `git config --global commit.gpgsign true`.

Use `git log --show-signature` or `git verify-commit <sha>` to confirm a commit
is correctly signed before pushing.

## Full example

```
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
