/**
 * build.mjs — Bundle the extension with esbuild.
 *
 * Bundles index.ts + src/ + sdk/ into a single dist/index.js.
 * Only @mariozechner/pi-coding-agent and Node built-ins are kept external —
 * everything else (including the SDK workspace package) is inlined.
 */

import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["index.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node24",
  external: ["@mariozechner/pi-coding-agent", "node:*"],
  outfile: "dist/index.js",
  sourcemap: true,
});

console.log("✓ Extension bundled → dist/index.js");
