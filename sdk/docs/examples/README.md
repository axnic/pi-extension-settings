# Examples

Three annotated examples demonstrate progressively more advanced SDK features. Start with the Weather Widget if you are new to the SDK.

## Examples at a glance

| Example                               | Complexity   | Features demonstrated                                                       |
| ------------------------------------- | ------------ | --------------------------------------------------------------------------- |
| [Weather Widget](./weather-widget.md) | Beginner     | `S.text`, `S.boolean`, `S.enum`, `v.regex`, `v.notEmpty`                    |
| [Code Formatter](./code-formatter.md) | Intermediate | `S.section`, `S.list`, `S.struct`, `v.integer`, `getAll()`                  |
| [AI Assistant](./ai-assistant.md)     | Advanced     | Nested sections, `S.dict`, `InferConfig`, `v.*`, `t.*`, `d.*`, `onChange()` |

## Source files

The full source code and specs live in the SDK's `examples/` directory:

```
sdk/examples/
├── 01-weather-widget/
│   ├── extension.ts       # Source
│   └── extension.spec.ts  # Unit tests
├── 02-code-formatter/
│   ├── extension.ts
│   └── extension.spec.ts
└── 03-ai-assistant/
    ├── extension.ts
    └── extension.spec.ts
```

Each example exports a factory function (`createWeatherWidget`, `createCodeFormatter`, `createAiAssistant`) that accepts a `pi: ExtensionAPI` object and returns a typed handle. This pattern makes extensions testable — the unit tests pass a mock `pi` object without touching the real session.

---

<sup>Documentation drafted with AI assistance — Claude Opus 4.6 (Anthropic). Reviewed by a human maintainer before publishing.</sup>
