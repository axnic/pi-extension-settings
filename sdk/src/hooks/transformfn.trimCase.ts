/**
 * hooks/transformfn.trimCase.ts — Text normalisation transforms.
 *
 * All transforms match the `TransformFn` signature: `(value: string) => string`.
 * They are applied when the user confirms a text edit, before the value is
 * written to storage.
 *
 * @example
 * transform: t.pipe(t.trim(), t.kebabCase())
 * // "  My Component  " → "my-component"
 *
 * @module
 */
import type { TransformFn } from "../core/nodes";

/** Remove leading and trailing whitespace. */
export function trim(): TransformFn {
  return (v) => v.trim();
}

/** Convert to lowercase. */
export function lowercase(): TransformFn {
  return (v) => v.toLowerCase();
}

/** Convert to uppercase. */
export function uppercase(): TransformFn {
  return (v) => v.toUpperCase();
}

/**
 * Capitalise the first character and lowercase the rest.
 * @example t.capitalize()("hELLO") // "Hello"
 */
export function capitalize(): TransformFn {
  return (v) => {
    if (!v) return v;
    return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
  };
}

/**
 * Title-case every word (first letter uppercase, rest lowercase).
 * Words are split on any run of non-alphanumeric characters.
 * @example t.titleCase()("hello world") // "Hello World"
 */
export function titleCase(): TransformFn {
  return (v) =>
    v.replace(
      /\w\S*/g,
      (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
    );
}

/**
 * Convert to camelCase. Words are split on non-alphanumeric characters.
 * @example t.camelCase()("hello world") // "helloWorld"
 */
export function camelCase(): TransformFn {
  return (v) => {
    const words = v
      .trim()
      .split(/[^A-Za-z0-9]+/)
      .filter(Boolean);
    if (words.length === 0) return "";
    const [first, ...rest] = words;
    const cap = (w: string) =>
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    return [first?.toLowerCase(), ...rest.map(cap)].join("");
  };
}

/**
 * Convert to kebab-case (lowercase words joined with `-`).
 * @example t.kebabCase()("Hello World") // "hello-world"
 */
export function kebabCase(): TransformFn {
  return (v) =>
    v
      .trim()
      .split(/[^A-Za-z0-9]+/)
      .filter(Boolean)
      .map((w) => w.toLowerCase())
      .join("-");
}

/**
 * Convert to snake_case (lowercase words joined with `_`).
 * @example t.snakeCase()("Hello World") // "hello_world"
 */
export function snakeCase(): TransformFn {
  return (v) =>
    v
      .trim()
      .split(/[^A-Za-z0-9]+/)
      .filter(Boolean)
      .map((w) => w.toLowerCase())
      .join("_");
}
