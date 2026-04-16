/**
 * Minimal type shim for marked-terminal.
 *
 * The full @types/marked-terminal package pins a specific marked major version
 * (v11) that conflicts with the marked@15 peer dependency used by the runtime
 * marked-terminal@7.x. Because description.ts accesses the extension function
 * via `(markedTerminal as any)(...)`, no detailed typings are needed here.
 */
declare module "marked-terminal" {
  export function markedTerminal(options?: unknown): unknown;
}
