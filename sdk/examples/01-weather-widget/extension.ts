/**
 * Example 01 — Weather Widget (simple)
 *
 * A minimal extension that shows current weather for a configured city.
 * Demonstrates the most common schema primitives:
 *
 *   - S.text()    → free-form string inputs (API key, city name)
 *   - S.enum()    → fixed-choice cycling value (temperature unit)
 *   - S.boolean() → on/off toggle (show humidity, show wind)
 *
 * The exported `createWeatherWidget()` factory wires up `ExtensionSettings`
 * and returns a small API that the extension's render / fetch logic can use.
 * This indirection makes the extension straightforward to unit-test: tests
 * call the factory with a mock `pi` object and a pre-configured storage mock,
 * then exercise the returned API without touching the network or filesystem.
 */

import { ExtensionSettings, S } from "@axnic/pi-extension-settings-sdk";
import { v } from "@axnic/pi-extension-settings-sdk/hooks";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

// ─── Schema ───────────────────────────────────────────────────────────────────

export const schema = S.settings({
  apiKey: S.text({
    tooltip: "OpenWeatherMap API key",
    description: [
      "## API key",
      "Free-tier key from [openweathermap.org](https://openweathermap.org/api).",
      "Without a valid key the widget shows a placeholder.",
    ].join("\n"),
    default: "",
    validation: v.regex(/^[a-f0-9]{32}$/, "must be a 32-character hex API key"),
  }),

  city: S.text({
    tooltip: "City to display weather for",
    description:
      "Accepts a city name (`Paris`), a `City,CC` pair (`London,GB`), or a zip code.",
    default: "Paris",
    validation: v.notEmpty(),
  }),

  units: S.enum({
    tooltip: "Temperature unit",
    default: "celsius",
    values: [
      { value: "celsius", label: "Celsius (°C)" },
      { value: "fahrenheit", label: "Fahrenheit (°F)" },
      { value: "kelvin", label: "Kelvin (K)" },
    ],
  }),

  showHumidity: S.boolean({
    tooltip: "Show humidity percentage",
    default: true,
  }),

  showWind: S.boolean({
    tooltip: "Show wind speed",
    default: false,
  }),
});

// Derive the config type for use in the rest of this file.
export type WeatherConfig = {
  apiKey: string;
  city: string;
  units: string;
  showHumidity: boolean;
  showWind: boolean;
};

// ─── Extension factory ────────────────────────────────────────────────────────

/**
 * Wire up the weather widget for a given `pi` extension context.
 *
 * Returns a small API object consumed by the widget's render and fetch layers.
 * The `settings` property exposes the raw `ExtensionSettings` instance for
 * callers that need direct access (e.g. the settings panel integration).
 *
 * @example
 * ```ts
 * // Inside your pi extension entry point:
 * export function activate(pi: ExtensionAPI) {
 *   const widget = createWeatherWidget(pi);
 *   pi.statusBar.set(widget.renderTitle());
 * }
 * ```
 */
export function createWeatherWidget(pi: ExtensionAPI) {
  const settings = new ExtensionSettings(pi, "weather-widget", schema);

  return {
    /** Raw settings instance — useful for registering extra listeners. */
    settings,

    /**
     * Returns true when an API key has been configured.
     * The widget should show a "configure me" placeholder otherwise.
     */
    isConfigured(): boolean {
      return settings.get("apiKey").trim().length > 0;
    },

    /**
     * Builds the status-bar title string:
     *   "Weather · Paris (°C)"
     */
    renderTitle(): string {
      const city = settings.get("city");
      const units = settings.get("units");
      const symbol =
        units === "celsius" ? "°C" : units === "fahrenheit" ? "°F" : "K";
      return `Weather · ${city} (${symbol})`;
    },

    /**
     * Converts a raw Celsius value to the user's preferred unit.
     * Returns a formatted string like "23°C", "73°F" or "296 K".
     */
    formatTemperature(celsius: number): string {
      const units = settings.get("units");
      if (units === "fahrenheit") {
        return `${Math.round((celsius * 9) / 5 + 32)}°F`;
      }
      if (units === "kelvin") {
        return `${Math.round(celsius + 273.15)} K`;
      }
      return `${celsius}°C`;
    },

    /**
     * Assembles the lines to display in the widget panel.
     * Extra lines (humidity, wind) are included only when their toggles are on.
     *
     * @param data  Raw weather payload from the OpenWeatherMap API.
     */
    renderLines(data: {
      tempCelsius: number;
      humidity: number;
      windKph: number;
      description: string;
    }): string[] {
      const lines: string[] = [
        `${settings.get("city")} — ${data.description}`,
        `Temp: ${this.formatTemperature(data.tempCelsius)}`,
      ];

      if (settings.get("showHumidity")) {
        lines.push(`Humidity: ${data.humidity}%`);
      }
      if (settings.get("showWind")) {
        lines.push(`Wind: ${data.windKph} km/h`);
      }

      return lines;
    },

    /**
     * Builds the URL for the OpenWeatherMap current-weather endpoint.
     * Returns `null` when no API key has been set yet.
     */
    buildFetchUrl(): string | null {
      const apiKey = settings.get("apiKey").trim();
      if (!apiKey) return null;

      const city = encodeURIComponent(settings.get("city"));
      // The API always returns metric; we convert client-side.
      return `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;
    },

    /**
     * Register a callback that fires whenever any displayed setting changes
     * (city, units, showHumidity or showWind) so the caller can re-render.
     */
    onDisplayChange(cb: () => void): void {
      settings.onChange("city", () => cb());
      settings.onChange("units", () => cb());
      settings.onChange("showHumidity", () => cb());
      settings.onChange("showWind", () => cb());
    },
  };
}

export type WeatherWidget = ReturnType<typeof createWeatherWidget>;
