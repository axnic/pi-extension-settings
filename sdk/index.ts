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

export { S } from "./src/core/schema.ts";
export type { InferConfig } from "./src/core/schema.ts";

export { v, t, c, d } from "./src/hooks/index.ts";

export {
  isLeafNode,
  isSectionNode,
  enumValues,
  enumLabel,
  defaultAsString,
} from "./src/core/nodes.ts";
export type {
  TextValue,
  BoolValue,
  ListItem,
  DictEntry,
} from "./src/core/nodes.ts";
export type {
  ValidationResult,
  ValidationFn,
  TransformFn,
  CompleteFn,
  DisplayFn,
  ListDisplayFn,
} from "./src/core/nodes.ts";
export type {
  Struct,
  Text,
  Boolean,
  Enum,
  List,
  Dict,
  Section,
  SettingNode,
  LeafNode,
} from "./src/core/nodes.ts";
