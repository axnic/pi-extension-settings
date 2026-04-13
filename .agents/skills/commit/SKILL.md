---
name: commit
description: >
  Generates conventional commit messages for this project. Use when asked to
  commit changes, write a commit message, stage files, or prepare a commit.
  Enforces conventional commit format with mandatory scope, WHY-focused body,
  Co-authored-by transparency trailer, DCO sign-off, and cryptographic signature.
compatibility: Requires git
allowed-tools: Bash(git:*)
---

# Conventional Commit Skill

This project follows [Conventional Commits](https://www.conventionalcommits.org/).

## Commit format

```text
<type>(<scope>): <Subject starting with uppercase>

<body — one or more paragraphs explaining WHY>

<footer — Co-authored-by and Signed-off-by trailers>
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

For good/bad examples and a full commit sample, read `references/body-guide.md`.

## Gathering context before writing

If the context needed to write a meaningful body is missing:

1. **Ask the user** — one focused question: "What problem does this change
   solve?" or "Why was this approach chosen over X?".
2. **Infer from the diff** — run `git diff --staged` (or `git diff HEAD` for
   already-committed changes) and `git log --oneline -10` to read the
   surrounding history. Flag any assumptions with "Based on the diff, this
   appears to …".

Never fabricate motivation. If context cannot be inferred, ask.

## Co-authored-by — required

**Every AI-assisted commit must include a `Co-authored-by` trailer.**

| Tool                           | Trailer                                                                |
| ------------------------------ | ---------------------------------------------------------------------- |
| GitHub Copilot (any model)     | `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` |
| Claude (Anthropic, direct)     | `Co-authored-by: Claude Sonnet 4.6 <claude@anthropic.com>`             |
| GPT / ChatGPT (OpenAI, direct) | `Co-authored-by: Codex <chatgpt@openai.com>`                           |

If the user declines the trailer: acknowledge, explain the project convention,
and still propose the full message with the trailer. The final decision is
theirs, but the policy must be surfaced — omitting it silently is not acceptable.

## Sign-off and cryptographic signature — both required

```sh
git commit -s -S -m "<message>"
# -s  adds Signed-off-by (DCO)
# -S  adds cryptographic signature (SSH/GPG)
```

For GPG vs SSH setup details, read `references/signing.md`.
