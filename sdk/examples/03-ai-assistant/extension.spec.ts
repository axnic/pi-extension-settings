/**
 * Example 03 — AI Assistant spec
 *
 * Tests `createAiAssistant()` in full isolation.
 *
 * Mocking strategy
 * ────────────────
 *   - `pi.events.on / emit`         → captured in a local Map so tests replay
 *                                     panel events via `emitChange()`
 *   - `getExtensionSetting`         → controls what individual `get()` calls see
 *   - `setExtensionSetting`         → lets us assert storage writes + transforms
 *   - `getAllSettingsForExtension`  → drives `getAll()` / `buildRequest()`
 *
 * Covers
 * ──────
 *   isAuthenticated()    — non-empty apiKey
 *   isLocalModel()       — endpoint hostname is localhost / 127.0.0.1
 *   buildSystemPrompt()  — base text + active pinned messages
 *   buildRequest()       — full URL, headers (auth, custom), body (sampling)
 *   onClientChange()     — fires for endpoint, apiKey, model.name, extraHeaders
 *   transform behavior   — t.normalizeUrl() on endpoint, t.trim() on prompt.system
 *   settings.set()       — deeply nested dot-notation keys reach storage
 *   settings.getAll()    — full 13-key typed snapshot
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAiAssistant, schema } from "./extension.ts";

// ─── Mock: storage ────────────────────────────────────────────────────────────

vi.mock("@axnic/pi-extension-settings/src/core/storage", () => ({
  getExtensionSetting: vi.fn(),
  setExtensionSetting: vi.fn(),
  getAllSettingsForExtension: vi.fn(),
}));

import {
  getAllSettingsForExtension,
  getExtensionSetting,
  setExtensionSetting,
} from "@axnic/pi-extension-settings/src/core/storage";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePi() {
  const listeners = new Map<string, Array<(data: unknown) => void>>();

  return {
    events: {
      on: vi.fn((event: string, cb: (data: unknown) => void) => {
        const bucket = listeners.get(event) ?? [];
        bucket.push(cb);
        listeners.set(event, bucket);
      }),
      emit: vi.fn((event: string, data?: unknown) => {
        for (const cb of listeners.get(event) ?? []) cb(data!);
      }),
    },
    triggerEvent(event: string, data?: unknown) {
      for (const cb of listeners.get(event) ?? []) cb(data!);
    },
  };
}

/** Simulate the settings panel saving a change for "ai-assistant". */
function emitChange(pi: ReturnType<typeof makePi>, key: string, value: string) {
  pi.triggerEvent("pi-extension-settings:changed", {
    extension: "ai-assistant",
    key,
    value,
  });
}

/**
 * Build a fully-populated storage snapshot using schema defaults + overrides.
 * Used by tests that call `buildRequest()` or `settings.getAll()`.
 */
