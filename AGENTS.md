# ArkType

ArkType is TypeScript's 1:1 validator, optimized from editor to runtime. It parses TypeScript-like string syntax at runtime.

## Using ArkType

- [arktype.io/llms.txt](https://arktype.io/llms.txt) is the full documentation, concatenated from `ark/docs/content`.
- The [cheat sheet](https://arktype.io/docs/cheat-sheet) (`ark/docs/content/docs/cheat-sheet.mdx`) is an abbreviated version of it covering the most common syntax and gotchas.

## Commands

```bash
pnpm i && pnpm build # install and build all packages
pnpm test # run tests without type checking
pnpm prChecks # lint, build, typecheck and test (run before PRs)
```

## Monorepo Structure

- `ark/type` — main validation library (`arktype` on npm)
- `ark/schema` — schema layer (constraint nodes, refinements, scopes)
- `ark/util` — shared utilities
- `ark/docs` — documentation site (Fumadocs/Next.js)
- `ark/json-schema` — JSON Schema conversion
- `ark/regex` — ArkRegex type-safe regex
- `ark/attest` — assertion/test library
- `ark/fast-check` — property testing integration

## Key Patterns

Keywords follow `typescriptType.constraint.subconstraint`, e.g. `string.email`, `number.integer`, `string.json.parse`.

To add a regex string validator, create it with `regexStringNode(/^pattern$/, "description")` (patterns must be anchored), register it in the `Scope.module()` in `ark/type/keywords/string.ts` and add it to the namespace `$` type.

To add a number keyword, use `rootSchema()` with `domain`, `min`/`max`, `divisor` or `predicate` constraints. See `ark/type/keywords/number.ts`.

## Code Style

- Tabs, no semicolons, no trailing commas (`prettier` enforced)
- `experimentalTernaries: true` — `?` at end of line, `:` on next line
- `arrowParens: "avoid"` — `x => x` not `(x) => x`
- Tests use `attest` with `.snap()` for snapshots
