# ArkType

ArkType is TypeScript's smallest, fastest validator. It parses TypeScript-like string syntax at runtime.

## Using ArkType

- [arktype.io/llms.txt](https://arktype.io/llms.txt) indexes the docs (llmstxt.org format) with a link to each page's Markdown, and [arktype.io/llms-full.txt](https://arktype.io/llms-full.txt) is every ArkType page in one file. Precompile, ArkRegex, Attest, JSON Schema, ArkSets and Internals each have a full file at `arktype.io/docs/<section>/llms.txt`, e.g. [arktype.io/docs/regex/llms.txt](https://arktype.io/docs/regex/llms.txt). Any single page is at its URL plus `.md`. All of it is generated from `ark/docs/content/docs` by `ark/docs/lib/writeMarkdown.ts`.
- [`ark/type/skills/arktype/SKILL.md`](ark/type/skills/arktype/SKILL.md) is the Agent Skill users install with `npx skills add arktypeio/arktype`. Keep its examples type-checking against the current API: `pnpm testSkill` checks them. Its `references/migrating.md` is written from the docs' `migrating.mdx` when the docs build, so edit that page instead.
- [Precompile](https://arktype.io/docs/precompile) (`ark/docs/content/docs/precompile`) is the reference for `@ark/aot`; `ark/aot/README.md` only points to it.
- Every benchmark number or superlative the docs state lives in `ark/docs/lib/claims.ts`, with the benchmark that backs it, except the homepage's own benchmark and [Size at scale](https://arktype.io/docs/precompile/size-at-scale), which `ark/docs/lib/bench` computes from its data (`sizeScale.ts` writes that page's every number and comparison from `pnpm benchSizeScale`'s). Don't state one elsewhere.
- The [cheat sheet](https://arktype.io/docs/cheat-sheet) (`ark/docs/content/docs/(arktype)/cheat-sheet.mdx`) is an abbreviated version of the skill covering the most common syntax and gotchas.

## Commands

```bash
pnpm i && pnpm build # install and build all packages
pnpm test # run tests without type checking
pnpm testFiles ark/type/__tests__/brand.test.ts # run and type check only the named test files
pnpm typecheckRepo # incremental typecheck of the whole repo
pnpm prChecks # lint, build, typecheck and test, except @ark/aot (run before PRs)
pnpm testAot # @ark/aot's tests, which prChecks leaves out
ARK_SHARD=3/8 pnpm testAot # the third of the eight shards CI runs them in
```

Tests and typechecking read each package's source through the `ark-ts` condition, so neither needs `pnpm build`. Pass test files to `pnpm testFiles` before any flags, e.g. `pnpm testFiles a.test.ts --skipTypes`. `pnpm testTyped a.test.ts` runs every test, because mocha adds named files to the configured spec.

## CI

`pr.yml` runs on every PR, and its `prChecks` job is the gate. Beside `pnpm prChecks` and the compatibility, TypeScript version and history jobs, it runs:

- `aot`: `pnpm testAot` in eight shards, one runner each. `ark/repo/testAotShard.ts` deals the test files among them by the seconds `ark/aot/__tests__/timings.json` has for each, heaviest first, and `pnpm testAot --list` prints the result. A file without an entry weighs the median, so a new test file needs none. A file heavier than one shard's share has entries for its heavier top-level `describe`s and one for the rest of its tests, and is divided among shards by `--grep`; a `describe` added to it later runs with the rest. A shard that takes over twice the mean shard's planned seconds times `ARK_SHARD_BUDGET_FACTOR` (4 unless set) fails and says to run `pnpm writeAotTimings`, which runs the tests once and rewrites `timings.json`. Commit the result.
- `environments`: `pnpm testEnvironments`, a precompiled program in Deno, Bun and browsers.

`aot.yml` runs @ark/aot's derived suites, up to an hour a job: `testDifferential` and `testCache`, the repo's tests against precompiled validators, then `testPerturbation` and `testPrograms`. They aren't part of the gate. It runs:

- nightly, on `main` and `featherduster` (until 3.0 merges; the list is in its `plan` job). A failing night opens the issue "aot nightly failing", labelled `aot-nightly`, or comments on it, and the next passing night closes it.
- on a PR labelled `aot:full`, when the label is added and on each push after. Add it to a PR that changes what the build emits.
- on demand from the Actions tab, and from another workflow through `workflow_call`.

## Monorepo Structure

- `ark/type`: main validation library (`arktype` on npm)
- `ark/schema`: schema layer (constraint nodes, refinements, scopes)
- `ark/sets`: set algebra over schemas, to relate, combine and convert Types and JSON Schemas (`arksets` on npm)
- `ark/util`: shared utilities
- `ark/docs`: documentation site (Next.js)
- `ark/json-schema`: JSON Schema conversion
- `ark/aot`: build-time precompilation of Types to standalone validators (`@ark/aot` on npm)
- `ark/regex`: ArkRegex type-safe regex
- `ark/attest`: assertion/test library
- `ark/fast-check`: property testing integration

## Key Patterns

Keywords follow `typescriptType.constraint.subconstraint`, e.g. `string.email`, `number.integer`, `string.json.parse`.

To add a regex string validator, add its English phrase to `ark/type/keywords/phrases.ts` under its flat alias (e.g. `"string.email": "an email address"`) and its German one to `ark/type/locales/de.ts`, create it with `regexStringNode(/^pattern$/, "string.alias")` (patterns must be anchored), register it in the `Scope.module()` in `ark/type/keywords/string.ts` and add it to the namespace `$` type. Other keyword nodes with authored text take their meta from `keywordMeta(alias)`, so messages can find the phrase by `meta.keyword`.

To add a number keyword, use `node("intersection", …)` with a `domain` node and `min`/`max`, `divisor` or `predicate` nodes. See `ark/type/keywords/number.ts`.

## Code Style

- Tabs, no semicolons, no trailing commas (`prettier` enforced)
- `experimentalTernaries: true`: `?` at end of line, `:` on next line
- `arrowParens: "avoid"`: `x => x` not `(x) => x`
- Tests use `attest` with `.snap()` for snapshots
