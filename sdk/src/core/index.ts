/**
 * core/index.ts — Barrel export for the `sdk/src/core` module.
 *
 * This is the authoritative location for the SDK's structural types and classes.
 * Consumer extensions should import from the top-level `sdk/src/index.ts`
 * rather than from this file directly.
 *
 * @module
 */

// ─── Custom errors ────────────────────────────────────────────────────────────
export {
  EnumDefaultMismatchError,
  PiSettingsError,
  SchemaError,
  SettingNotFoundError,
  TooltipTooLongError,
} from "./errors";
// ─── ExtensionSettings class ──────────────────────────────────────────────────
export { ExtensionSettings } from "./extension-settings";
// ─── Value types ──────────────────────────────────────────────────────────────
// ─── Hook function types ──────────────────────────────────────────────────────
// ─── Base node ────────────────────────────────────────────────────────────────
// ─── Setting node types ───────────────────────────────────────────────────────
export type {
  BaseSettingNode,
  Boolean,
  BoolValue,
  CompleteFn,
  Dict,
  DictEntry,
  DisplayFn,
  Enum,
  LeafNode,
  List,
  ListItem,
  Number,
  NumValue,
  Section,
  SettingNode,
  Struct,
  Text,
  TextValue,
  TransformFn,
  ValidationFn,
  ValidationResult,
} from "./nodes";
// ─── Node helpers ─────────────────────────────────────────────────────────────
export {
  defaultAsString,
  enumLabel,
  enumValues,
  isLeafNode,
  isSectionNode,
} from "./nodes";
export type { InferConfig } from "./schema";
// ─── Schema builders and inference ───────────────────────────────────────────
export { S } from "./schema";
