/**
 * Example 01 — Weather Widget spec
 *
 * Tests `createWeatherWidget()` in isolation by:
 *   - Mocking `pi.events.on` / `pi.events.emit` to capture and replay events
 *   - Mocking `getExtensionSetting`, `setExtensionSetting` and
 *     `getAllSettingsForExtension` so no file is ever touched
 *
 * Each describe block exercises one aspect of the widget's public API.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWeatherWidget, schema } from "./extension.ts";

// ─── Mock: storage ────────────────────────────────────────────────────────────

vi.mock("../../src/core/storage", () => ({
  getExtensionSetting: vi.fn(),
  setExtensionSetting: vi.fn(),
  getAllSettingsForExtension: vi.fn(),
}));

import {
  getAllSettingsForExtension,
  getExtensionSetting,
  setExtensionSetting,
} from "../../src/core/storage";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Minimal fake `pi` instance.
 *
 * `on(event, cb)` records every listener.
 * `triggerEvent(event, payload)` replays them — simulating what the
 *  pi-extension-settings panel does when the user saves a change.
 */
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
        for (const cb of listeners.get(event) ?? []) cb(data);
      }),
    },
    /** Fire all listeners registered under `event` with `data`. */
    triggerEvent(event: string, data?: unknown) {
      for (const cb of listeners.get(event) ?? []) cb(data);
    },
  };
}

