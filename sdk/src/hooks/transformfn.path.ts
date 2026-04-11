/**
 * hooks/transformfn.path.ts — Path transform: expand leading `~`.
 *
 * @module
 */
import { homedir } from "node:os";
import type { TransformFn } from "../core/nodes.ts";

/**
 * Expand a leading `~` or `~/` to the current user's home directory.
 *
 * - `"~"` → `homedir()` (e.g. `"/Users/alice"`)
 * - `"~/foo"` → `homedir() + "/foo"`
 * - Any other string is returned unchanged (no trimming is performed).
 *
 * To trim _before_ expanding, compose with `t.trim()`:
 * `t.pipe(t.trim(), t.expandPath())`
 *
 * @example
 * t.expandPath()("~/projects") // "/Users/alice/projects"
 * t.expandPath()("/tmp")       // "/tmp"
 */
export function expandPath(): TransformFn {
  return (value: string) => {
    if (value === "~") return homedir();
    if (value.startsWith("~/")) return homedir() + value.slice(1);
    return value;
  };
}
