---
name: release
description: >
  Creates a versioned release for this project. Use when asked to cut a
  release, bump a version, create an RC, or publish a new version. Triggers
  the release workflow via the GitHub CLI and explains the bump type options.
compatibility: Requires GitHub CLI (gh)
allowed-tools: Bash(gh:*)
---

# Release Skill

Releases are fully automated via the `workflow_dispatch.release.yaml` workflow.
Never bump versions or create tags manually — always go through the workflow.

## Trigger a release

```sh
gh workflow run workflow_dispatch.release.yaml \
  --repo axnic/pi-extension-settings \
  --field bump=<bump-type>
```

Add `--field notes="..."` to override the auto-generated release notes.

## Bump types

| Type       | What it does                                                                 |
| ---------- | ---------------------------------------------------------------------------- |
| `patch`    | Stable release — increments patch from last stable tag (e.g. 0.1.0 → 0.1.1)  |
| `minor`    | Stable release — increments minor (e.g. 0.1.0 → 0.2.0)                       |
| `major`    | Stable release — increments major (e.g. 0.1.0 → 1.0.0)                       |
| `rc-patch` | Release candidate for next patch (e.g. 0.1.1-rc.1, or increments rc counter) |
| `rc-minor` | Release candidate for next minor                                             |
| `rc-major` | Release candidate for next major                                             |

**Rule of thumb:**

- Use `rc-*` first to validate on npm before a stable release.
- Use `patch` for bug fixes and CI/tooling changes with no API impact.
- Use `minor` for new hooks, builders, or SDK additions (backwards-compatible).
- Use `major` for breaking changes to the public SDK API or storage keys.

## What the workflow does

1. Computes the next version from the last git tag.
2. Bumps `version` in `package.json` and `sdk/package.json`.
3. Runs typecheck + tests + build (fails fast if anything is red).
4. Commits the version bump and pushes a `v<version>` tag.
5. Generates release notes (deterministic draft + Copilot polish).
6. Opens a GitHub Release (`--prerelease` for RC, `--latest` for stable).
7. `release.publish.yaml` triggers automatically and publishes to npm.

## Publishing to npm

Publishing is handled by `release.publish.yaml` — it fires automatically
when a GitHub Release is published. It:

- Validates (typecheck + tests + build)
- Generates CycloneDX SBOMs via Syft
- Publishes all workspace packages to npm with OIDC provenance (`--provenance`)
- Signs SBOMs and publish summary keylessly via cosign (Sigstore/Rekor)
- Attaches all artefacts to the GitHub Release

No npm token is required — publishing uses npm trusted publishers (OIDC).

## Checking a release run

```sh
gh run list --repo axnic/pi-extension-settings --workflow=workflow_dispatch.release.yaml --limit=5
gh run view <run-id> --repo axnic/pi-extension-settings
```
