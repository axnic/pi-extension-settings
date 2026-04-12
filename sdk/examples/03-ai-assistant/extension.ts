/**
 * Example 03 — AI Assistant extension
 *
 * A realistic extension that wires an LLM-backed assistant into pi. It
 * demonstrates the more advanced SDK features:
 *
 *   - Nested `S.section()` nodes  → "model", "model.sampling", "context", …
 *   - `S.list()`                  → conversation history (context window)
 *   - `S.dict()`                  → custom HTTP headers sent with every request
 *   - `v.*` validators            → temperature range, URL, notEmpty
 *   - `t.*` transforms            → trim, normalizeUrl
 *   - `d.*` display functions     → badge for model name
 *   - `onChange()`                → reload the client when endpoint or model changes
 *
 * Public API exported by this module:
 *
 *   createAiAssistant(pi)  → returns the assistant handle used by the extension
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { InferConfig } from "../../index.ts";
import { d, ExtensionSettings, S, t, v } from "../../index.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

export const schema = S.settings({
  // ── Top-level: API endpoint ─────────────────────────────────────────────────
  endpoint: S.text({
    tooltip: "API endpoint URL",
    description: [
      "## API Endpoint",
      "Base URL of the OpenAI-compatible API server.",
      "Examples: `https://api.openai.com/v1`, `http://localhost:11434/v1`",
    ].join("\n"),
    default: "https://api.openai.com/v1",
    validation: v.url(),
    transform: t.normalizeUrl(),
    display: d.badge("#6366f1"),
  }),

  apiKey: S.text({
    tooltip: "API key (leave empty for local models)",
    default: "",
  }),

  // ── Section: model & sampling ───────────────────────────────────────────────
  model: S.section({
    tooltip: "Model",
    description: "Which model to use and how to sample from it.",
    children: {
      name: S.enum({
        tooltip: "Model name",
        default: "gpt-4o-mini",
        values: [
          { value: "gpt-4o", label: "GPT-4o" },
          { value: "gpt-4o-mini", label: "GPT-4o mini" },
          { value: "o3-mini", label: "o3 mini" },
          { value: "claude-sonnet", label: "Claude Sonnet" },
          { value: "custom", label: "Custom (see endpoint)" },
        ],
        display: d.badge("#10b981"),
      }),

      // Nested section — flattened to "model.sampling.*"
      sampling: S.section({
        tooltip: "Sampling",
        children: {
          temperature: S.number({
            tooltip: "Temperature (0 – 2)",
            description:
              "Controls randomness. 0 = deterministic, 2 = very creative.",
            default: 0.7,
            validation: v.range({ min: 0, max: 2 }),
          }),

          maxTokens: S.number({
            tooltip: "Max output tokens",
            default: 2048,
            validation: v.all(v.integer(), v.range({ min: 1, max: 32768 })),
          }),

          topP: S.number({
            tooltip: "Top-p (nucleus sampling, 0 – 1)",
            default: 1,
            validation: v.range({ min: 0, max: 1 }),
          }),
        },
      }),
    },
  }),

  // ── Section: prompt ─────────────────────────────────────────────────────────
  prompt: S.section({
    tooltip: "Prompt",
    children: {
      system: S.text({
        tooltip: "System prompt",
        description:
          "Injected as the first `system` message in every conversation.",
        default:
          "You are a helpful coding assistant embedded in a terminal IDE.",
        transform: t.trim(),
      }),

      locale: S.enum({
        tooltip: "Response language",
        default: "en",
        values: [
          { value: "en", label: "English" },
          { value: "fr", label: "Français" },
          { value: "de", label: "Deutsch" },
          { value: "es", label: "Español" },
          { value: "ja", label: "日本語" },
        ],
      }),
    },
  }),

  // ── Section: context window ──────────────────────────────────────────────────
  context: S.section({
    tooltip: "Context window",
    children: {
      maxTurns: S.number({
        tooltip: "Max conversation turns kept in context",
        default: 10,
        validation: v.all(v.integer(), v.range({ min: 1, max: 100 })),
      }),

      pinned: S.list({
        tooltip: "Pinned system messages",
        description: [
          "Extra system messages always prepended to every request.",
          "Useful for project-specific instructions that persist across sessions.",
        ].join("\n"),
        addLabel: "Pin a message",
        items: S.struct({
          properties: {
            label: S.text({ tooltip: "Short label", default: "" }),
            content: S.text({ tooltip: "Message body", default: "" }),
            enabled: S.boolean({ tooltip: "Active", default: true }),
          },
        }),
      }),
    },
  }),

  // ── Extra HTTP headers (dict) ────────────────────────────────────────────────
  extraHeaders: S.dict({
    tooltip: "Extra HTTP headers",
    description:
      "Arbitrary headers forwarded with every API request. Useful for proxies.",
    addLabel: "Add header",
  }),

  // ── Feature flags ────────────────────────────────────────────────────────────
  streamResponses: S.boolean({
    tooltip: "Stream responses",
    description: "Use server-sent events to stream tokens as they arrive.",
    default: true,
  }),

  logRequests: S.boolean({
    tooltip: "Log requests to console",
    default: false,
  }),
});

// ─── Inferred config type ─────────────────────────────────────────────────────

export type AiConfig = InferConfig<typeof schema>;

// ─── Assistant handle ─────────────────────────────────────────────────────────

export interface PinnedMessage {
  label: string;
  content: string;
  enabled: boolean;
}

export interface AiRequestOptions {
  /** Messages to send (user turn is appended by the caller). */
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
}

