/**
 * core/schema.ts — Fluent schema builders (`S.*`) and TypeScript type inference.
 *
 * Use `S.settings(...)` as the entry point to define a typed extension schema.
 * The `InferConfig<T>` utility type extracts a flat key → value map from the
 * schema, collapsing `Section` nodes with dot-separated key paths.
 *
 * ## Builder pattern
 * Each builder accepts an input object whose shape is derived directly from the
 * corresponding node type in `core/nodes.ts` with the internal `_tag`
 * discriminant omitted (`Omit<NodeType, "_tag">`). The function then stamps the
 * correct `_tag` and returns the full, typed node. This means there is a single
 * source of truth for every field: `nodes.ts`.
 *
 * ## Runtime validation
 * `S.settings(...)` walks the full schema tree and enforces:
 * - `description` ≤ 128 characters on every node (throws `DescriptionTooLongError`).
 * - `Enum` default value is present in the declared `values` array
 *   (throws `EnumDefaultMismatchError`).
 *
 * @example
 * ```ts
 * const schema = S.settings({
 *   "gradient-from": S.text({
 *     description: "Gradient start color",
 *     documentation: "Accepts any valid CSS color — hex, rgb(), hsl(), …",
 *     default: "#ff930f",
 *     validation: v.hexColor(),
 *     display: d.color(),
 *   }),
 *   appearance: S.section({
 *     description: "Appearance",
 *     children: {
 *       theme: S.enum({
 *         description: "Color theme",
 *         default: "dark",
 *         values: ["dark", "light", "system"],
 *       }),
 *     },
 *   }),
 *   keys: S.list({
 *     description: "SSH keys",
 *     items: S.struct({
 *       properties: {
 *         host: S.text({ description: "Hostname", default: "" }),
 *         path: S.text({ description: "Key path", default: "" }),
 *       },
 *     }),
 *   }),
 * });
 * // Inferred: { "gradient-from": string; "appearance.theme": string; "keys": ListItem[] }
 * ```
 *
 * @module
 */

import { DescriptionTooLongError, EnumDefaultMismatchError } from "./errors";
import type {
  Boolean as BooleanNode,
  BoolValue,
  Dict,
  Enum,
  List,
  ListItem,
  Number as NumberNode,
  NumValue,
  Section,
  SettingNode,
  Struct,
  Text,
  TextValue,
} from "./nodes";

// ─── Type inference ───────────────────────────────────────────────────────────

/** TypeScript helper: convert a union to an intersection. */
type UnionToIntersection<U> = (
  U extends unknown
    ? (k: U) => void
    : never
) extends (k: infer I) => void
  ? I
  : never;

/**
 * Infer the runtime value type of a single leaf setting node.
 *
 * | Node tag    | Inferred type                          |
 * |-------------|----------------------------------------|
 * | `"text"`    | `TextValue` (`string`)                 |
 * | `"number"`  | `NumValue` (`number`)                  |
 * | `"boolean"` | `BoolValue` (`boolean`)                |
 * | `"enum"`    | `TextValue` (`string`)                 |
 * | `"list"`    | The node's `default` type, or `ListItem[]` |
 * | `"dict"`    | `Record<string, TextValue>`            |
 */
type InferLeaf<N> = N extends { _tag: "text" }
  ? TextValue
  : N extends { _tag: "number" }
    ? NumValue
    : N extends { _tag: "boolean" }
      ? BoolValue
      : N extends { _tag: "enum" }
        ? TextValue
        : N extends { _tag: "list" }
          ? N extends { default: infer D }
            ? D
            : ListItem[]
          : N extends { _tag: "dict" }
            ? Record<string, TextValue>
            : never;

/**
 * Recursively flatten a `Section` node's children using dot-separated key paths.
 *
 * @typeParam G      - The Section node type.
 * @typeParam Prefix - The dot-separated key path accumulated so far.
 */
type FlattenSection<G, Prefix extends string> = G extends {
  _tag: "section";
  children: infer C;
}
  ? UnionToIntersection<
      {
        [K in string & keyof C]: C[K] extends { _tag: "section" }
          ? FlattenSection<C[K], `${Prefix}.${K}`>
          : Record<`${Prefix}.${K}`, InferLeaf<C[K]>>;
      }[string & keyof C]
    >
  : never;

/**
 * Infer the full flat configuration type from a schema definition.
 *
 * `Section` nodes are transparently flattened: their children appear as
 * top-level keys joined with `.` separators.
 *
 * @example
 * type Config = InferConfig<typeof schema>;
 * // { "gradient-from": string; "appearance.theme": string; "keys": ListItem[] }
 */
