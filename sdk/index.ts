/**
 * sdk/index.ts — Public SDK surface for consumer extensions.
 *
 * ```ts
 * import { ExtensionSettings, S, v, t, c, d } from "pi-extension-settings/sdk";
 * ```
 *
 * @module
 */

export { ExtensionSettings } from "./src/core/extension-settings";
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
} from "./src/core/nodes";

export {
  defaultAsString,
  enumLabel,
  enumValues,
  isLeafNode,
  isSectionNode,
} from "./src/core/nodes";
export type { InferConfig } from "./src/core/schema";
export { S } from "./src/core/schema";
export { c, d, t, v } from "./src/hooks/index";
