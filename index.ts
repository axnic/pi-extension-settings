/**
 * index.ts — Extension entry point for pi-extension-settings.
 *
 * Responsibilities:
 *   1. Listen for "pi-extension-settings:register" events from consumer extensions.
 *   2. On session_start (startup or reload): clear registry, emit "ready".
 *   3. Register the /extensions:settings command.
 *
 * The registry is populated synchronously during session_start, because:
 *   - pi-extension-settings emits "ready" in its session_start handler.
 *   - Consumer extensions listen for "ready" and immediately emit "register".
 *   - All event listeners are registered before session_start fires.
 *
 * See: DESIGN.md §Implementation Notes for the full flow diagram.
 */

import type {
  ExtensionAPI,
  SessionStartEvent,
} from "@mariozechner/pi-coding-agent";
import { ExtensionSettings } from "./sdk/index.js";
import type { RegistrationPayload } from "./src/core/registry.js";
import { createRegistry } from "./src/core/registry.js";
import {
  createSettingsReader,
  EXTENSION_NAME as SETTINGS_EXTENSION_NAME,
  schema as settingsSchema,
} from "./src/settings.js";
import { SettingsPanel } from "./src/ui/panel.js";

export default function piExtensionSettings(pi: ExtensionAPI) {
  const registry = createRegistry();

  // Dog-food: read our own settings via the SDK rather than touching storage
  // directly. The constructor wires the standard ":ready" → ":register" flow,
  // so the panel registers itself like any other consumer extension — see the
  // session_start handler below.
  const selfSettings = new ExtensionSettings(
    pi,
    SETTINGS_EXTENSION_NAME,
    settingsSchema,
  );
  const settingsReader = createSettingsReader(selfSettings);

  // ── Registration listener ──────────────────────────────────────────────
  // Consumer extensions emit this event in response to "pi-extension-settings:ready".

  pi.events.on("pi-extension-settings:register", (rawData: unknown) => {
    const data = rawData as RegistrationPayload;
    if (!data?.extension || !data?.nodes) return;
    registry.set(data.extension, {
      nodes: data.nodes,
      documentation: data.documentation,
    });
  });

  // ── Session lifecycle ──────────────────────────────────────────────────
  // On startup and reload: clear the registry and broadcast "ready" so all
  // consumer extensions can re-register with their (potentially updated) schemas.

  pi.on("session_start", async (event: SessionStartEvent) => {
    if (event.reason === "startup" || event.reason === "reload") {
      registry.clear();
      pi.events.emit("pi-extension-settings:ready", {});
    }
  });

  // ── /extensions:settings command ──────────────────────────────────────

  pi.registerCommand("extensions:settings", {
    description: "Configure settings for all installed extensions",
    handler: async (_args, ctx) => {
      if (!ctx.hasUI) {
        return;
      }

      await ctx.ui.custom((tui, theme, _kb, done) => {
        const panel = new SettingsPanel(
          registry,
          pi,
          () => theme,
          settingsReader,
        );
        panel.setDone(done);

        return {
          render(width: number): string[] {
            return panel.render(width);
          },
          invalidate(): void {
            panel.invalidate();
          },
          handleInput(data: string): void {
            panel.handleInput(data);
            tui.requestRender();
          },
        };
      });
    },
  });
}