export type InferConfig<T extends Record<string, SettingNode>> =
  UnionToIntersection<
    {
      [K in string & keyof T]: T[K] extends { _tag: "section" }
        ? FlattenSection<T[K], K>
        : Record<K, InferLeaf<T[K]>>;
    }[string & keyof T]
  >;

// ─── Runtime validation ───────────────────────────────────────────────────────

/**
 * Validate the `description` length and, for `Enum` nodes, confirm that the
 * `default` value is present in `values`. Recurses into `Section` children
 * and `List` struct properties.
 *
 * Called automatically by `settings()`.
 *
 * @throws {DescriptionTooLongError}        if any node's description exceeds 128 characters.
 * @throws {EnumDefaultMismatchError}   if an Enum's default is not in its values.
 */
function validateSchema(
  schema: Record<string, SettingNode>,
  prefix = "",
): void {
  for (const [key, node] of Object.entries(schema)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    // ── Description length ─────────────────────────────────────────────────
    if (node.description.length > DescriptionTooLongError.MAX_LENGTH) {
      throw new DescriptionTooLongError(fullKey, node.description.length);
    }

    // ── Enum default consistency ───────────────────────────────────────────
    if (node._tag === "enum") {
      const allowed = node.values.map((v) =>
        typeof v === "string" ? v : v.value,
      );
      if (!allowed.includes(node.default)) {
        throw new EnumDefaultMismatchError(fullKey, node.default, allowed);
      }
    }

    // ── Section: recurse into children ─────────────────────────────────────
    if (node._tag === "section") {
      validateSchema(node.children, fullKey);
    }

    // ── List: validate each struct property ────────────────────────────────
    if (node._tag === "list") {
      for (const [propKey, propNode] of Object.entries(node.items.properties)) {
        const propFullKey = `${fullKey}[].${propKey}`;

        if (propNode.description.length > DescriptionTooLongError.MAX_LENGTH) {
          throw new DescriptionTooLongError(
            propFullKey,
            propNode.description.length,
          );
        }

        if (propNode._tag === "enum") {
          const allowed = propNode.values.map((v) =>
            typeof v === "string" ? v : v.value,
          );
          if (!allowed.includes(propNode.default)) {
            throw new EnumDefaultMismatchError(
              propFullKey,
              propNode.default,
              allowed,
            );
          }
        }
      }
    }
  }
}

// ─── Schema builders (S.*) ───────────────────────────────────────────────────

/**
 * Entry point — wraps a schema definition, runs compile-time type inference,
 * and validates the schema at runtime before returning it.
 *
 * @throws {DescriptionTooLongError}       if any node's `description` exceeds 128 characters.
 * @throws {EnumDefaultMismatchError}  if any `Enum` node's `default` is not in its `values`.
 *
 * @example
 * const schema = S.settings({
 *   color: S.text({ description: "Accent color", default: "#fff" }),
 * });
 */
function settings<T extends Record<string, SettingNode>>(def: T): T {
  validateSchema(def);
  return def;
}

/**
 * Creates a free-form text input node.
 *
 * All specialised inputs (color pickers, path browsers, …) are built on top of
 * this node by combining `validation`, `transform`, `complete`, and `display`.
 *
 * @param opts - All `Text` fields except the internal `_tag` discriminant.
 *
 * @example
 * S.text({
 *   description: "API base URL",
 *   documentation: "Root URL used for all outbound HTTP requests.",
 *   default: "https://api.example.com",
 *   validation: v.url(),
 * })
 */
function text(opts: Omit<Text, "_tag">): Text {
  return { _tag: "text", ...opts };
}

/**
 * Creates a numeric input node that stores and returns a native JS `number`.
 *
 * Prefer this over `S.text()` + `v.integer()` / `v.float()` for any
 * semantically numeric setting. `settings.get()` returns a `number` directly
 * — no `parseInt` / `parseFloat` needed.
 *
 * @param opts - All `Number` fields except the internal `_tag` discriminant.
 *
 * @example
 * S.number({
 *   description: "Port number",
 *   default: 8080,
 *   validation: v.integer(1, 65535),
 * })
 *
 * @example
 * S.number({
 *   description: "Temperature (0 – 2)",
 *   default: 0.7,
 *   validation: v.float(0, 2),
 * })
 */
function number(opts: Omit<NumberNode, "_tag">): NumberNode {
  return { _tag: "number", ...opts };
}

/**
 * Creates a boolean toggle node that flips between `true` and `false`.
 *
 * @param opts - All `Boolean` fields except the internal `_tag` discriminant.
 *
 * @example
 * S.boolean({
 *   description: "Enable dark mode",
 *   default: true,
 * })
 */
