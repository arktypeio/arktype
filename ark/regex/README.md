# @ark/regex

A drop-in replacement for `new RegExp()` with types.

## Usage

The `regex` function creates a `Regex` instance with types for `.test()`, `.exec()` and more, statically parsed from native JS syntax.

```ts
import { regex } from "@ark/regex"

const semver = regex("^(\\d*)\\.(\\d*)\\.(\\d*)$")
// Type: Regex<`${bigint}.${bigint}.${bigint}`, { captures: [`${bigint}`, `${bigint}`, `${bigint}`] }>

const email = regex("^(?<name>\\w+)@(?<domain>\\w+\\.\\w+)$")
// Type: Regex<`${string}@${string}.${string}`, { names: { name: string; domain: `${string}.${string}`; }; ...>
```

## Features

- **Types**: Infers string types for your existing regular expressions, including positional and named captures
- **Parity**: Supports 100% of [features](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions) allowed by `new RegExp()`
- **Safety**: Syntax errors like referencing a group that doesn't exist are now type errors
- **Zero Runtime**: Improves your type safety without impacting your bundle size[\*](#footnote)

## Examples

```ts
// Anchored patterns
const start = regex("^hello") // Type: Regex<`hello${string}`, {}>
const end = regex("world$") // Type: Regex<`${string}world`, {}>
const exact = regex("^hello$") // Type: Regex<"hello", {}>

// Quantifiers
const optional = regex("^colou?r$") // Type: Regex<"color" | "colour", {}>
const multiple = regex("^a+$") // Type: Regex<`a${string}`, {}>

// Character classes
const digits = regex("^\\d+$") // Type: Regex<`${bigint}`, {}>
const words = regex("^\\w+$") // Type: Regex<string, {}>

// Capture groups
const captured = regex("^(\\w+):(\\d+)$")
// Type: Regex<`${string}:${bigint}`, { captures: [string, `${bigint}`] }>

// Case-insensitive flag
const caseInsensitive = regex("^ok$", "i")
// Type: Regex<"ok" | "oK" | "Ok" | "OK", { flags: "i" }>
```

## My regex is too long

If your expression is especially long or complex, TypeScript won't be able to infer it.

If your types start to slow down or you see the dreaded `Type is excessively deep...`, you can manually type your expression:

```ts
// For complex patterns, use the typed Regex class directly
const complexPattern: Regex<"complex-string", { captures: [string, string] }> =
	new RegExp("very-long-complex-pattern-here") as never
```

<a id="footnote"></a>
\*The actual runtime bundle size is one line:

```ts
export const regex = (src, flags) => new RegExp(src, flags)
```
