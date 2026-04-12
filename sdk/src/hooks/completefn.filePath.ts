/**
 * hooks/completefn.filePath.ts — Filesystem path completer.
 *
 * Provides an async completer that lists filesystem entries matching the
 * current partial input:
 * - Expands `~` to the user's home directory when resolving paths.
 * - If partial ends with `/` or is empty, lists that directory itself.
 * - Otherwise lists the parent directory, filtering by the partial.
 * - Directories are suffixed with `/` to signal traversability.
 * - `~` is re-substituted in results when the original input used it.
 * - Any filesystem error returns an empty suggestion list silently.
 *
 * @module
 */
import { readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type { CompleteFn } from "../core/nodes";

/**
 * Create a filesystem path completer.
 *
 * @example
 * S.text({
 *   tooltip: "Config file path",
 *   default: "",
 *   complete: c.filePath(),
 * })
 */
export function filePath(): CompleteFn {
  return async (partial) => {
    try {
      const p = partial.startsWith("~/")
        ? homedir() + partial.slice(1)
        : partial.startsWith("~")
          ? homedir()
          : partial;

      const dir = p === "" || p.endsWith("/") ? p || "." : dirname(p);
      const resolvedDir = resolve(dir);
      const entries = readdirSync(resolvedDir);

      return entries
        .map((entry) => {
          const full = join(resolvedDir, entry);
          let isDir = false;
          try {
            isDir = statSync(full).isDirectory();
          } catch {
            /* treat as file */
          }
          let displayPath = join(dir, entry) + (isDir ? "/" : "");
          if (partial.startsWith("~"))
            displayPath = displayPath.replace(homedir(), "~");
          return displayPath;
        })
        .filter((entry) => partial === "" || entry.startsWith(partial))
        .sort();
    } catch {
      return [];
    }
  };
}