function boolean(opts: Omit<BooleanNode, "_tag">): BooleanNode {
  return { _tag: "boolean", ...opts };
}

/**
 * Creates a cycling enum node whose value cycles through a fixed, ordered set
 * of choices.
 *
 * Each entry in `values` is either a plain string (the stored value is also
 * used as the display label) or an object with a separate `value` (stored) and
 * `label` (shown in the UI).
 *
 * @param opts - All `Enum` fields except the internal `_tag` discriminant.
 *
 * @example
 * S.enum({
 *   description: "Color theme",
 *   default: "dark",
 *   values: [
 *     { value: "dark",   label: "Dark" },
 *     { value: "light",  label: "Light" },
 *     { value: "system", label: "Follow system" },
 *   ],
 * })
 */
function enumSetting(opts: Omit<Enum, "_tag">): Enum {
  return { _tag: "enum", ...opts };
}

/**
 * Creates a growable list of structured objects.
 *
 * Each item conforms to the shape described by `items` (a `Struct`). The
 * optional `display` function renders an entire `ListItem` as a compact
 * one-line summary in the collapsed row view.
 *
 * @param opts - All `List` fields except the internal `_tag` discriminant.
 *               `default` is set to `[]` if omitted.
 *
 * @example
 * S.list({
 *   description: "SSH keys",
 *   items: S.struct({
 *     properties: {
 *       host: S.text({ description: "Hostname", default: "" }),
 *       path: S.text({ description: "Private key path", default: "" }),
 *     },
 *   }),
 *   display: (item, theme) => `${theme.fg("dim", "→")} ${item.host}`,
 * })
 */
function list(opts: Omit<List, "_tag"> & { default?: ListItem[] }): List {
  return { _tag: "list", ...opts, default: opts.default ?? [] };
}

/**
 * Creates a string → string dictionary node for arbitrary key/value pairs.
 *
 * @param opts - All `Dict` fields except the internal `_tag` discriminant.
 *               `default` is set to `{}` if omitted.
 *
 * @example
 * S.dict({
 *   description: "Environment variables",
 *   documentation: "Injected into the process environment at startup.",
 * })
 */
function dict(
  opts: Omit<Dict, "_tag"> & { default?: Record<string, TextValue> },
): Dict {
  return { _tag: "dict", ...opts, default: opts.default ?? {} };
}

/**
 * Creates a section node that groups related settings under a collapsible
 * header in the settings panel.
 *
 * The `description` field doubles as the section header label.
 * Sections may be nested; children are flattened with dot-separated keys by
 * the `InferConfig` utility type.
 *
 * @param opts - All `Section` fields except the internal `_tag` discriminant.
 *
 * @example
 * S.section({
 *   description: "Appearance",
 *   documentation: "Controls the visual theme applied to the extension's UI.",
 *   children: {
 *     theme: S.enum({ description: "Color theme", default: "dark", values: ["dark", "light"] }),
 *   },
 * })
 */
function section<C extends Record<string, SettingNode>>(
  opts: Omit<Section, "_tag" | "children"> & { children: C },
): Omit<Section, "children"> & { children: C } {
  return { _tag: "section", ...opts };
}

/**
 * Creates a `Struct` that describes the shape of each item in a `List` node.
 *
 * Only scalar node types (`Text`, `Number`, `Boolean`, `Enum`) are accepted as
 * properties, because list items must remain simple enough to render as table
 * rows in the settings panel.
 *
 * A `Struct` is **not** a `SettingNode` — it cannot appear at the top level of
 * a schema. It is exclusively used as the `items` field of a `List`.
 *
 * @param opts - All `Struct` fields except the internal `_tag` discriminant.
 *
 * @example
 * S.struct({
 *   properties: {
 *     host: S.text({ description: "Hostname",         default: "" }),
 *     port: S.text({ description: "Port number",      default: "22" }),
 *   },
 * })
 */
function struct(opts: Omit<Struct, "_tag">): Struct {
  return { _tag: "struct", ...opts };
}

// ─── Exported namespace ───────────────────────────────────────────────────────

/**
 * The `S` namespace — all schema builder functions.
 *
 * Import and use as:
 * ```ts
 * import { S } from "pi-extension-settings/sdk";
 * const schema = S.settings({ color: S.text({ description: "…", default: "" }) });
 * ```
 */
export const S = {
  settings,
  text,
  number,
  boolean,
  enum: enumSetting,
  list,
  dict,
  section,
  struct,
} as const;
