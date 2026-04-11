/**
 * sdk/index.ts — Public SDK surface for consumer extensions.
 *
 * ```ts
 * import { ExtensionSettings, S, v, t, c, d } from "pi-extension-settings/sdk";
 * ```
 *
 * @module
 */

export { ExtensionSettings } from "./src/core/extension-settings.ts";
export type {
  Boolean,
  BoolValue,
  CompleteFn,
  Dict,
  DictEntry,
  DisplayFn,
  Enum,
  LeafNode,
  List,
  ListDisplayFn,
  ListItem,
  Section,
  SettingNode,
  Struct,
  Text,
  TextValue,
  TransformFn,
  ValidationFn,
  ValidationResult,
} from "./src/core/nodes.ts";

export {
  defaultAsString,
  enumLabel,
  enumValues,
  isLeafNode,
  isSectionNode,
} from "./src/core/nodes.ts";
export type { InferConfig } from "./src/core/schema.ts";
export { S } from "./src/core/schema.ts";
export { c, d, t, v } from "./src/hooks/index.ts";
