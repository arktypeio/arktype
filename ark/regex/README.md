# arkregex

A drop-in replacement for `new RegExp()` with types

## Usage

The `regex` function creates a `Regex` instance with types for `.test()`, `.exec()` and more, statically parsed from native JS syntax:

```ts
import { regex } from "arkregex"

const ok = regex("^ok$", "i")
// Regex<"ok" | "oK" | "Ok" | "OK", { flags: "i" }>

const date = regex("^(\\d{4})-(\\d{2})-(\\d{2})$")
// Regex<`${number}-${number}-${number}`, { captures: [`${number}`, `${number}`, `${number}`] }>

const email = regex("^(?<name>\\w+)@(?<domain>\\w+\\.\\w+)$")
// Regex<`${string}@${string}.${string}`, { names: { name: string; domain: `${string}.${string}`; }; ...>
```

All you need to get started is `pnpm install arkregex` (or the equivalent for your package manager of choice) 🎉

Performs best with TS 5.9+

### Features

- **Types**: Infers string types for your existing regular expressions, including positional and named captures
- **Syntax**: Parses the [syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions) `new RegExp()` accepts, including named groups, lookarounds, backreferences, modifiers and Unicode properties
- **Safety**: Syntax errors like referencing a group that doesn't exist are now type errors
- **Zero Runtime**: Improves your type safety without impacting your bundle size

## Docs

See [arktype.io/docs/regex](https://arktype.io/docs/regex) for:

- [Inference](https://arktype.io/docs/regex/inference) of patterns, captures and flags
- [Errors](https://arktype.io/docs/regex/errors) reported for invalid syntax
- [Types](https://arktype.io/docs/regex/types) like `Regex`, `regex.infer` and `regex.as`
- [ArkType](https://arktype.io/docs/regex/arktype) integration
- [FAQ](https://arktype.io/docs/regex/faq)
