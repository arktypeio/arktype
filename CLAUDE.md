# ArkType — Agent Context

ArkType is TypeScript's 1:1 validator, optimized from editor to runtime. It parses TypeScript-like string syntax at runtime — this is unique among validation libraries.

## Quick Start

```bash
pnpm i && pnpm build     # install and build all packages
pnpm prChecks             # lint + build + test (run before PRs)
pnpm testTyped --skipTypes # run tests without type checking
```

## Monorepo Structure

- `ark/type/` — main validation library (`arktype` on npm)
- `ark/schema/` — schema layer (constraint nodes, refinements, scopes)
- `ark/util/` — shared utilities
- `ark/docs/` — documentation site (Fumadocs/Next.js)
- `ark/json-schema/` — JSON Schema conversion
- `ark/regex/` — ArkRegex type-safe regex
- `ark/attest/` — custom assertion/test library
- `ark/fast-check/` — property testing integration

## Key Patterns

**String keywords** follow `typescriptType.constraint.subconstraint`:
- `string.email`, `string.uuid`, `string.url`, `string.hex`
- `number.integer`, `number.safe`, `number.epoch`
- Morphs: `string.trim`, `string.json.parse`, `string.date.parse`

**Adding a regex string validator:**
```ts
const myValidator = regexStringNode(/^pattern$/, "description")
```
Register in `Scope.module()` in `ark/type/keywords/string.ts` and add to the namespace `$` type.

**Adding a number keyword:**
Use `rootSchema()` with `domain`, `min`/`max`, or `predicate` constraints. See `number.safe` in `ark/type/keywords/number.ts`.

## Code Style

- Tabs, no semicolons, no trailing commas (`prettier` enforced)
- `experimentalTernaries: true` — `?` at end of line, `:` on next line
- `arrowParens: "avoid"` — `x => x` not `(x) => x`
- Tests use `attest` (custom lib) with `.snap()` for snapshots

## ArkType Syntax Cheat Sheet

```ts
// optional keys — append ? to the key name
type({ "name?": "string" })

// arrays — use .array(), NOT type([Schema])
Schema.array()

// records — use index signature syntax
type({ "[string]": ValueSchema })

// type inference
type User = typeof UserSchema.infer

// error handling
const out = Schema(data)
if (out instanceof type.errors) {
  console.error(out.summary)
}

// three syntax kinds (equivalent):
type("string | number")            // string expression
type(["string", "|", "number"])    // tuple expression
type("string").or("number")        // chained
```

## Common Gotchas

- `type([X])` creates a 1-element **tuple**, not an array — use `X.array()`
- `"string | undefined"` for optional — use `"key?": "string"` instead
- `"Record<string, T>"` doesn't work — use `type({ "[string]": T })`
- `safeParse()` doesn't exist — call the type directly: `const out = Schema(data)`
- `auth-schema.ts` is generated — never edit it
- `regexStringNode()` patterns must be anchored with `^`/`$`
