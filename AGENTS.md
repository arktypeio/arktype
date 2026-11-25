# ArkType

ArkType is TypeScript's smallest, fastest validator. It parses TypeScript-like string syntax at runtime.

## Using ArkType

- [arktype.io/llms.txt](https://arktype.io/llms.txt) indexes the docs (llmstxt.org format) with a link to each page's Markdown, and [arktype.io/llms-full.txt](https://arktype.io/llms-full.txt) is every ArkType page in one file. Precompile, ArkRegex, Attest, JSON Schema and Internals each have a full file at `arktype.io/docs/<section>/llms.txt`, e.g. [arktype.io/docs/regex/llms.txt](https://arktype.io/docs/regex/llms.txt). Any single page is at its URL plus `.md`. All of it is generated from `ark/docs/content/docs` by `ark/docs/lib/writeMarkdown.ts`.
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
pnpm testAot # @ark/aot's tests, which prChecks leaves out, in up to eight shards at once
pnpm testAot --jobs 4 # in four shards at once; --jobs 1 runs them in one process
ARK_SHARD=3/8 pnpm testAot # the third of the eight shards CI runs them in
pnpm testNeovim # arktype.nvim's parity suite in headless Neovim (needs nvim 0.11+, a C compiler, the tree-sitter CLI)
pnpm testZed # ark/zed's tests, which the root test runs leave out
```

Tests and typechecking read each package's source through the `ark-ts` condition, so neither needs `pnpm build`. Pass test files to `pnpm testFiles` before any flags, e.g. `pnpm testFiles a.test.ts --skipTypes`. `pnpm testTyped a.test.ts` runs every test, because mocha adds named files to the configured spec.

`pnpm testAot` without `ARK_SHARD` runs half as many shards as there are cores, up to eight (one where `CI` is set), each in its own process with its own fixture directory (`ARK_AOT_TEMP`, under `ark/aot/__tests__/temp`) and attest cache (`ATTEST_CACHE_DIR`). It prints each failing shard's output whole, then the failing tests by shard. A fixture a test writes at a fixed path goes through `tempPath()` from `ark/aot/__tests__/utils.ts`, never `fromHere("temp", ...)`, so concurrent shards don't overwrite each other's.

## CI

`pr.yml` runs on every PR, and its `prChecks` job is the gate. It runs three groups in parallel:

- `core`: lint, docs build (with twoslash cache), `pnpm testRepoWithBenches` and `pnpm testJitless`.
- `typescript`: `attest@tsgo` and `repo@6.0.3`.
- `aot`: `pnpm testAot` in eight shards, one runner each. `ark/repo/testAotShard.ts` deals the test files among them by the seconds `ark/aot/__tests__/timings.json` has for each, heaviest first, and `pnpm testAot --list` prints the result. A file without an entry weighs the median, so a new test file needs none. A file heavier than one shard's share has entries for its heavier top-level `describe`s and one for the rest of its tests, and is divided among shards by `--grep`; a `describe` added to it later runs with the rest. A shard that takes over twice the mean shard's planned seconds times `ARK_SHARD_BUDGET_FACTOR` (4 unless set) fails and says to run `pnpm writeAotTimings`, which runs the tests once and rewrites `timings.json`. Commit the result.

`pr.yml` also runs `suggest` (`ark/repo/suggestCiSuites.ts`) on non-fork PRs to post or update a single comment recommending relevant extended suites based on modified folders.

`zed.yml` runs `pnpm testZed` and the extension's `cargo test` on PRs that touch `ark/zed`, `ark/tree-sitter`, `ark/editor-conformance` or `ark/extension`. They build Zed's grammars and fetch its queries, so `testCore`, `testJitless` and `testTypedLoose` exclude `ark/zed`.

`neovim.yml` runs `pnpm testNeovim` on PRs and pushes to `main` that touch `ark/neovim`, `ark/tree-sitter`, `ark/editor-conformance` or `ark/extension`.

`nightly.yml` runs the extended suites offloaded from `pr.yml` — OS/Node `compatibility` (`pnpm testRepoCompat`), `history` (`pnpm testHistory --jobs 4`), full `typescript` version matrix, `environments` (Deno, Bun, Chrome, Firefox), `@ark/aot`'s derived suites (`testDifferential`, `testCache`, `testPerturbation`, `testPrograms`), and `neovim` (`pnpm testNeovim`, arktype.nvim's parity with the VS Code extension in headless Neovim). It runs:

- nightly on `main`. A failing night opens the issue "nightly failing", labelled `nightly`, or comments on it, and the next passing night closes it.
- on a PR labelled `aot:full`, `ci:compat`, `ci:history`, `ci:ts`, `ci:environments`, `ci:neovim` or `ci:all`, when the label is added and on each push after.
- on a PR when a maintainer comments `/run <suite...>` (e.g. `/run aot:full ci:history` or `/run all`), via `pr-commands.yml`.
- on demand from the Actions tab (`workflow_dispatch`), and from another workflow through `workflow_call`.

## Monorepo Structure

- `ark/type`: main validation library (`arktype` on npm)
- `ark/schema`: schema layer (constraint nodes, refinements, scopes)
- `ark/sets`: the set algebra arktype reduces, relates and converts Types with, and the reader behind `fromJsonSchema` (`arksets`, internal and unpublished)
- `ark/util`: shared utilities
- `ark/docs`: documentation site (Next.js)
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
