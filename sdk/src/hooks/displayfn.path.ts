/**
 * hooks/displayfn.path.ts — Filesystem path display function.
 *
 * Collapses the user's home directory prefix to `~` for display. This is a
 * presentation-only transform — the stored value is not modified.
 *
 * @module
 */
import { homedir } from "node:os";
import type { Theme } from "@mariozechner/pi-coding-agent";
import type { DisplayFn, TextValue } from "../core/nodes.ts";

/**
 * Display a filesystem path with the home directory collapsed to `~`.
 *
 * @example
 * display: d.path()
 * // "/Users/alice/project" → "~/project"
 */
export function path(): DisplayFn<TextValue> {
  const home = homedir();
  return (value: string, _theme: Theme): string => {
    if (value.startsWith(home)) return `~${value.slice(home.length)}`;
    return value;
  };
}