function makeSnapshot(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    endpoint: "https://api.openai.com/v1",
    apiKey: "",
    "model.name": "gpt-4o-mini",
    "model.sampling.temperature": "0.7",
    "model.sampling.maxTokens": "2048",
    "model.sampling.topP": "1",
    "prompt.system": "You are a helpful coding assistant embedded in a terminal IDE.",
    "prompt.locale": "en",
    "context.maxTurns": "10",
    "context.pinned": "[]",
    extraHeaders: "{}",
    streamResponses: "true",
    logRequests: "false",
    ...overrides,
  };
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe("AiAssistant — createAiAssistant()", () => {
  let pi: ReturnType<typeof makePi>;
  let assistant: ReturnType<typeof createAiAssistant>;

  beforeEach(() => {
    vi.clearAllMocks();
    pi = makePi();
    assistant = createAiAssistant(pi as any);
  });

  // ── pi event wiring ──────────────────────────────────────────────────────────

  describe("pi event wiring", () => {
    it("registers a listener for pi-extension-settings:ready", () => {
      expect(pi.events.on).toHaveBeenCalledWith(
        "pi-extension-settings:ready",
        expect.any(Function)
      );
    });

    it("registers a listener for pi-extension-settings:changed", () => {
      expect(pi.events.on).toHaveBeenCalledWith(
        "pi-extension-settings:changed",
        expect.any(Function)
      );
    });

    it("emits pi-extension-settings:register with the full schema when ready fires", () => {
      pi.triggerEvent("pi-extension-settings:ready");

      expect(pi.events.emit).toHaveBeenCalledWith("pi-extension-settings:register", {
        extension: "ai-assistant",
        nodes: schema,
      });
    });
  });

  // ── isAuthenticated() ────────────────────────────────────────────────────────

  describe("isAuthenticated()", () => {
    it("returns false when the stored apiKey is the empty default", () => {
      vi.mocked(getExtensionSetting).mockReturnValue(undefined); // default = ""
      expect(assistant.isAuthenticated()).toBe(false);
    });

    it("returns false when the stored apiKey is whitespace-only", () => {
      vi.mocked(getExtensionSetting).mockReturnValue("   ");
      expect(assistant.isAuthenticated()).toBe(false);
    });

    it("returns true when a non-empty apiKey is stored", () => {
      vi.mocked(getExtensionSetting).mockReturnValue("sk-abc123");
      expect(assistant.isAuthenticated()).toBe(true);
    });

    it("reads from 'ai-assistant' extension with key 'apiKey'", () => {
      vi.mocked(getExtensionSetting).mockReturnValue(undefined);
      assistant.isAuthenticated();
      expect(getExtensionSetting).toHaveBeenCalledWith("ai-assistant", "apiKey");
    });
  });

  // ── isLocalModel() ───────────────────────────────────────────────────────────

  describe("isLocalModel()", () => {
    it("returns false for the default OpenAI endpoint", () => {
      vi.mocked(getExtensionSetting).mockReturnValue(undefined);
      expect(assistant.isLocalModel()).toBe(false);
    });

    it("returns true when endpoint hostname is 'localhost'", () => {
      vi.mocked(getExtensionSetting).mockReturnValue("http://localhost:11434/v1");
      expect(assistant.isLocalModel()).toBe(true);
    });

    it("returns true when endpoint hostname is '127.0.0.1'", () => {
      vi.mocked(getExtensionSetting).mockReturnValue("http://127.0.0.1:8080/v1");
      expect(assistant.isLocalModel()).toBe(true);
    });

    it("returns true when endpoint hostname is '::1' (IPv6 loopback)", () => {
      vi.mocked(getExtensionSetting).mockReturnValue("http://[::1]:1234/v1");
      expect(assistant.isLocalModel()).toBe(true);
    });

    it("returns false for a remote custom endpoint", () => {
      vi.mocked(getExtensionSetting).mockReturnValue("https://my-proxy.example.com/v1");
      expect(assistant.isLocalModel()).toBe(false);
    });

    it("returns false (rather than throwing) when endpoint is an unparseable string", () => {
      vi.mocked(getExtensionSetting).mockReturnValue("not a url at all");
      expect(() => assistant.isLocalModel()).not.toThrow();
      expect(assistant.isLocalModel()).toBe(false);
    });
  });

  // ── buildSystemPrompt() ──────────────────────────────────────────────────────

  describe("buildSystemPrompt()", () => {
    it("returns just the base system prompt when there are no pinned messages", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) => {
        if (key === "prompt.system") return "You are a helpful assistant.";
        if (key === "context.pinned") return "[]";
        return undefined;
      });
      expect(assistant.buildSystemPrompt()).toBe("You are a helpful assistant.");
    });

    it("returns the schema default system prompt when nothing is stored", () => {
      vi.mocked(getExtensionSetting).mockReturnValue(undefined);
      expect(assistant.buildSystemPrompt()).toContain("helpful coding assistant");
    });

    it("appends enabled pinned messages after the base prompt", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) => {
        if (key === "prompt.system") return "Base prompt.";
        if (key === "context.pinned")
          return JSON.stringify([
            {
              label: "Rule 1",
              content: "Always respond in bullet points.",
              enabled: true,
            },
            { label: "Rule 2", content: "Never use emojis.", enabled: true },
          ]);
        return undefined;
      });
      const result = assistant.buildSystemPrompt();
      expect(result).toContain("Base prompt.");
      expect(result).toContain("Always respond in bullet points.");
      expect(result).toContain("Never use emojis.");
    });

    it("skips pinned messages where enabled is false", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) => {
        if (key === "prompt.system") return "Base prompt.";
        if (key === "context.pinned")
          return JSON.stringify([
            { label: "Active", content: "Keep it brief.", enabled: true },
            { label: "Disabled", content: "Use formal tone.", enabled: false },
          ]);
        return undefined;
      });
      const result = assistant.buildSystemPrompt();
      expect(result).toContain("Keep it brief.");
      expect(result).not.toContain("Use formal tone.");
    });

    it("separates the base prompt and each pinned message with double newlines", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) => {
        if (key === "prompt.system") return "Base.";
        if (key === "context.pinned")
          return JSON.stringify([{ label: "A", content: "Pinned A.", enabled: true }]);
        return undefined;
      });
      expect(assistant.buildSystemPrompt()).toBe("Base.\n\nPinned A.");
    });

    it("returns only the base prompt when all pinned messages are disabled", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) => {
        if (key === "prompt.system") return "Only base.";
        if (key === "context.pinned")
          return JSON.stringify([{ label: "Off", content: "Never shown.", enabled: false }]);
        return undefined;
      });
      expect(assistant.buildSystemPrompt()).toBe("Only base.");
    });

    it("concatenates multiple enabled pinned messages in order", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) => {
        if (key === "prompt.system") return "Base.";
        if (key === "context.pinned")
          return JSON.stringify([
            { label: "1st", content: "First.", enabled: true },
            { label: "2nd", content: "Second.", enabled: true },
            { label: "3rd", content: "Third.", enabled: true },
          ]);
        return undefined;
      });
      const result = assistant.buildSystemPrompt();
      const parts = result.split("\n\n");
      expect(parts).toEqual(["Base.", "First.", "Second.", "Third."]);
    });
  });

  // ── buildRequest() ───────────────────────────────────────────────────────────

  describe("buildRequest()", () => {
    const userMessages = [{ role: "user" as const, content: "Hello!" }];

    it("sets the URL to endpoint + /chat/completions", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ endpoint: "https://api.openai.com/v1" })
      );
      const req = assistant.buildRequest({ messages: userMessages });
      expect(req.url).toBe("https://api.openai.com/v1/chat/completions");
    });

    it("uses a custom endpoint when stored", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ endpoint: "http://localhost:11434/v1" })
      );
      const req = assistant.buildRequest({ messages: userMessages });
      expect(req.url).toBe("http://localhost:11434/v1/chat/completions");
    });

    it("includes Content-Type: application/json in every request", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(makeSnapshot());
      const req = assistant.buildRequest({ messages: userMessages });
      expect(req.headers["Content-Type"]).toBe("application/json");
    });

    it("includes Authorization: Bearer when apiKey is set", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ apiKey: "sk-secret-token" })
      );
      const req = assistant.buildRequest({ messages: userMessages });
      expect(req.headers.Authorization).toBe("Bearer sk-secret-token");
    });

    it("omits Authorization header when apiKey is empty", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(makeSnapshot({ apiKey: "" }));
      const req = assistant.buildRequest({ messages: userMessages });
      expect(req.headers.Authorization).toBeUndefined();
    });

    it("merges extraHeaders into the request headers", () => {
      const extra = { "X-Custom-Header": "my-value", "X-Proxy-Auth": "token" };
      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ extraHeaders: JSON.stringify(extra) })
      );
      const req = assistant.buildRequest({ messages: userMessages });
      expect(req.headers["X-Custom-Header"]).toBe("my-value");
      expect(req.headers["X-Proxy-Auth"]).toBe("token");
    });

    it("extraHeaders override nothing when they are an empty dict", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(makeSnapshot({ extraHeaders: "{}" }));
      const req = assistant.buildRequest({ messages: userMessages });
      expect(Object.keys(req.headers)).toEqual(expect.arrayContaining(["Content-Type"]));
    });

    it("includes the model name in the body", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ "model.name": "gpt-4o" })
      );
      const req = assistant.buildRequest({ messages: userMessages });
      expect(req.body.model).toBe("gpt-4o");
    });

    it("passes the messages array through to the body unchanged", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(makeSnapshot());
      const messages = [
        { role: "system" as const, content: "You are helpful." },
        { role: "user" as const, content: "What is 2+2?" },
        { role: "assistant" as const, content: "4" },
        { role: "user" as const, content: "And 3+3?" },
      ];
      const req = assistant.buildRequest({ messages });
      expect(req.body.messages).toEqual(messages);
    });

    it("converts temperature string to a number in the body", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ "model.sampling.temperature": "0.3" })
      );
      const req = assistant.buildRequest({ messages: userMessages });
      expect(req.body.temperature).toBe(0.3);
      expect(typeof req.body.temperature).toBe("number");
    });

    it("converts maxTokens string to a number in the body", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ "model.sampling.maxTokens": "4096" })
      );
      const req = assistant.buildRequest({ messages: userMessages });
      expect(req.body.max_tokens).toBe(4096);
      expect(typeof req.body.max_tokens).toBe("number");
    });

    it("converts topP string to a number in the body", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ "model.sampling.topP": "0.9" })
      );
      const req = assistant.buildRequest({ messages: userMessages });
      expect(req.body.top_p).toBe(0.9);
    });

    it("sets stream: true in the body when streamResponses is enabled", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ streamResponses: "true" })
      );
      const req = assistant.buildRequest({ messages: userMessages });
      expect(req.body.stream).toBe(true);
    });

    it("sets stream: false in the body when streamResponses is disabled", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ streamResponses: "false" })
      );
      const req = assistant.buildRequest({ messages: userMessages });
      expect(req.body.stream).toBe(false);
    });

    it("reads a fresh snapshot on every call — no stale cache", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ "model.name": "gpt-4o" })
      );
      expect(assistant.buildRequest({ messages: userMessages }).body.model).toBe("gpt-4o");

      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ "model.name": "o3-mini" })
      );
      expect(assistant.buildRequest({ messages: userMessages }).body.model).toBe("o3-mini");
    });

    it("calls getAllSettingsForExtension with 'ai-assistant'", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(makeSnapshot());
      assistant.buildRequest({ messages: userMessages });
      expect(getAllSettingsForExtension).toHaveBeenCalledWith("ai-assistant");
    });
  });

  // ── onClientChange() ─────────────────────────────────────────────────────────

  describe("onClientChange()", () => {
    it("fires when 'endpoint' changes via settings.set()", () => {
      const cb = vi.fn();
      assistant.onClientChange(cb);
      assistant.settings.set("endpoint", "https://new-api.example.com/v1");
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("fires when 'apiKey' changes via settings.set()", () => {
      const cb = vi.fn();
      assistant.onClientChange(cb);
      assistant.settings.set("apiKey", "sk-new-key");
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("fires when 'model.name' changes via settings.set()", () => {
      const cb = vi.fn();
      assistant.onClientChange(cb);
      assistant.settings.set("model.name", "gpt-4o");
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("fires when 'extraHeaders' changes via settings.set()", () => {
      const cb = vi.fn();
      assistant.onClientChange(cb);
      assistant.settings.set("extraHeaders", { "X-Org": "my-org" });
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("fires when the panel emits a change for 'endpoint'", () => {
      const cb = vi.fn();
      assistant.onClientChange(cb);
      emitChange(pi, "endpoint", "https://other-provider.ai/v1");
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("fires when the panel emits a change for 'model.name'", () => {
      const cb = vi.fn();
      assistant.onClientChange(cb);
      emitChange(pi, "model.name", "claude-sonnet");
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("fires when the panel emits a change for 'extraHeaders'", () => {
      const cb = vi.fn();
      assistant.onClientChange(cb);
      emitChange(pi, "extraHeaders", JSON.stringify({ "X-My": "header" }));
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("does NOT fire when 'model.sampling.temperature' changes", () => {
      const cb = vi.fn();
      assistant.onClientChange(cb);
      assistant.settings.set("model.sampling.temperature", "1.0");
      expect(cb).not.toHaveBeenCalled();
    });

    it("does NOT fire when 'prompt.system' changes", () => {
      const cb = vi.fn();
      assistant.onClientChange(cb);
      assistant.settings.set("prompt.system", "A new system prompt.");
      expect(cb).not.toHaveBeenCalled();
    });

    it("does NOT fire when 'streamResponses' changes", () => {
      const cb = vi.fn();
      assistant.onClientChange(cb);
      assistant.settings.set("streamResponses", false);
      expect(cb).not.toHaveBeenCalled();
    });

    it("does NOT fire for a panel event from a different extension", () => {
      const cb = vi.fn();
      assistant.onClientChange(cb);
      pi.triggerEvent("pi-extension-settings:changed", {
        extension: "other-extension",
        key: "endpoint",
        value: "https://hijacked.example.com",
      });
      expect(cb).not.toHaveBeenCalled();
    });

    it("multiple onClientChange callbacks all fire on the same change", () => {
      const a = vi.fn();
      const b = vi.fn();
      assistant.onClientChange(a);
      assistant.onClientChange(b);
      assistant.settings.set("apiKey", "sk-test");
      expect(a).toHaveBeenCalledTimes(1);
      expect(b).toHaveBeenCalledTimes(1);
    });

    it("accumulates across four successive client-affecting changes", () => {
      const cb = vi.fn();
      assistant.onClientChange(cb);

      assistant.settings.set("endpoint", "http://localhost:11434/v1");
      assistant.settings.set("apiKey", "sk-local");
      emitChange(pi, "model.name", "custom");
      emitChange(pi, "extraHeaders", "{}");

      expect(cb).toHaveBeenCalledTimes(4);
    });
  });

  // ── Transform behavior ───────────────────────────────────────────────────────

  describe("transform behavior", () => {
    describe("t.trim() on prompt.system", () => {
      it("trims leading and trailing whitespace before writing to storage", () => {
        assistant.settings.set("prompt.system", "  Be concise.  ");
        expect(setExtensionSetting).toHaveBeenCalledWith(
          "ai-assistant",
          "prompt.system",
          "Be concise."
        );
      });

      it("trims a string with only leading newlines", () => {
        assistant.settings.set("prompt.system", "\n\nTrimmed.");
        expect(setExtensionSetting).toHaveBeenCalledWith(
          "ai-assistant",
          "prompt.system",
          "Trimmed."
        );
      });

      it("leaves an already-trimmed string unchanged", () => {
        assistant.settings.set("prompt.system", "No extra spaces.");
        expect(setExtensionSetting).toHaveBeenCalledWith(
          "ai-assistant",
          "prompt.system",
          "No extra spaces."
        );
      });

      it("fires onChange with the trimmed value, not the raw input", () => {
        const received: string[] = [];
        assistant.settings.onChange("prompt.system", (v) => received.push(v as string));
        assistant.settings.set("prompt.system", "   trimmed   ");
        expect(received[0]).toBe("trimmed");
      });
    });

    describe("t.normalizeUrl() on endpoint", () => {
      it("lowercases the protocol and hostname", () => {
        assistant.settings.set("endpoint", "HTTPS://API.OPENAI.COM/v1");
        const [, , written] = vi.mocked(setExtensionSetting).mock.calls[0]!;
        expect((written as string).startsWith("https://api.openai.com")).toBe(true);
      });

      it("fires onChange with the normalized URL", () => {
        const received: string[] = [];
        assistant.settings.onChange("endpoint", (v) => received.push(v as string));
        assistant.settings.set("endpoint", "HTTPS://API.OPENAI.COM/v1");
        expect(received[0]).toMatch(/^https:\/\/api\.openai\.com/);
      });
    });
  });

  // ── settings.set() with deeply nested dot-notation keys ──────────────────────

  describe("settings.set() — nested dot-notation keys", () => {
    it("writes 'model.name' with the dotted key to storage", () => {
      assistant.settings.set("model.name", "gpt-4o");
      expect(setExtensionSetting).toHaveBeenCalledWith("ai-assistant", "model.name", "gpt-4o");
    });

    it("writes 'model.sampling.temperature' with the two-level dotted key", () => {
      assistant.settings.set("model.sampling.temperature", "1.2");
      expect(setExtensionSetting).toHaveBeenCalledWith(
        "ai-assistant",
        "model.sampling.temperature",
        "1.2"
      );
    });

    it("writes 'model.sampling.maxTokens' as a plain string", () => {
      assistant.settings.set("model.sampling.maxTokens", "8192");
      expect(setExtensionSetting).toHaveBeenCalledWith(
        "ai-assistant",
        "model.sampling.maxTokens",
        "8192"
      );
    });

    it("writes 'prompt.locale' with the dotted key", () => {
      assistant.settings.set("prompt.locale", "fr");
      expect(setExtensionSetting).toHaveBeenCalledWith("ai-assistant", "prompt.locale", "fr");
    });

    it("writes 'context.maxTurns' as a plain string", () => {
      assistant.settings.set("context.maxTurns", "20");
      expect(setExtensionSetting).toHaveBeenCalledWith("ai-assistant", "context.maxTurns", "20");
    });

    it("serializes 'context.pinned' as a JSON string", () => {
      const pinned = [{ label: "Rule", content: "Be brief.", enabled: true }];
      assistant.settings.set("context.pinned", pinned);
      expect(setExtensionSetting).toHaveBeenCalledWith(
        "ai-assistant",
        "context.pinned",
        JSON.stringify(pinned)
      );
    });

    it("serializes 'extraHeaders' as a JSON string", () => {
      const headers = { "X-Org": "my-org", "X-Project": "pi" };
      assistant.settings.set("extraHeaders", headers);
      expect(setExtensionSetting).toHaveBeenCalledWith(
        "ai-assistant",
        "extraHeaders",
        JSON.stringify(headers)
      );
    });

    it("serializes the boolean 'streamResponses' as the string 'false'", () => {
      assistant.settings.set("streamResponses", false);
      expect(setExtensionSetting).toHaveBeenCalledWith("ai-assistant", "streamResponses", "false");
    });
  });

  // ── settings.getAll() — full snapshot ────────────────────────────────────────

  describe("settings.getAll() — full snapshot", () => {
    it("returns all 13 leaf keys when storage is empty", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue({});
      const keys = Object.keys(assistant.settings.getAll());
      expect(keys).toHaveLength(13);
    });

    it("returns the correct defaults for every key when storage is empty", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue({});
      const all = assistant.settings.getAll();

      expect(all.endpoint).toBe("https://api.openai.com/v1");
      expect(all.apiKey).toBe("");
      expect(all["model.name"]).toBe("gpt-4o-mini");
      expect(all["model.sampling.temperature"]).toBe(0.7); // number node → native number
      expect(all["model.sampling.maxTokens"]).toBe(2048); // number node → native number
      expect(all["model.sampling.topP"]).toBe(1); // number node → native number
      expect(all["prompt.system"]).toContain("helpful coding assistant");
      expect(all["prompt.locale"]).toBe("en");
      expect(all["context.maxTurns"]).toBe(10); // number node → native number
      expect(all["context.pinned"]).toEqual([]); // list → parsed array
      expect(all.extraHeaders).toEqual({}); // dict → parsed object
      expect(all.streamResponses).toBe(true); // boolean → parsed
      expect(all.logRequests).toBe(false); // boolean → parsed
    });

    it("parses boolean 'streamResponses' correctly in the snapshot", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ streamResponses: "false" })
      );
      expect(assistant.settings.getAll().streamResponses).toBe(false);
    });

    it("parses boolean 'logRequests' correctly in the snapshot", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(makeSnapshot({ logRequests: "true" }));
      expect(assistant.settings.getAll().logRequests).toBe(true);
    });

    it("deserializes the 'context.pinned' JSON array in the snapshot", () => {
      const pinned = [
        { label: "A", content: "Keep it short.", enabled: true },
        { label: "B", content: "Use markdown.", enabled: false },
      ];
      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ "context.pinned": JSON.stringify(pinned) })
      );
      expect(assistant.settings.getAll()["context.pinned"]).toEqual(pinned);
    });

    it("deserializes the 'extraHeaders' JSON object in the snapshot", () => {
      const headers = { "X-Custom": "value", "X-Trace": "id-123" };
      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ extraHeaders: JSON.stringify(headers) })
      );
      expect(assistant.settings.getAll().extraHeaders).toEqual(headers);
    });

    it("returns empty array for 'context.pinned' when stored JSON is invalid", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue(
        makeSnapshot({ "context.pinned": "NOT VALID JSON" })
      );
      expect(assistant.settings.getAll()["context.pinned"]).toEqual([]);
    });

    it("merges stored values over defaults — absent keys fall back", () => {
      // Only override a few keys; the rest should come from defaults
      vi.mocked(getAllSettingsForExtension).mockReturnValue({
        "model.name": "claude-sonnet",
        streamResponses: "false",
      });

      const all = assistant.settings.getAll();
      expect(all["model.name"]).toBe("claude-sonnet"); // stored
      expect(all.streamResponses).toBe(false); // stored + parsed
      expect(all.endpoint).toBe("https://api.openai.com/v1"); // default
      expect(all.apiKey).toBe(""); // default
      expect(all["model.sampling.temperature"]).toBe(0.7); // default, number node
    });

    it("calls getAllSettingsForExtension with 'ai-assistant'", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue({});
      assistant.settings.getAll();
      expect(getAllSettingsForExtension).toHaveBeenCalledWith("ai-assistant");
    });
  });
});
