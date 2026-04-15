# Issue Template Field Reference

Source: `.github/ISSUE_TEMPLATE/bug.yml` and `.github/ISSUE_TEMPLATE/feature.yml`

## Area options (both templates)

Present these options when asking which part of the project is affected.

**Bug report label:** `Area`
**Feature request label:** `Area`

```
- SDK – schema builders (S.*)
- SDK – hooks (validators, transforms, completers, display)
- SDK – ExtensionSettings class
- Extension – TUI panel / UI
- Extension – storage / settings persistence
- Extension – event protocol
- Docs / README
- Tooling / build / tests
- Not sure
```

## Type of change options (feature request only)

Present these options when asking what kind of change is proposed.

```
- New capability (adds something that doesn't exist)
- Improvement (enhances an existing feature)
- Developer experience (DX / ergonomics)
- Performance
- Other
```

## Label mapping

| Issue type      | Labels applied                |
| --------------- | ----------------------------- |
| Bug report      | `bug`, `needs-triage`         |
| Feature request | `enhancement`, `needs-triage` |

## Template placeholders reference

### Bug report body template

```
### Summary
{summary}

### Area
{area}

### Package version
{version}

### Node.js version
{node-version}

### Steps to reproduce
{steps}

### Expected behavior
{expected}

### Actual behavior
{actual}

### Additional context
{extra}
```

### Feature request body template

```
### Summary
{summary}

### Area
{area}

### Type of change
{type}

### Motivation / problem
{motivation}

### Proposed solution
{proposal}

### Alternatives considered
{alternatives}

### Additional context
{extra}
```

## Repo contact links (from `config.yml`)

- **Security vulnerability** → https://github.com/xunleii/pi-extension-settings/security/advisories/new
  _(Do NOT open a public issue — always redirect the user here)_
- **Question / discussion** → https://github.com/xunleii/pi-extension-settings/discussions
  _(For questions and ideas that aren't actionable bugs or features, redirect here)_
