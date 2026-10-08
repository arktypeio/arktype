# ArkType

ArkType is TypeScript's 1:1 validator, optimized from editor to runtime. It parses TypeScript-like string syntax at runtime.

## Using ArkType

- [arktype.io/llms.txt](https://arktype.io/llms.txt) is the full documentation, concatenated from `ark/docs/content/docs/(arktype)`. Attest's is at [arktype.io/docs/attest/llms.txt](https://arktype.io/docs/attest/llms.txt) and ArkRegex's at [arktype.io/docs/regex/llms.txt](https://arktype.io/docs/regex/llms.txt).
- The [cheat sheet](https://arktype.io/docs/cheat-sheet) (`ark/docs/content/docs/(arktype)/cheat-sheet.mdx`) is an abbreviated version of it covering the most common syntax and gotchas.

## Commands

```bash
pnpm i && pnpm build # install and build all packages
pnpm test # run tests without type checking
pnpm testFiles ark/type/__tests__/brand.test.ts # run and type check only the named test files
pnpm typecheckRepo # incremental typecheck of the whole repo
pnpm prChecks # lint, build, typecheck and test (run before PRs)
```

Tests and typechecking read each package's source through the `ark-ts` condition, so neither needs `pnpm build`. Pass test files to `pnpm testFiles` before any flags, e.g. `pnpm testFiles a.test.ts --skipTypes`. `pnpm testTyped a.test.ts` runs every test, because mocha adds named files to the configured spec.

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

To add a regex string validator, add its English phrase to `ark/type/keywords/phrases.ts` under its flat alias (e.g. `"string.email": "an email address"`), create it with `regexStringNode(/^pattern$/, "string.alias")` (patterns must be anchored), register it in the `Scope.module()` in `ark/type/keywords/string.ts` and add it to the namespace `$` type. Other keyword nodes with authored text take their meta from `keywordMeta(alias)`, so messages can find the phrase by `meta.keyword`.

To add a number keyword, use `node("intersection", …)` with a `domain` node and `min`/`max`, `divisor` or `predicate` nodes. See `ark/type/keywords/number.ts`.

## Code Style

- Tabs, no semicolons, no trailing commas (`prettier` enforced)
- `experimentalTernaries: true` — `?` at end of line, `:` on next line
- `arrowParens: "avoid"` — `x => x` not `(x) => x`
- Tests use `attest` with `.snap()` for snapshots
