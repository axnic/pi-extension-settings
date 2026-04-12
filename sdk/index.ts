/**
 * sdk/index.ts — Public SDK surface for consumer extensions.
 *
 * ```ts
 * import { ExtensionSettings, S } from "pi-extension-settings/sdk";
 * ```
 *
 * @module
 */

export {
  EnumDefaultMismatchError,
  PiSettingsError,
  SchemaError,
  SettingNotFoundError,
  TooltipTooLongError,
} from "./src/core/errors";
export type { SettingChangedPayload } from "./src/core/extension-settings";
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
} from "./src/core/nodes";
export {
  isLeafNode,
  isSectionNode,
} from "./src/core/nodes";
export type { InferConfig } from "./src/core/schema";
export { S } from "./src/core/schema";