export interface AiRequest {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

export interface AiAssistant {
  /**
   * Build the full fetch request for a completion. Reads the current settings
   * snapshot so every call reflects live config without any restart.
   */
  buildRequest(opts: AiRequestOptions): AiRequest;

  /**
   * Compose the full system prompt: the base `prompt.system` text, followed
   * by every pinned message that is currently enabled.
   */
  buildSystemPrompt(): string;

  /** True when the extension has a non-empty API key configured. */
  isAuthenticated(): boolean;

  /** True when the configured endpoint looks like a local server. */
  isLocalModel(): boolean;

  /**
   * Register a callback invoked whenever a setting that affects the HTTP
   * client changes (endpoint, apiKey, model.name, extraHeaders).
   */
  onClientChange(cb: () => void): void;

  /** Expose the settings instance for advanced consumers. */
  readonly settings: ExtensionSettings<typeof schema>;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createAiAssistant(pi: ExtensionAPI): AiAssistant {
  const settings = new ExtensionSettings(pi, "ai-assistant", schema);

  // Reload the HTTP client whenever any of these keys change.
  const clientChangeListeners: Array<() => void> = [];
  const notifyClientChange = () => clientChangeListeners.forEach((cb) => cb());

  settings.onChange("endpoint", notifyClientChange);
  settings.onChange("apiKey", notifyClientChange);
  settings.onChange("model.name", notifyClientChange);
  settings.onChange("extraHeaders", notifyClientChange);

  // ── Public methods ───────────────────────────────────────────────────────────

  function buildRequest(opts: AiRequestOptions): AiRequest {
    const config = settings.getAll();

    const url = `${config.endpoint}/chat/completions`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      ...config.extraHeaders,
    };

    const body: Record<string, unknown> = {
      model: config["model.name"],
      messages: opts.messages,
      max_tokens: config["model.sampling.maxTokens"],
      temperature: config["model.sampling.temperature"],
      top_p: config["model.sampling.topP"],
      stream: config.streamResponses,
    };

    return { url, headers, body };
  }

  function buildSystemPrompt(): string {
    const base = settings.get("prompt.system");
    const pinned = settings.get("context.pinned") as PinnedMessage[];
    const active = pinned.filter((m) => m.enabled).map((m) => m.content);

    return [base, ...active].filter(Boolean).join("\n\n");
  }

  function isAuthenticated(): boolean {
    return settings.get("apiKey").trim().length > 0;
  }

  function isLocalModel(): boolean {
    const endpoint = settings.get("endpoint");
    try {
      const { hostname } = new URL(endpoint);
      return (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "[::1]"
      );
    } catch {
      return false;
    }
  }

  function onClientChange(cb: () => void): void {
    clientChangeListeners.push(cb);
  }

  return {
    buildRequest,
    buildSystemPrompt,
    isAuthenticated,
    isLocalModel,
    onClientChange,
    settings,
  };
}
