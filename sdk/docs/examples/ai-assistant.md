# Example: AI Assistant

**Source:** `sdk/examples/03-ai-assistant/extension.ts`

A comprehensive settings integration for an LLM-backed assistant. This example demonstrates the full range of SDK features: deeply nested sections, `S.dict`, `InferConfig`, validators, transforms, and display functions working together.

**Concepts demonstrated:** Nested `S.section`, `S.list`, `S.dict`, `InferConfig`, `v.url`, `v.range`, `v.integer`, `t.normalizeUrl`, `t.trim`, `d.badge`, `onChange`, `getAll`

---

## Schema overview

```text
schema
├── endpoint          (Text)     — API URL, validated + normalized + badged
├── apiKey            (Text)     — authentication token
├── model             (Section)
│   ├── name          (Enum)     — model identifier with badge display
│   └── sampling      (Section)  ← nested section
│       ├── temperature (Number) — float 0–2
│       ├── maxTokens   (Number) — integer 1–32768
│       └── topP        (Number) — float 0–1
├── prompt            (Section)
│   ├── system        (Text)     — system prompt, trimmed
│   └── locale        (Enum)     — response language
├── context           (Section)
│   ├── maxTurns      (Number)    — integer 1–100
│   └── pinned        (List)     — always-on system messages
│       └── items: { label, content, enabled }
├── extraHeaders      (Dict)     — arbitrary HTTP headers
├── streamResponses   (Boolean)  — SSE streaming toggle
└── logRequests       (Boolean)  — debug logging toggle
```

---

## Validators and transforms on numeric and text nodes

```ts
endpoint: S.text({
  tooltip: "API endpoint URL",
  default: "https://api.openai.com/v1",
  validation: v.url(), // must be a valid http/https URL
  transform: t.normalizeUrl(), // lowercase hostname, ensure trailing /
  display: d.badge("#6366f1"), // indigo badge in the settings panel
});
```

```ts
temperature: S.number({
  tooltip: "Temperature (0 – 2)",
  default: 0.7,
  validation: v.range({ min: 0, max: 2 }), // float in [0, 2]
});
```

```ts
system: S.text({
  tooltip: "System prompt",
  default: "You are a helpful coding assistant.",
  transform: t.trim(), // strip accidental leading/trailing whitespace
});
```

---

## Deeply nested sections

Sections can be nested to any depth. `InferConfig` flattens the hierarchy using dot-separated key paths:

```ts
model: S.section({
  tooltip: "Model",
  children: {
    name: S.enum({ tooltip: "Model name", default: "gpt-4o-mini", values: [...] }),
    sampling: S.section({
      tooltip: "Sampling",
      children: {
        temperature: S.number({ tooltip: "Temperature", default: 0.7, validation: v.range({ min: 0, max: 2 }) }),
        maxTokens:   S.number({ tooltip: "Max output tokens", default: 2048, validation: v.all(v.integer(), v.range({ min: 1, max: 32768 })) }),
        topP:        S.number({ tooltip: "Top-p", default: 1, validation: v.range({ min: 0, max: 1 }) }),
      },
    }),
  },
})
```

The resulting flat keys:

```ts
settings.get("model.name"); // string
settings.get("model.sampling.temperature"); // number
settings.get("model.sampling.maxTokens"); // number
settings.get("model.sampling.topP"); // number
```

---

## `InferConfig` type alias

The example exports the inferred config type so it can be used across the extension:

```ts
import type { InferConfig } from "pi-extension-settings/sdk";
export type AiConfig = InferConfig<typeof schema>;
```

`AiConfig` is equivalent to:

```ts
type AiConfig = {
  endpoint: string;
  apiKey: string;
  "model.name": string;
  "model.sampling.temperature": number;
  "model.sampling.maxTokens": number;
  "model.sampling.topP": number;
  "prompt.system": string;
  "prompt.locale": string;
  "context.maxTurns": number;
  "context.pinned": ListItem[];
  extraHeaders: Record<string, string>;
  streamResponses: boolean;
  logRequests: boolean;
};
```

---

## Dict for HTTP headers

`S.dict` stores arbitrary key/value string pairs — perfect for user-defined HTTP headers:

```ts
extraHeaders: S.dict({
  tooltip: "Extra HTTP headers",
  description: "Arbitrary headers forwarded with every API request.",
  addLabel: "Add header",
  // default: {} (implicit)
});
```

Reading in `buildRequest()`:

```ts
const headers = {
  "Content-Type": "application/json",
  ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
  ...config.extraHeaders, // Record<string, string> — spread directly
};
```

---

## `buildRequest()` — reading the full snapshot

```ts
function buildRequest(opts: AiRequestOptions): AiRequest {
  const config = settings.getAll(); // typed snapshot

  return {
    url: `${config.endpoint}/chat/completions`,
    headers: {
      "Content-Type": "application/json",
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      ...config.extraHeaders,
    },
    body: {
      model: config["model.name"],
      messages: opts.messages,
      max_tokens: config["model.sampling.maxTokens"],
      temperature: config["model.sampling.temperature"],
      top_p: config["model.sampling.topP"],
      stream: config.streamResponses,
    },
  };
}
```

Using `getAll()` instead of individual `get()` calls ensures the entire request is built from a consistent snapshot of settings.

---

## `buildSystemPrompt()` — using a List

```ts
function buildSystemPrompt(): string {
  const base = settings.get("prompt.system");
  const pinned = settings.get("context.pinned") as PinnedMessage[];
  const active = pinned.filter((m) => m.enabled).map((m) => m.content);
  return [base, ...active].filter(Boolean).join("\n\n");
}
```

The `context.pinned` list returns `ListItem[]`. Cast it to the concrete struct type (`PinnedMessage[]`) to access named fields with type safety.

---

## `onClientChange()` — targeted subscriptions

Instead of subscribing to all settings, the assistant subscribes only to keys that require rebuilding the HTTP client:

```ts
settings.onChange("endpoint", notifyClientChange);
settings.onChange("apiKey", notifyClientChange);
settings.onChange("model.name", notifyClientChange);
settings.onChange("extraHeaders", notifyClientChange);
```

Callers register with `onClientChange(cb)` and the extension manages the internal listener list.

---

## Usage

```ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createAiAssistant } from "./extension.ts";

export function activate(pi: ExtensionAPI) {
  const assistant = createAiAssistant(pi);

  pi.registerCommand("ai.complete", async () => {
    if (!assistant.isAuthenticated() && !assistant.isLocalModel()) {
      pi.notify("Configure an API key first");
      return;
    }

    const request = assistant.buildRequest({
      messages: [
        { role: "system", content: assistant.buildSystemPrompt() },
        { role: "user", content: pi.editor.getSelectedText() },
      ],
    });

    const response = await fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(request.body),
    });

    // handle response...
  });

  assistant.onClientChange(() => {
    console.log("AI client config changed — reconnecting");
  });
}
```

---

<sup>Documentation drafted with AI assistance — Claude Opus 4.6 (Anthropic). Reviewed by a human maintainer before publishing.</sup>
