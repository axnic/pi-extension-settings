/**
 * core/errors.ts — Custom error classes for the pi-extension-settings SDK.
 *
 * All SDK errors extend `PiSettingsError` so consumers can catch them as a
 * group with a single `instanceof` check, while still being able to
 * discriminate on the specific subclass for fine-grained handling.
 *
 * ## Error hierarchy
 * ```
 * PiSettingsError
 * ├── SchemaError                   – invalid schema definition
 * │   ├── TooltipTooLongError       – tooltip exceeds 128 characters
 * │   └── EnumDefaultMismatchError  – default value not in declared enum values
 * └── SettingNotFoundError          – key not found in schema at runtime
 * ```
 *
 * @example
 * ```ts
 * import { PiSettingsError, SettingNotFoundError } from "pi-extension-settings/sdk";
 *
 * try {
 *   settings.get("unknown-key");
 * } catch (err) {
 *   if (err instanceof SettingNotFoundError) {
 *     console.error("Missing key:", err.key);
 *   } else if (err instanceof PiSettingsError) {
 *     console.error("SDK error:", err.message);
 *   } else {
 *     throw err;
 *   }
 * }
 * ```
 *
 * @module
 */

// ─── Base ─────────────────────────────────────────────────────────────────────

/**
 * Base class for every error thrown by the pi-extension-settings SDK.
 *
 * Catching `PiSettingsError` is sufficient to handle any SDK error, regardless
 * of its specific subclass.
 */
export class PiSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PiSettingsError";
    // Restore the correct prototype chain when targeting pre-ES2015 output.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Schema errors ────────────────────────────────────────────────────────────

/**
 * Thrown when a schema node definition is structurally invalid.
 *
 * The optional `nodeKey` provides the dotted path to the offending node inside
 * the schema (e.g. `"appearance.theme"`) so the developer can locate the
 * problem instantly.
 *
 * @example
 * ```ts
 * throw new SchemaError("tooltip is required", "appearance.theme");
 * // Error message: "[appearance.theme] tooltip is required"
 * ```
 */
export class SchemaError extends PiSettingsError {
  /** Dotted key path of the node that caused the error, if available. */
  readonly nodeKey: string | undefined;

  constructor(message: string, nodeKey?: string) {
    super(nodeKey ? `[${nodeKey}] ${message}` : message);
    this.name = "SchemaError";
    this.nodeKey = nodeKey;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a node's `tooltip` string exceeds the 128-character limit.
 *
 * Tooltips must be short and scannable — they are displayed inline next to the
 * setting in the panel. Use the optional `description` field on the node for
 * longer, Markdown-formatted documentation.
 *
 * @example
 * ```ts
 * // Thrown automatically by S.text(), S.boolean(), S.section(), etc.
 * S.text({
 *   tooltip: "x".repeat(200), // ← throws TooltipTooLongError
 *   default: "",
 * });
 * ```
 */
export class TooltipTooLongError extends SchemaError {
  /** Maximum allowed tooltip length. Always `128`. */
  static readonly MAX_LENGTH = 128;

  /** Actual length of the offending tooltip string. */
  readonly actual: number;

  constructor(nodeKey: string, actual: number) {
    super(
      `tooltip must be ≤ ${TooltipTooLongError.MAX_LENGTH} characters (got ${actual})`,
      nodeKey
    );
    this.name = "TooltipTooLongError";
    this.actual = actual;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an `Enum` node's `default` value is not present in its declared
 * `values` array.
 *
 * Every enum default must be an exact string match against one of the enum's
 * declared choices — either a plain string or the `value` field of an object
 * entry.
 *
 * @example
 * ```ts
 * // Thrown automatically by S.enum()
 * S.enum({
 *   tooltip: "Color theme",
 *   default: "blue",            // ← "blue" is not in ["dark", "light", "system"]
 *   values: ["dark", "light", "system"],
 * });
 * ```
 */
export class EnumDefaultMismatchError extends SchemaError {
  /** The invalid default value that was provided. */
  readonly defaultValue: string;

  /** The full list of allowed values for this enum node. */
  readonly allowedValues: readonly string[];

  constructor(nodeKey: string, defaultValue: string, allowedValues: string[]) {
    super(
      `default value "${defaultValue}" is not among the declared enum values: [${allowedValues.map((v) => `"${v}"`).join(", ")}]`,
      nodeKey
    );
    this.name = "EnumDefaultMismatchError";
    this.defaultValue = defaultValue;
    this.allowedValues = allowedValues;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Runtime errors ───────────────────────────────────────────────────────────

/**
 * Thrown when `ExtensionSettings.get()` or `ExtensionSettings.set()` is called
 * with a key that does not exist in the registered schema.
 *
 * This is a programming error: the key was either mistyped or the schema was
 * not updated after a refactor. TypeScript generics on `get` / `set` normally
 * catch this at compile time; this error is the runtime safety net.
 *
 * @example
 * ```ts
 * settings.get("typo-key"); // throws SettingNotFoundError
 *
 * try {
 *   settings.get("unknown");
 * } catch (err) {
 *   if (err instanceof SettingNotFoundError) {
 *     console.error(`Key "${err.key}" not found in extension "${err.extension}"`);
 *   }
 * }
 * ```
 */
export class SettingNotFoundError extends PiSettingsError {
  /** The setting key that could not be found. */
  readonly key: string;

  /** The extension identifier in which the lookup was performed. */
  readonly extension: string;

  constructor(extension: string, key: string) {
    super(
      `Setting "${key}" not found in schema for extension "${extension}". ` +
        `Check for typos or update the schema if the key was recently renamed.`
    );
    this.name = "SettingNotFoundError";
    this.key = key;
    this.extension = extension;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
