# Example: Weather Widget

**Source:** `sdk/examples/01-weather-widget/extension.ts`

A minimal extension that displays current weather for a configured city. This example covers the three most common node types and the basic `ExtensionSettings` workflow.

**Concepts demonstrated:** `S.text`, `S.boolean`, `S.enum`, `v.regex`, `v.notEmpty`, `onChange`

---

## Imports

```ts
import { S, ExtensionSettings } from "pi-extension-settings/sdk";
import { v } from "pi-extension-settings/sdk/hooks";
```

---

## Schema

```ts
export const schema = S.settings({
  apiKey: S.text({
    description: "OpenWeatherMap API key",
    documentation:
      "Free-tier key from openweathermap.org/api.\nWithout a valid key the widget shows a placeholder.",
    default: "",
    validation: v.regex(/^[a-f0-9]{32}$/, "must be a 32-character hex API key"),
  }),

  city: S.text({
    description: "City to display weather for",
    documentation:
      "Accepts a city name (Paris), a City,CC pair (London,GB), or a zip code.",
    default: "Paris",
    validation: v.notEmpty(),
  }),

  units: S.enum({
    description: "Temperature unit",
    default: "celsius",
    values: [
      { value: "celsius", label: "Celsius (°C)" },
      { value: "fahrenheit", label: "Fahrenheit (°F)" },
      { value: "kelvin", label: "Kelvin (K)" },
    ],
  }),

  showHumidity: S.boolean({
    description: "Show humidity percentage",
    default: true,
  }),

  showWind: S.boolean({
    description: "Show wind speed",
    default: false,
  }),
});
```

**Key points:**

- `v.regex()` on `apiKey` ensures users don't accidentally save a partial key. The second argument is the error message shown in the panel.
- `v.notEmpty()` on `city` prevents saving an empty string that would cause a failed API call.
- The `units` enum uses value/label pairs so the stored value (`"celsius"`) is stable while the UI shows a friendlier label (`"Celsius (°C)"`).

---

## Factory function

```ts
export function createWeatherWidget(pi: ExtensionAPI) {
  const settings = new ExtensionSettings(pi, "weather-widget", schema);
  return {
    settings,
    isConfigured,
    renderTitle,
    formatTemperature,
    renderLines,
    buildFetchUrl,
    onDisplayChange,
  };
}
```

The factory returns a plain object. Each method reads settings on demand — there is no cached state to synchronize.

---

## Method walkthrough

### `isConfigured()`

```ts
isConfigured(): boolean {
  return settings.get("apiKey").trim().length > 0;
}
```

Checks whether an API key has been saved. When `false`, the widget renders a "configure me" placeholder instead of making a network request.

### `renderTitle()`

```ts
renderTitle(): string {
  const city = settings.get("city");
  const units = settings.get("units");
  const symbol = units === "celsius" ? "°C" : units === "fahrenheit" ? "°F" : "K";
  return `Weather · ${city} (${symbol})`;
}
```

Builds the status-bar string: `"Weather · Paris (°C)"`. Reads two settings on every call — no stale data.

### `formatTemperature(celsius)`

```ts
formatTemperature(celsius: number): string {
  const units = settings.get("units");
  if (units === "fahrenheit") return `${Math.round((celsius * 9) / 5 + 32)}°F`;
  if (units === "kelvin")     return `${Math.round(celsius + 273.15)} K`;
  return `${celsius}°C`;
}
```

The OpenWeatherMap API always returns metric data. This method converts client-side based on the user's `units` setting.

### `renderLines(data)`

```ts
renderLines(data: { tempCelsius, humidity, windKph, description }): string[] {
  const lines = [
    `${settings.get("city")} — ${data.description}`,
    `Temp: ${this.formatTemperature(data.tempCelsius)}`,
  ];
  if (settings.get("showHumidity")) lines.push(`Humidity: ${data.humidity}%`);
  if (settings.get("showWind"))     lines.push(`Wind: ${data.windKph} km/h`);
  return lines;
}
```

Assembles display lines conditionally based on the `showHumidity` and `showWind` toggles. The boolean settings are read on every call so the output immediately reflects any changes.

### `buildFetchUrl()`

```ts
buildFetchUrl(): string | null {
  const apiKey = settings.get("apiKey").trim();
  if (!apiKey) return null;
  const city = encodeURIComponent(settings.get("city"));
  return `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;
}
```

Returns `null` when no API key is set, allowing the caller to skip the fetch.

### `onDisplayChange(cb)`

```ts
onDisplayChange(cb: () => void): void {
  settings.onChange("city",         () => cb());
  settings.onChange("units",        () => cb());
  settings.onChange("showHumidity", () => cb());
  settings.onChange("showWind",     () => cb());
}
```

Registers a re-render callback for every setting that affects the display. This is a common pattern: wrap multiple `onChange` calls in a single helper so callers do not need to know which keys drive rendering.

---

## Usage in a pi extension

```ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createWeatherWidget } from "./extension.ts";

export function activate(pi: ExtensionAPI) {
  const widget = createWeatherWidget(pi);

  async function refresh() {
    const url = widget.buildFetchUrl();
    if (!url) {
      pi.statusBar.set("Weather · configure API key");
      return;
    }
    const data = await fetch(url).then((r) => r.json());
    pi.statusBar.set(widget.renderTitle());
    pi.panel.setLines(widget.renderLines(data));
  }

  widget.onDisplayChange(refresh);
  refresh();
}
```

---

<sup>Documentation drafted with AI assistance — Claude Opus 4.6 (Anthropic). Reviewed by a human maintainer before publishing.</sup>