/** Simulate the panel saving a single setting change for "weather-widget". */
function emitChange(pi: ReturnType<typeof makePi>, key: string, value: string) {
  vi.mocked(getExtensionSetting).mockImplementation((_, k) =>
    k === key ? value : undefined,
  );
  pi.triggerEvent(`pi-extension-settings:weather-widget:changed`, { key });
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe("WeatherWidget — createWeatherWidget()", () => {
  let pi: ReturnType<typeof makePi>;
  let widget: ReturnType<typeof createWeatherWidget>;

  beforeEach(() => {
    vi.clearAllMocks();
    pi = makePi();
    widget = createWeatherWidget(pi as unknown as ExtensionAPI);
  });

  // ── pi wiring ──────────────────────────────────────────────────────────────

  describe("pi event wiring", () => {
    it("registers a listener for pi-extension-settings:ready", () => {
      expect(pi.events.on).toHaveBeenCalledWith(
        "pi-extension-settings:ready",
        expect.any(Function),
      );
    });

    it("registers a listener for pi-extension-settings:weather-widget:changed", () => {
      expect(pi.events.on).toHaveBeenCalledWith(
        "pi-extension-settings:weather-widget:changed",
        expect.any(Function),
      );
    });

    it("emits pi-extension-settings:register with the schema when ready fires", () => {
      pi.triggerEvent("pi-extension-settings:ready");

      expect(pi.events.emit).toHaveBeenCalledWith(
        "pi-extension-settings:register",
        {
          extension: "weather-widget",
          nodes: schema,
        },
      );
    });
  });

  // ── isConfigured() ─────────────────────────────────────────────────────────

  describe("isConfigured()", () => {
    it("returns false when the API key is empty (schema default)", () => {
      vi.mocked(getExtensionSetting).mockReturnValue(undefined); // → default ""
      expect(widget.isConfigured()).toBe(false);
    });

    it("returns false when the stored API key is a blank string", () => {
      vi.mocked(getExtensionSetting).mockReturnValue("   ");
      expect(widget.isConfigured()).toBe(false);
    });

    it("returns true when a non-empty API key is stored", () => {
      vi.mocked(getExtensionSetting).mockReturnValue(
        "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
      );
      expect(widget.isConfigured()).toBe(true);
    });
  });

  // ── renderTitle() ──────────────────────────────────────────────────────────

  describe("renderTitle()", () => {
    it("uses the default city and celsius symbol", () => {
      vi.mocked(getExtensionSetting).mockReturnValue(undefined);
      expect(widget.renderTitle()).toBe("Weather · Paris (°C)");
    });

    it("uses a stored city name", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) =>
        key === "city" ? "Tokyo" : undefined,
      );
      expect(widget.renderTitle()).toBe("Weather · Tokyo (°C)");
    });

    it("reflects the fahrenheit symbol when unit is fahrenheit", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) =>
        key === "units" ? "fahrenheit" : undefined,
      );
      expect(widget.renderTitle()).toBe("Weather · Paris (°F)");
    });

    it("reflects the kelvin symbol when unit is kelvin", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) =>
        key === "units" ? "kelvin" : undefined,
      );
      expect(widget.renderTitle()).toBe("Weather · Paris (K)");
    });

    it("combines a stored city with a stored unit", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) => {
        if (key === "city") return "New York";
        if (key === "units") return "fahrenheit";
        return undefined;
      });
      expect(widget.renderTitle()).toBe("Weather · New York (°F)");
    });

    it("re-reads live settings on every call (no stale cache)", () => {
      // First call: default city
      vi.mocked(getExtensionSetting).mockReturnValue(undefined);
      expect(widget.renderTitle()).toContain("Paris");

      // Second call: city changed in storage
      vi.mocked(getExtensionSetting).mockImplementation((_, key) =>
        key === "city" ? "Berlin" : undefined,
      );
      expect(widget.renderTitle()).toContain("Berlin");
    });
  });

  // ── formatTemperature() ────────────────────────────────────────────────────

  describe("formatTemperature()", () => {
    it("returns celsius string unchanged when unit is celsius", () => {
      vi.mocked(getExtensionSetting).mockReturnValue(undefined); // default = celsius
      expect(widget.formatTemperature(20)).toBe("20°C");
    });

    it("converts 0 °C to 32 °F", () => {
      vi.mocked(getExtensionSetting).mockReturnValue("fahrenheit");
      expect(widget.formatTemperature(0)).toBe("32°F");
    });

    it("converts 100 °C to 212 °F", () => {
      vi.mocked(getExtensionSetting).mockReturnValue("fahrenheit");
      expect(widget.formatTemperature(100)).toBe("212°F");
    });

    it("converts 37 °C to approximately 99 °F (rounds to nearest integer)", () => {
      vi.mocked(getExtensionSetting).mockReturnValue("fahrenheit");
      expect(widget.formatTemperature(37)).toBe("99°F");
    });

    it("converts 0 °C to 273 K", () => {
      vi.mocked(getExtensionSetting).mockReturnValue("kelvin");
      expect(widget.formatTemperature(0)).toBe("273 K");
    });

    it("converts 100 °C to 373 K", () => {
      vi.mocked(getExtensionSetting).mockReturnValue("kelvin");
      expect(widget.formatTemperature(100)).toBe("373 K");
    });

    it("handles negative temperatures in celsius", () => {
      vi.mocked(getExtensionSetting).mockReturnValue(undefined);
      expect(widget.formatTemperature(-10)).toBe("-10°C");
    });
  });

  // ── renderLines() ──────────────────────────────────────────────────────────

  describe("renderLines()", () => {
    const weatherData = {
      tempCelsius: 22,
      humidity: 65,
      windKph: 15,
      description: "partly cloudy",
    };

    it("always includes city+description and temperature lines", () => {
      vi.mocked(getExtensionSetting).mockReturnValue(undefined);
      const lines = widget.renderLines(weatherData);
      expect(lines[0]).toContain("Paris");
      expect(lines[0]).toContain("partly cloudy");
      expect(lines[1]).toContain("22°C");
    });

    it("includes humidity line when showHumidity is true (default)", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) => {
        if (key === "showHumidity") return "true";
        return undefined;
      });
      const lines = widget.renderLines(weatherData);
      expect(lines.some((l) => l.includes("65%"))).toBe(true);
    });

    it("omits humidity line when showHumidity is false", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) => {
        if (key === "showHumidity") return "false";
        return undefined;
      });
      const lines = widget.renderLines(weatherData);
      expect(lines.some((l) => l.includes("Humidity"))).toBe(false);
    });

    it("includes wind line when showWind is true", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) => {
        if (key === "showWind") return "true";
        return undefined;
      });
      const lines = widget.renderLines(weatherData);
      expect(lines.some((l) => l.includes("15 km/h"))).toBe(true);
    });

    it("omits wind line when showWind is false (default)", () => {
      vi.mocked(getExtensionSetting).mockReturnValue(undefined); // showWind default = false
      const lines = widget.renderLines(weatherData);
      expect(lines.some((l) => l.includes("Wind"))).toBe(false);
    });

    it("returns exactly 2 lines when both optional lines are disabled", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) => {
        if (key === "showHumidity") return "false";
        if (key === "showWind") return "false";
        return undefined;
      });
      expect(widget.renderLines(weatherData)).toHaveLength(2);
    });

    it("returns 4 lines when both optional lines are enabled", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) => {
        if (key === "showHumidity") return "true";
        if (key === "showWind") return "true";
        return undefined;
      });
      expect(widget.renderLines(weatherData)).toHaveLength(4);
    });

    it("converts temperature to fahrenheit in the render output", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) => {
        if (key === "units") return "fahrenheit";
        return undefined;
      });
      const lines = widget.renderLines({ ...weatherData, tempCelsius: 0 });
      expect(lines[1]).toContain("32°F");
    });
  });

  // ── buildFetchUrl() ────────────────────────────────────────────────────────

  describe("buildFetchUrl()", () => {
    it("returns null when no API key is configured", () => {
      vi.mocked(getExtensionSetting).mockReturnValue(undefined);
      expect(widget.buildFetchUrl()).toBeNull();
    });

    it("returns null when the stored API key is whitespace-only", () => {
      vi.mocked(getExtensionSetting).mockReturnValue("   ");
      expect(widget.buildFetchUrl()).toBeNull();
    });

    it("returns a valid URL when apiKey and city are configured", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) => {
        if (key === "apiKey") return "abcdef0123456789abcdef0123456789";
        if (key === "city") return "Berlin";
        return undefined;
      });
      const url = widget.buildFetchUrl();
      expect(url).not.toBeNull();
      expect(url).toContain("api.openweathermap.org");
      expect(url).toContain("appid=abcdef0123456789abcdef0123456789");
      expect(url).toContain("q=Berlin");
      expect(url).toContain("units=metric");
    });

    it("URL-encodes city names that contain spaces", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) => {
        if (key === "apiKey") return "abcdef0123456789abcdef0123456789";
        if (key === "city") return "New York";
        return undefined;
      });
      const url = widget.buildFetchUrl();
      expect(url).toContain("q=New%20York");
      expect(url).not.toContain("q=New York");
    });

    it("always requests metric units regardless of user preference (conversion is client-side)", () => {
      vi.mocked(getExtensionSetting).mockImplementation((_, key) => {
        if (key === "apiKey") return "abcdef0123456789abcdef0123456789";
        if (key === "units") return "fahrenheit";
        return undefined;
      });
      const url = widget.buildFetchUrl();
      expect(url).toContain("units=metric");
      expect(url).not.toContain("units=fahrenheit");
    });
  });

  // ── onDisplayChange() + onChange from settings.set() ──────────────────────

  describe("onDisplayChange() — triggered by settings.set()", () => {
    it("fires when city is updated via settings.set()", () => {
      const cb = vi.fn();
      widget.onDisplayChange(cb);
      widget.settings.set("city", "Oslo");
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("fires when units are updated via settings.set()", () => {
      const cb = vi.fn();
      widget.onDisplayChange(cb);
      widget.settings.set("units", "kelvin");
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("fires when showHumidity is toggled via settings.set()", () => {
      const cb = vi.fn();
      widget.onDisplayChange(cb);
      widget.settings.set("showHumidity", false);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("fires when showWind is toggled via settings.set()", () => {
      const cb = vi.fn();
      widget.onDisplayChange(cb);
      widget.settings.set("showWind", true);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("does NOT fire when apiKey changes (not a display setting)", () => {
      const cb = vi.fn();
      widget.onDisplayChange(cb);
      widget.settings.set("apiKey", "deadbeefdeadbeefdeadbeefdeadbeef");
      expect(cb).not.toHaveBeenCalled();
    });

    it("multiple onDisplayChange callbacks all fire on the same change", () => {
      const a = vi.fn();
      const b = vi.fn();
      widget.onDisplayChange(a);
      widget.onDisplayChange(b);
      widget.settings.set("city", "Madrid");
      expect(a).toHaveBeenCalledTimes(1);
      expect(b).toHaveBeenCalledTimes(1);
    });

    it("fires four times when each of the four display settings changes once", () => {
      const cb = vi.fn();
      widget.onDisplayChange(cb);

      widget.settings.set("city", "Rome");
      widget.settings.set("units", "celsius");
      widget.settings.set("showHumidity", true);
      widget.settings.set("showWind", false);

      expect(cb).toHaveBeenCalledTimes(4);
    });
  });

  // ── onDisplayChange() — triggered by pi panel event ───────────────────────

  describe("onDisplayChange() — triggered by pi-extension-settings:changed", () => {
    it("fires when the panel saves a city change", () => {
      const cb = vi.fn();
      widget.onDisplayChange(cb);
      emitChange(pi, "city", "Amsterdam");
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("fires when the panel saves a units change", () => {
      const cb = vi.fn();
      widget.onDisplayChange(cb);
      emitChange(pi, "units", "fahrenheit");
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("fires when the panel toggles showHumidity", () => {
      const cb = vi.fn();
      widget.onDisplayChange(cb);
      emitChange(pi, "showHumidity", "false");
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("fires when the panel toggles showWind", () => {
      const cb = vi.fn();
      widget.onDisplayChange(cb);
      emitChange(pi, "showWind", "true");
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("does NOT fire for an event from a different extension", () => {
      const cb = vi.fn();
      widget.onDisplayChange(cb);
      pi.triggerEvent("pi-extension-settings:other-extension:changed", {
        key: "city",
      });
      expect(cb).not.toHaveBeenCalled();
    });

    it("does NOT fire when only apiKey changes via the panel", () => {
      const cb = vi.fn();
      widget.onDisplayChange(cb);
      emitChange(pi, "apiKey", "deadbeefdeadbeefdeadbeefdeadbeef");
      expect(cb).not.toHaveBeenCalled();
    });
  });

  // ── settings.set() persists to storage ────────────────────────────────────

  describe("settings.set() — storage calls", () => {
    it("writes city to storage via setExtensionSetting", () => {
      widget.settings.set("city", "Lisbon");
      expect(setExtensionSetting).toHaveBeenCalledWith(
        "weather-widget",
        "city",
        "Lisbon",
      );
    });

    it("serializes the boolean showHumidity as the string 'false'", () => {
      widget.settings.set("showHumidity", false);
      expect(setExtensionSetting).toHaveBeenCalledWith(
        "weather-widget",
        "showHumidity",
        "false",
      );
    });

    it("serializes the boolean showWind as the string 'true'", () => {
      widget.settings.set("showWind", true);
      expect(setExtensionSetting).toHaveBeenCalledWith(
        "weather-widget",
        "showWind",
        "true",
      );
    });
  });

  // ── settings.getAll() ─────────────────────────────────────────────────────

  describe("settings.getAll() — full snapshot", () => {
    it("returns all defaults when nothing is stored", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue({});

      expect(widget.settings.getAll()).toEqual({
        apiKey: "",
        city: "Paris",
        units: "celsius",
        showHumidity: true,
        showWind: false,
      });
    });

    it("merges stored values over defaults", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue({
        city: "Tokyo",
        units: "fahrenheit",
      });

      const all = widget.settings.getAll();
      expect(all.city).toBe("Tokyo");
      expect(all.units).toBe("fahrenheit");
      expect(all.apiKey).toBe(""); // still the default
      expect(all.showHumidity).toBe(true); // still the default
    });

    it("parses booleans correctly in the snapshot", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue({
        showHumidity: "false",
        showWind: "true",
      });

      const all = widget.settings.getAll();
      expect(all.showHumidity).toBe(false);
      expect(all.showWind).toBe(true);
    });

    it("calls getAllSettingsForExtension with 'weather-widget'", () => {
      vi.mocked(getAllSettingsForExtension).mockReturnValue({});
      widget.settings.getAll();
      expect(getAllSettingsForExtension).toHaveBeenCalledWith("weather-widget");
    });
  });
});
