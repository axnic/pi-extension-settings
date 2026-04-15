---
name: create-issue
description: >
  Creates a GitHub issue for this repository. Use when asked to open an issue,
  report a bug, request a feature, or file any kind of issue on GitHub. Handles
  both bug reports and feature requests, collects all required fields autonomously,
  and submits via the GitHub CLI. Asks the user only when information cannot be
  inferred.
compatibility: Requires GitHub CLI (gh) authenticated to the repository
allowed-tools: Bash(gh:*) Bash(cat:*) Bash(rm:*) Read
---

# Create GitHub Issue

This repository has two issue types: **Bug report** and **Feature request**.
Blank issues are disabled. Questions belong in Discussions; security
vulnerabilities go to the private Security Advisory — see Rules below.

## Step 1 — Determine issue type

If the user has not explicitly said "bug" or "feature", ask one question:

> "Is this a **bug report** (something isn't working) or a **feature request**
> (a new capability or improvement)?"

## Step 2 — Search for existing issues

Before collecting fields, search for duplicates or related issues using the
title keywords the user has already provided.

```sh
gh issue list --state all --search "<keywords>" --limit 10 \
  --json number,title,state,url \
  --template '{{range .}}#{{.number}} [{{.state}}] {{.title}}\n  {{.url}}\n{{end}}'
```

Run at least two searches: one with the core noun (e.g., `number input`) and
one with the symptom verb (e.g., `Enter commit`). Broaden or narrow keywords
if the first search returns nothing or too much noise.

### What to do with the results

| Situation                      | Action                                                              |
| ------------------------------ | ------------------------------------------------------------------- |
| Exact duplicate found (open)   | Stop. Tell the user and link the existing issue. Do not create.     |
| Exact duplicate found (closed) | Warn the user; ask if they want to reopen or file a new one.        |
| Related issue(s) found         | Note the numbers; add them under "Additional context" as `Refs #N`. |
| No relevant results            | Continue to Step 3.                                                 |

Never silently skip the search. Even for "obviously new" issues, a quick
search takes one command and prevents duplicates.

## Step 3 — Collect required fields

Gather every required field before creating the issue. Apply this priority order:

1. **Provided** — user already stated the value. Use it.
2. **Inferrable** — value can be determined from context or tooling. Infer it
   and tell the user: "I'll use X for `field` — let me know if that's wrong."
3. **Unknown** — ask one focused question. Never ask multiple fields at once.

Never fabricate a value. Never silently skip a required field.

Note: Issue and PR templates include a "Created by" / AI attribution field. When the agent creates or fills an issue or PR on behalf of an AI, set that field to "AI" (or check the AI box) and add a short note naming the tool used and confirming a human review.

### Inference strategies

| Field           | How to infer                                                     |
| --------------- | ---------------------------------------------------------------- |
| Package version | Read `package.json` → `version` field                            |
| Node.js version | Run `node --version` (if available)                              |
| Area            | Map the affected files/components to the closest area option     |
| Type of change  | Infer from the user's description (new thing → "New capability") |

For the **Area** and **Type** dropdown options, read `references/templates.md`.

### Bug report — required fields

| Field              | Question to ask if unknown                                   |
| ------------------ | ------------------------------------------------------------ |
| Summary            | "One sentence: what is the bug?"                             |
| Area               | "Which part of the project is affected?" (list area options) |
| Package version    | Infer from `package.json`; ask if ambiguous                  |
| Steps to reproduce | "What are the minimal steps to reproduce this?"              |
| Expected behavior  | "What should have happened?"                                 |
| Actual behavior    | "What actually happened? Paste any errors or stack traces."  |

**Optional:** Node.js version, additional context.

### Feature request — required fields

| Field              | Question to ask if unknown                                    |
| ------------------ | ------------------------------------------------------------- |
| Summary            | "One sentence: what is the feature?"                          |
| Area               | "Which part of the project would this affect?" (list options) |
| Type of change     | Infer from description; ask if ambiguous (list type options)  |
| Motivation/problem | "Why is this needed? What pain point does it address?"        |
| Proposed solution  | "How should it work? API sketch, pseudocode, or description." |

**Optional:** Alternatives considered, additional context.

## Step 4 — Review title quality

Before confirming, check the summary against these rules:

- **One sentence, ≤ 80 characters.** If longer, suggest a shorter version.
- **Describes the problem or the desired outcome** — not the solution.
  - ✅ `S.number() validator fires on optional empty field`
  - ❌ `Add null check in number validator`
- **No vague words**: avoid "fix", "issue", "problem", "bug" alone in the title.
  - ✅ `Enter key does not commit edits on number inputs`
  - ❌ `Enter key bug`
- **Consistent style** with existing issues: run `gh issue list --limit 10`
  to calibrate tone and style if unsure.

If the title does not meet these rules, propose an improved version and ask the
user to confirm it.

For good vs bad examples, read `references/examples.md`.

## Step 5 — Confirm with a formatted preview

Display the full issue preview before creating, formatted as:

```
Type:    Bug report
Title:   <summary>
Labels:  bug, needs-triage
Area:    <area>
Version: <version>

Steps to reproduce:
  <steps>

Expected: <expected>
Actual:   <actual>
```

Then ask: **"Ready to create this issue?"**

If the user requests edits, update the field and show the preview again. Do
not create until the user explicitly confirms.

## Step 6 — Create the issue

Write the body to a temp file and pass it via `--body-file` to avoid shell
quoting issues.

For body templates and exact field formatting, read `references/templates.md`.

### Bug report

```sh
gh issue create \
  --title "<summary>" \
  --label "bug,needs-triage" \
  --body-file /tmp/gh-issue-body.md
```

### Feature request

```sh
gh issue create \
  --title "<summary>" \
  --label "enhancement,needs-triage" \
  --body-file /tmp/gh-issue-body.md
```

### Label fallback

If `needs-triage` does not exist in the repo, the command will fail. Retry
without it:

```sh
gh issue create --title "..." --label "bug" --body-file /tmp/gh-issue-body.md
```

Tell the user: "The `needs-triage` label was not found — created without it."

## Step 7 — Confirm and clean up

After a successful creation:

1. Output: `Issue #N created: <title>` and the URL returned by `gh`.
2. Run `gh issue view <number>` to verify the issue rendered correctly.
3. Delete `/tmp/gh-issue-body.md`.

If `gh issue create` fails, diagnose with:

- `gh auth status` — authentication problems
- `gh repo view --json nameWithOwner` — wrong repo target
- Inspect the error message for label or permission issues

## Rules

- **Never fabricate** a required field — not even a plausible placeholder.
- **Never create** an issue without explicit user confirmation (Step 4).
- **Never use `--web`** — the agent controls the full workflow non-interactively.
- **Security vulnerabilities** must NOT be public issues. Redirect the user:
  > "Security issues must be reported privately. Please use:
  > https://github.com/xunleii/pi-extension-settings/security/advisories/new"
- **Questions / discussions** do not belong as issues. Redirect to:
  > https://github.com/xunleii/pi-extension-settings/discussions
- If the user explicitly asks to skip confirmation, comply but note the policy.

For body templates, dropdown options, and completed examples, read:

- `references/templates.md` — field options and body formats
- `references/examples.md` — good vs bad titles and completed issue examples
