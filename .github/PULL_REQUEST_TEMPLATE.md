<!--
  ---------------------------------------------------------------------------
  Pull Request Template
  ---------------------------------------------------------------------------
  Thanks for contributing! Please fill in each section below.
  Delete any section that isn't relevant -- but keep the checklist complete.

  For AI agents: see .agents/skills/ for guidance on how to fill this template.
  ---------------------------------------------------------------------------
-->

## Summary

<!-- One sentence: what does this PR do? -->

## Why

<!-- Why is this change needed? What problem does it solve or improve?
     Link any related issue(s) below. -->

Closes #<!-- issue number, or "N/A" -->

## What changed

<!-- Brief description of the approach and key changes.
     Bullet points work well here. -->

-

## How to validate

<!-- How can a reviewer (or CI) confirm this works correctly?
     Include manual steps, test commands, or screenshots as needed. -->

```sh
pnpm test
mise run lint
```

<!-- Add any additional manual steps here. -->

## Impact

<!-- Does this introduce breaking changes, deprecations, or migration steps?
     Could it affect performance, security, or storage compatibility? -->

- [ ] No breaking changes
- [ ] Breaking change — describe below:

<!-- Describe breaking changes and migration steps if applicable. -->

---

## Checklist

<!-- Please check every item before requesting a review.
     Unchecked items will be discussed during review — don't worry if
     something doesn't apply, just leave it unchecked and add a note. -->

### Code quality

- [ ] `pnpm test` passes locally
- [ ] `mise run lint` passes locally (or `mise run lint:fix` was run)
- [ ] New behaviour is covered by tests (unit or integration)
- [ ] No debug code, `console.log`, or temporary hacks left in

### Documentation

- [ ] Public SDK changes are reflected in `sdk/index.ts` (new exports added/removed)
- [ ] `sdk/docs/` updated if public API changed (reference, hook docs, node-types, schema-builder)
- [ ] `sdk/docs/README.md` hook counts updated if hooks were added/removed
- [ ] If this PR was created or filled by an AI agent, indicate it here and confirm a human reviewed the changes (tool and review status).

### Commits

- [ ] Commits follow [Conventional Commits](https://www.conventionalcommits.org/) with a required scope
      (`sdk` | `ui` | `core` | `settings` | `docs` | `deps` | `tooling`)
- [ ] Each commit is focused and self-contained

### Legal

- [ ] **DCO** — every commit includes a `Signed-off-by` trailer
      (`git commit --signoff`, or `git commit -s`).
      By signing off you certify that you wrote the code and have the right
      to submit it under the project's [Apache-2.0 licence](../blob/main/LICENSE),
      per the [Developer Certificate of Origin v1.1](https://developercertificate.org/).
- [ ] **CLA** — if you are contributing on behalf of an employer or under a
      different copyright, ensure your organisation has agreed to the project's
      CLA (or open a discussion with the maintainer first).
