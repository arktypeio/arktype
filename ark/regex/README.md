# arkregex

A drop-in replacement for `new RegExp()` with types

## Usage

The `regex` function creates a `Regex` instance with types for `.test()`, `.exec()` and more, statically parsed from native JS syntax.

```ts
import { regex } from "arkregex"

const ok = regex("^ok$", "i")
// 	  ^ Regex<"ok" | "oK" | "Ok" | "OK", { flags: "i" }>

const semver = regex("^(\\d*)\\.(\\d*)\\.(\\d*)$")
// 	  ^ Regex<`${bigint}.${bigint}.${bigint}`, { captures: [`${bigint}`, `${bigint}`, `${bigint}`] }>

const email = regex("^(?<name>\\w+)@(?<domain>\\w+\\.\\w+)$")
// 	  ^ Regex<`${string}@${string}.${string}`, { names: { name: string; domain: `${string}.${string}`; }; ...>
```

## Features

- **Types**: Infers string types for your existing regular expressions, including positional and named captures
- **Parity**: Supports 100% of [features](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions) allowed by `new RegExp()`
- **Safety**: Syntax errors like referencing a group that doesn't exist are now type errors
- **Zero Runtime**: Improves your type safety without impacting your bundle size[\*](#footnote)

## FAQ

### Why aren't some patterns like `[a-Z]` inferred more precisely?

Constructing string literal types for these sorts of expressions is combinatorial and will explode very quickly if we infer character ranges like this as literal characters.

We've tried to strike a balance between performance and precision while guaranteeing that the inferred types are at worst imprecise and never incorrect.

### Why doesn't it work with my massive RegExp?

If your expression is especially long or complex, TypeScript won't be able to infer it.

If your types start to slow down or you see the dreaded `Type is excessively deep...`, you can manually type your expression using `regex.cast`:

```ts
const complexPattern = regex.cast<`pattern-${string}`, { captures: [string] }>(
	"very-long-complex-expression-here"
)
```

<a id="footnote"></a>
\*The actual runtime bundle size is two lines:

```ts
export const regex = (src, flags) => new RegExp(src, flags)
Object.assign(regex, { cast: regex })
```
