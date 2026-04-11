/**
 * hooks/transformfn.compose.ts — Transform composition utilities.
 *
 * Two composition helpers are exported:
 *
 * - **`pipe(...transforms)`** — Left-to-right (most intuitive).
 *   `pipe(a, b, c)(v)` is equivalent to `c(b(a(v)))`.
 *   Use this when you want to express a chain of steps in execution order.
 *
 * - **`compose(...transforms)`** — Right-to-left (mathematical convention).
 *   `compose(a, b, c)(v)` is equivalent to `a(b(c(v)))`.
 *   Use this when you prefer function composition notation.
 *
 * Both return the identity function when called with no arguments.
 *
 * @example
 * const normalise = t.pipe(t.trim(), t.lowercase(), t.kebabCase());
 * normalise("  Hello World  "); // "hello-world"
 *
 * @module
 */
import type { TransformFn } from "../core/nodes.ts";

/**
 * Compose transforms left-to-right (pipe).
 *
 * The output of each transform becomes the input of the next.
 * `pipe(a, b, c)(v)` === `c(b(a(v)))`.
 *
 * @param transforms - Zero or more transforms. If empty, returns the identity function.
 *
 * @example
 * t.pipe(t.trim(), t.lowercase())("  HELLO  ") // "hello"
 */
export function pipe(...transforms: TransformFn[]): TransformFn {
  if (transforms.length === 0) return (value) => value;
  return (value: string) => transforms.reduce((curr, fn) => fn(curr), value);
}

/**
 * Compose transforms right-to-left (mathematical composition).
 *
 * `compose(a, b, c)(v)` === `a(b(c(v)))`.
 *
 * @param transforms - Zero or more transforms. If empty, returns the identity function.
 *
 * @example
 * t.compose(t.lowercase(), t.trim())("  HELLO  ") // "hello"
 * // equivalent to: t.pipe(t.trim(), t.lowercase())
 */
export function compose(...transforms: TransformFn[]): TransformFn {
  if (transforms.length === 0) return (value) => value;
  return (value: string) => transforms.reduceRight((curr, fn) => fn(curr), value);
}
