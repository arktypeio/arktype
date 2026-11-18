# Open issue audit

This audit covers the 223 issues open on arktypeio/arktype on 2026-10-07. Every bug-like report was reproduced on arktype 2.2.8 (`main` at 1ca8ceaf4, the current npm release) and on the featherduster branch (1e4c240c3). An independent verifier then re-ran and challenged each bug verdict, close recommendation and note. It revised 69 of the 223 verdicts. Nothing was posted to GitHub. Findings worth sharing with a reporter are in [Notes by issue](#notes-by-issue).

| Category                                                                               | Issues                                       | Suggested action                        |
| -------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------- |
| [Fix tracker](#fix-tracker)                                                            | 15 fixed, 0 awaiting a decision, 0 in review | post the comments on fixed issues       |
| [Easy-win bugs](#easy-win-bugs)                                                        | 15                                           | fix on featherduster                    |
| [Clear bugs](#clear-bugs)                                                              | 28                                           | schedule; 16 need a decision first      |
| [Fixed on featherduster](#fixed-on-featherduster)                                      | 21                                           | close when featherduster ships          |
| [Probably close: out of date](#probably-close-out-of-date)                             | 22                                           | close now                               |
| [Probably close: out of scope or incorrect](#probably-close-out-of-scope-or-incorrect) | 22                                           | close, with the note where there is one |
| [Needs info](#needs-info)                                                              | 2                                            | ask the reporter                        |
| [Relevant features](#relevant-features)                                                | 78                                           | keep; 63 need a design decision         |
| [Docs](#docs)                                                                          | 14                                           | keep                                    |
| [Internal](#internal)                                                                  | 21                                           | keep or close at your discretion        |

Two cross-cutting lists follow the categories: [featherduster breaking-change candidates](#featherduster-breaking-change-candidates) and [side findings](#side-findings), which are problems the audit found that no open issue tracks, including two featherduster behavior changes the CHANGELOG doesn't mention.

Each entry lists the package the work lands in, the effort, whether the change is breaking, reactions on the issue, and a link to its note when it has one.

## Fix tracker

This section is updated as fixes from this audit land. A fix that only corrects behavior lands on the featherduster branch directly. One that makes an API or behavior decision waits here for approval first. Each landed fix comes with a comment to post on its issue. Every snippet in a comment was run against the fixed tree. The comments refer to the branch as `featherduster` ([#1685](https://github.com/arktypeio/arktype/pull/1685)).

| Issue              | Status                 | Commits                                                          |
| ------------------ | ---------------------- | ---------------------------------------------------------------- |
| [#1121](#fix-1121) | fixed in featherduster | 23f54d05b                                                        |
| [#1473](#fix-1473) | fixed in featherduster | 312718029                                                        |
| [#1306](#fix-1306) | fixed in featherduster | 99934ba9f                                                        |
| [#1470](#fix-1470) | fixed in featherduster | f923ffeb1                                                        |
| [#1529](#fix-1529) | fixed in featherduster | f7c43123b, 49fea0d79                                             |
| [#1555](#fix-1555) | fixed in featherduster | 0332e7a9d                                                        |
| [#1548](#fix-1548) | fixed in featherduster | 09fb6f7f9                                                        |
| [#1530](#fix-1530) | fixed in featherduster | 196ced06c                                                        |
| [#1577](#fix-1577) | fixed in featherduster | 46acabbf1                                                        |
| [#1430](#fix-1430) | fixed in featherduster | 8c66cc7c1                                                        |
| [#1600](#fix-1600) | fixed in featherduster | f1fc4e798                                                        |
| [#1676](#fix-1676) | fixed in featherduster | 84ff9fbb6                                                        |
| [#1445](#fix-1445) | fixed in featherduster | 9987af9cb, 551d873e1, d5b4fc498, 35cbdb031, 6060504dc, 309c867ee |
| [#1160](#fix-1160) | fixed in featherduster | a55e764a7                                                        |
| [#1023](#fix-1023) | fixed in featherduster | 9dfead2f3                                                        |

### Fixed in featherduster

### <a id="fix-1121"></a>[#1121](https://github.com/arktypeio/arktype/issues/1121) Replace cases of {} being used to store arbitrary names with Object.create(null)

Fixed in featherduster by 23f54d05b.

Comment to post:

Fixed on the `featherduster` branch (#1685) in 23f54d0.

The original `register` case was already fixed, but several other maps keyed by user-supplied names still inherited from `Object.prototype`: scope aliases, ambient keywords, the string parse cache, generic args, node id counters, module exports and the `FormData.parse` accumulator. Internal-only maps now use `Object.create(null)`; user-facing ones (`type.keywords`, a scope's aliases) keep their prototype and are read with an own-property check.

```ts
const types = scope({ toString: "string", constructor: "number" }).export()
types.toString("foo") // "foo" (was ParseError: #toString duplicates public alias toString)

type("toString" as any)
// throws 'toString' is unresolvable (was an internal TypeError)

const fd = new FormData()
fd.append("toString", "a")
fd.append("toString", "b")
type("FormData.parse")(fd) // { toString: ["a", "b"] }
```

An alias named `__proto__` still doesn't work, since assigning that key sets the object's prototype. The lint rule against `{}` dictionaries hasn't been added.

### <a id="fix-1473"></a>[#1473](https://github.com/arktypeio/arktype/issues/1473) Content-Security-Policy warning

Fixed in featherduster by 312718029.

Comment to post:

Fixed on the `featherduster` branch (#1685) in 3127180.

The `new Function("return false")` CSP probe ran unconditionally while the default config was built, so `jitless: true` only overrode its result after the violation was already logged. The probe now runs only if `jitless` isn't already set in the global config. Simulating a CSP that blocks eval in Node:

```ts
const calls: string[] = []
globalThis.Function = new Proxy(globalThis.Function, {
	construct(target, args) {
		calls.push(String(args.at(-1)))
		throw new EvalError("blocked by CSP (simulated)")
	}
}) as never
const { configure } = await import("arktype/config")
configure({ jitless: true })
const { type } = await import("arktype")
console.log(calls) // [] (was [ 'return false' ])
type({ a: "string" })({ a: 5 }).toString() // "a must be a string (was a number)"
```

`configure` has to run before arktype is first imported, e.g. from its own module imported ahead of arktype, as in the [configuration docs](https://arktype.io/docs/configuration). Without a global `jitless` setting, the probe still runs once, and setting `jitless` only at the scope level doesn't skip it.

### <a id="fix-1306"></a>[#1306](https://github.com/arktypeio/arktype/issues/1306) Attest trace fails on `composite` typescript projects

Fixed in featherduster by 99934ba9f.

Comment to post:

Fixed on the `featherduster` branch (#1685) in 99934ba.

`attest trace` and `attest stats` passed `--incremental false --tsBuildInfoFile null` to tsc so stale build info couldn't skip the check. Composite projects reject that (TS6379), and since TypeScript 5.6 tsc then skip type checking entirely, hence the empty trace and 0 instantiations. Simply adding `--composite false` instead breaks composite projects that set `declarationMap`, `declarationDir` etc. (TS5069). Both commands now leave the project's options alone and run tsc with `--incremental` and a build info file in a fresh temp dir, which is removed afterwards.

With your tsconfig and a recursive type in `src/index.ts`, `attest stats` now reports real counts (`"instantiations": 34068`), and `attest trace .` writes and analyzes a trace.

### <a id="fix-1470"></a>[#1470](https://github.com/arktypeio/arktype/issues/1470) Using configure on string literal causes the enum to become "anyOf" in schema

Fixed in featherduster by f923ffeb1.

Comment to post:

Fixed on the `featherduster` branch (#1685) in f923ffe.

`.configure()` and `.describe()` apply meta to each literal branch of a union as well as the union itself, and `toJsonSchema` only collapsed a union to `enum` when its branches had no meta at all. Branches whose meta matches the union's now collapse too:

```ts
const Provider = type("'sqlite' | 'postgresql' | 'mysql'")
const Database = type({
	provider: Provider.configure({ title: "Database Provider" }),
	url: type("string").configure({ title: "Database URL" })
})
Database.toJsonSchema()
// {
// 	$schema: "https://json-schema.org/draft/2020-12/schema",
// 	type: "object",
// 	properties: {
// 		provider: { enum: ["mysql", "postgresql", "sqlite"], title: "Database Provider" },
// 		url: { type: "string", title: "Database URL" }
// 	},
// 	required: ["provider", "url"]
// }
```

A branch with its own different meta still produces `anyOf`, as does a nullable union like `'a' | 'b' | null`, since `null` isn't emitted as a `const`.

Workaround on 2.2.8: configure only the union node with `Provider.configure({ title: "Database Provider" }, "self")`.

### <a id="fix-1529"></a>[#1529](https://github.com/arktypeio/arktype/issues/1529) ArkRegex's `regex()` returns `any` type in the playground

Fixed in featherduster by f7c43123b and 49fea0d79.

Comment to post:

Fixed on the `featherduster` branch (#1685) in f7c4312.

The playground loads a bundled copy of arkregex's type declarations, and the bundler dropped the internal `s` namespace that the parser types use, so `regex()` resolved to `any`. The bundle is now built from an entry that exports that namespace, and `regex("^ok$", "i")` infers `Regex<"ok" | "oK" | "Ok" | "OK", { flags: "i" }>` through it again. A test now type-checks a snippet against the bundled declarations so this can't silently regress.

The same check turned up a similar bundling problem with `Required<...>` in arktype scopes, which inferred an error type in the playground; that's fixed in 49fea0d.

The playground will pick both up once the docs are deployed from that branch. The `Define a Type called "Thing" to enable introspection` message is unrelated: the playground shows it whenever the code doesn't define a type named `Thing`.

### <a id="fix-1555"></a>[#1555](https://github.com/arktypeio/arktype/issues/1555) Blob and File Obj check would not work in Mini-Program enviroment

Fixed in featherduster by 0332e7a9d.

Comment to post:

Fixed on the `featherduster` branch (#1685) in 0332e7a.

`@ark/util` read `Blob`, `URL` and the other web platform constructors as bare globals, which throws a `ReferenceError` in runtimes that don't define them. They're now read as properties of `globalThis`, so a missing one is just `undefined`. Simulated by deleting the globals before import:

```ts
for (const k of [
	"Blob",
	"File",
	"FormData",
	"Headers",
	"Request",
	"Response",
	"URL"
])
	delete (globalThis as any)[k]

const { type } = await import("arktype")

const FlowItem = type({
	"source?": "string | number",
	"update_time?": "string | number",
	"value?": "unknown"
})
FlowItem({ source: 1 }) // { source: 1 } (import used to throw "Blob is not defined")

type("Blob") // throws ParseError: 'Blob' is unresolvable
```

Keywords that need a missing global still fail when used: `Blob`, `File`, `Headers`, `Request`, `Response` and `URL` with the unresolvable error above, while `FormData`, `string.url` and `string.url.parse` still throw a `ReferenceError`.

Workaround on 2.2.8: the `globalThis.X ??= function X() {}` stubs from @guyutongxue's comment, run in a module imported before arktype.

### <a id="fix-1548"></a>[#1548](https://github.com/arktypeio/arktype/issues/1548) Some global types like `File`, `Blob` is conflicting and becomes `never` when used with `@cloudflare/workers-types` in `tsconfig.compilerOptions.types`

Fixed in featherduster by 09fb6f7f9.

Comment to post:

Fixed on the `featherduster` branch (#1685) in 09fb6f7.

ArkType read the instance types of its builtin constructors from `typeof globalThis`, which includes globals declared with `var` but not with `class`. `@cloudflare/workers-types` declares `Blob`, `File`, `Headers` and `URL` as classes (`Request` and `Response` are `var`s, which is why those worked), so all four inferred as `never`. They now fall back to the class's own type. Checked against the published workers-types `index.d.ts` with `"lib": ["ES2022"]` and no DOM:

```ts
const Thing = type({
	file: "File",
	blob: "Blob",
	url: "URL",
	headers: "Headers",
	string: "string"
})

type Out = typeof Thing.infer
// { file: File; blob: Blob; url: URL; headers: Headers; string: string }
// (file, blob, url and headers were never)
```

A global TypeScript can't resolve at all still infers as `never` rather than `any`.

### <a id="fix-1530"></a>[#1530](https://github.com/arktypeio/arktype/issues/1530) Incorrect unnamed captures inference given alternation

Fixed in featherduster by 196ced06c.

Comment to post:

Fixed on the `featherduster` branch (#1685) in 196ced0.

Every alternation branch numbered its groups from the same index, so a branch was never padded for the groups of the branches after it. A capture in one branch is now `undefined` in every other branch, matching what `exec` returns:

```ts
regex("^(?:(?<a>1)|(?<b>2)|(?<c>3))$").inferCaptures
// ["1", undefined, undefined] | [undefined, "2", undefined] | [undefined, undefined, "3"]

const m = regex("^(?:(a)|(b)(c))(d)$").exec("ad")
m?.[4] // "d" (previously typed at index 2)
```

Numbered backreferences to a group in another branch now resolve to that group. A named backreference to a group declared in an earlier branch still widens to `string`.

### <a id="fix-1577"></a>[#1577](https://github.com/arktypeio/arktype/issues/1577) The inferred type of X cannot be named without a reference to ark/util when using Brand-Type

Fixed in featherduster by 46acabbf1.

Comment to post:

Fixed on the `featherduster` branch (#1685) in 46acabb.

Under pnpm, `@ark/util` and `@ark/schema` usually aren't resolvable from your package, and `arktype` didn't re-export the types its inferred types reference, so TypeScript could only name them through the `.pnpm/` store path and rejected it as non-portable. `arktype` now re-exports `Brand`, `Json`, `GenericAst`, `ArkErrorCode` and `Regex` as types, so your example emits:

```ts
export const GraphqlIdentifier = type("string.lower#GID")
// d.ts: ...To<import("arktype").Brand<string, "GID">>...
```

That covers brands (`#X`, `.brand()`), `string.json.parse`, `object.json`, `object.json.stringify`, scopes containing generics, exported `regex()` values and `ArkErrors.byPath`/`issues`/`flatByPath`. Dependency types reachable only through rarely exported members (`.json`, `.meta`, `.internal`, `.select`, `.intersect`, `~standard`) can still hit this.

On 2.2.8, @mattidupre's workaround above works: add `@ark/util` (and `@ark/schema` if needed) as direct dependencies, pinned to the exact versions `arktype` depends on.

### <a id="fix-1430"></a>[#1430](https://github.com/arktypeio/arktype/issues/1430) Improve sequence min/max length expressions/descriptions

Fixed in featherduster by 8c66cc7c1.

Comment to post:

Fixed on the `featherduster` branch (#1685) in 8c66cc7.

When a type had a structure, its expression and description were written from the structure alone, so array length bounds were dropped and distinct types printed identically. Bounds the sequence doesn't already imply are now written after it:

```ts
type("number[] > 1").expression // "number[] >= 2"
type("number[] > 1").description // "number[] at least length 2"
type("number[] < 5").description // "number[] at most length 4"
type("0 < number[] <= 5").description // "number[] at most length 5 and non-empty"
type("number[] > 1 | string[] < 1").expression // "number[] >= 2 | string[] == 0"
type(["number"]).expression // "[number]"
```

The same bug dropped a proto alongside props, so `type("Date").and({ foo: "string" })` now prints `{ foo: string } & Date` rather than `{ foo: string }`. Joined intersections are also parenthesized when nested: `type("(string > 1)[]").expression` is `"(string >= 2)[]"` (was `"string >= 2[]"`).

One difference from the snapshots above: a range is written `number[] <= 5 & >= 1`, not `1 < number[] <= 5`. `[number, ...number[]]` prints as `number[] >= 1`, since it's the same type as `number[] > 0`.

### <a id="fix-1600"></a>[#1600](https://github.com/arktypeio/arktype/issues/1600) Using `.to` after a `.pipe` throws a `ParseError: instanceOf operand must be a function (was undefined)`

Fixed in featherduster by f1fc4e798.

Comment to post:

Fixed on the `featherduster` branch (#1685) in f1fc4e7.

This wasn't specific to `.pipe`/`.to`. Builtin generics like `type.Record` are defined in @ark/schema's root scope, and their instantiations stayed in that scope, so any method that takes a definition (`.to`, `.or`, `.and`, ...) parsed `"string.uuid[] > 0"` as a schema. The same applied to `Pick`, `Omit`, `Merge`, `Partial` etc. and to `$.type.Record(...)` from a scope. Instantiations are now parsed in the scope they're invoked from, so your example works as written:

```ts
const out = Thing({
	tags: { _6baf599f_8a93_478c_9a3b_51cc01451628: true }
})
// { tags: [ '6baf599f-8a93-478c-9a3b-51cc01451628' ] }
```

Behavior change: an invoked builtin generic now follows the invoking scope's config (`jitless`, `onFail`, ...) instead of the defaults.

Workaround on 2.2.8: use the string syntax, `type("Record<string, boolean>")`, in place of `type.Record("string", "boolean")`.

### <a id="fix-1676"></a>[#1676](https://github.com/arktypeio/arktype/issues/1676) Memory leak: functions passed to `narrow`, `pipe`, `match` and defaults are never released

Fixed in featherduster by 84ff9fbb6.

Comment to post:

Fixed on the `featherduster` branch (#1685) in 84ff9fb, with a much smaller change than the one you describe, so no PR needed. Thanks for the tests.

Hashing a node registered each narrow, pipe, match, default and meta function (e.g. a `message`) on `$ark`, keeping it and its closure alive forever. It now uses a unique name that doesn't hold the function.

```ts
const handleRequest = (request: { id: number }) => {
	const T = type({ id: "number" }).narrow(v => v.id === request.id)
	T({ id: 1 })
	return new WeakRef(request)
}
const ref = handleRequest({ id: 1 })
// after 3 rounds of setImmediate + gc()
ref.deref() === undefined // true (false on 2.2.8)
```

All four tests from the issue pass. A `scope()` is now collected whether or not it's exported.

Still retained: a scope containing a cyclic type. Also changed: `compiledMeta` is removed from @ark/schema nodes, and `$ark.x` names of functions in a node's `json`/`expression` no longer resolve through `$ark`.

On 2.2.8, define function-bearing types once at module level and do request-specific checks after validating.

### <a id="fix-1445"></a>[#1445](https://github.com/arktypeio/arktype/issues/1445) ParseError when `match`ing against a [string, {[string]: unknown}]

Fixed in featherduster by 9987af9cb and 551d873e1 and d5b4fc498 and 35cbdb031 and 6060504dc and 309c867ee.

Comment to post:

Fixed on the `featherduster` branch (#1685) in 9987af9.

To discriminate a matcher, ArkType groups its cases by the value at an index, which can reorder them. It then checks whether any reordered cases overlap, but it compared the whole cases, including their handlers, and two different handlers can't be intersected, so it threw at definition even though no input can reach two of your cases. It now compares only the cases' inputs:

```ts
const Dir = type({ "[string]": "unknown" })

const compare = match
	.case(["string", Dir], () => -1)
	.case([Dir, "string"], () => 1)
	.case(["string", "string"], ([a, b]) => a.localeCompare(b))
	.case([Dir, Dir], ([a, b]) =>
		Object.keys(a)[0].localeCompare(Object.keys(b)[0])
	)
	.default(() => 0)

const entries = [
	{ Cropped: ["Allacma fusca_1.JPEG"] },
	"analysis.json",
	"a.txt",
	{ B: [] }
]
entries.sort((a, b) => compare([a, b]))
// ["a.txt", "analysis.json", { B: [] }, { Cropped: ["Allacma fusca_1.JPEG"] }]
```

Cases whose inputs overlap still run in the order you wrote them.

On 2.2.8, every ordering of these four cases throws. Matching each entry on its own works:

```ts
const sortKey = match
	.case(Dir, dir => [1, Object.keys(dir)[0]] as const)
	.case("string", file => [0, file] as const)
	.default(() => [2, ""] as const)

entries.sort((a, b) => {
	const [aRank, aName] = sortKey(a)
	const [bRank, bName] = sortKey(b)
	return aRank - bRank || aName.localeCompare(bName)
})
// same result
```

### <a id="fix-1160"></a>[#1160](https://github.com/arktypeio/arktype/issues/1160) Strip optional/default type-level attributes on `.required()`

Fixed in featherduster by a55e764a7.

Comment to post:

Fixed on the `featherduster` branch (#1685) in a55e764.

`.required()` made a defaulted key required at runtime, but its inferred type kept the default, so `inferIn` still treated the key as optional. The same applied to defaulted morphs, defaulted tuple elements and the `Required<T>` generic.

```ts
const T = type({ foo: "string = 'bar'" }).required()

type In = typeof T.inferIn // { foo: string } (was { foo?: string })
T({}).toString() // "foo must be a string (was missing)"
```

Workaround on 2.2.8: cast the result, e.g. `type({ foo: "string = 'bar'" }).required().as<{ foo: string }>()`.

### <a id="fix-1023"></a>[#1023](https://github.com/arktypeio/arktype/issues/1023) Infer any as morph return

Fixed in featherduster by 9dfead2f3.

Comment to post:

Fixed on the `featherduster` branch (#1685) in 9dfead2.

To keep names like interfaces in inferred types, `.infer` returned the original type whenever it was mutually assignable with its inferred output. A morph returning `any` is mutually assignable with `any`, so the morph itself was left in the inferred type. The check now asks whether inference would change anything, so a morph returning `any` infers `any` at every depth, while types with no morphs, defaults or brands keep their names:

```ts
const T = type("string", "=>", s => s as any)
type Out = typeof T.infer // any (was (In: string) => Out<any>)

const N = type({ a: ["string", "=>", s => s as any], b: "number" })
type NestedOut = typeof N.infer // { a: any; b: number }

interface User {
	name: string
}
const U = type({ name: "string" }).as<User>()
type UserOut = typeof U.infer // User
```

Workaround on 2.2.8: return `unknown` instead of `any`, e.g. `s => JSON.parse(s) as unknown`, which infers `unknown`.

## Easy-win bugs

These are unambiguous bugs, each verified to reproduce on the featherduster branch. The fix is local, you can name it in a sentence, it is about 30 changed lines or fewer, and it adds no API. The verifier checked each fix location on featherduster, and most fixes were prototyped in a scratch copy.

| Issue                                                     | Package   | Effort  | Status                              | Bug                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------- | --------- | ------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#1023](https://github.com/arktypeio/arktype/issues/1023) | `arktype` | trivial | [fixed in featherduster](#fix-1023) | A morph returning `any` infers its output as the morph function `(In: string) => Out<any>` instead of `any`, at the top level and nested.                                                                                                                                         |
| [#1306](https://github.com/arktypeio/arktype/issues/1306) | `attest`  | trivial | [fixed in featherduster](#fix-1306) | attest trace/stats run tsc with --incremental false, which errors (TS6379) on composite projects, so tsc skips type checking and the trace/stats are empty.                                                                                                                       |
| [#1445](https://github.com/arktypeio/arktype/issues/1445) | `schema`  | trivial | [fixed in featherduster](#fix-1445) | match throws "The intersection of distinct morphs at a single path is indeterminate" when discrimination reorders tuple cases, even though the reordered cases' inputs are disjoint.                                                                                              |
| [#1470](https://github.com/arktypeio/arktype/issues/1470) | `schema`  | trivial | [fixed in featherduster](#fix-1470) | `.configure({ title })` (or `.describe()`) on a union of string literals makes toJsonSchema emit `anyOf: [{const, title}, ...]` instead of `enum` plus `title`.                                                                                                                   |
| [#1473](https://github.com/arktypeio/arktype/issues/1473) | `schema`  | trivial | [fixed in featherduster](#fix-1473) | The `new Function` CSP probe runs on import even when `jitless: true` is configured, which logs a CSP violation in strict-CSP browsers.                                                                                                                                           |
| [#1529](https://github.com/arktypeio/arktype/issues/1529) | `docs`    | trivial | [fixed in featherduster](#fix-1529) | In the docs playground, `regex()` from arkregex is typed `any` because the bundled arkregex declarations it loads are missing the internal `s` namespace.                                                                                                                         |
| [#1548](https://github.com/arktypeio/arktype/issues/1548) | `util`    | trivial | [fixed in featherduster](#fix-1548) | With @cloudflare/workers-types and no DOM lib, the File, Blob, URL and Headers keywords infer as `never`.                                                                                                                                                                         |
| [#1577](https://github.com/arktypeio/arktype/issues/1577) | `arktype` | trivial | [fixed in featherduster](#fix-1577) | Under pnpm, exporting a branded (or `Json`-typed) Type fails declaration emit (TS2883) because `Brand` and `Json` live in `@ark/util` and aren't re-exported from `arktype`.                                                                                                      |
| [#1600](https://github.com/arktypeio/arktype/issues/1600) | `schema`  | trivial | [fixed in featherduster](#fix-1600) | Any definition-taking method (`.to`, `.or`, `.and`, ...) on a type produced by `type.Record(...)` parses string definitions as @ark/schema schemas, so `"string[]"` crashes with `instanceOf operand must be a function`.                                                         |
| [#1121](https://github.com/arktypeio/arktype/issues/1121) | `schema`  | small   | [fixed in featherduster](#fix-1121) | Plain {} objects used as name maps inherit Object.prototype members. The original register case is fixed, but alias names like toString/constructor/valueOf still cause false ParseErrors and internal TypeErrors.                                                                |
| [#1160](https://github.com/arktypeio/arktype/issues/1160) | `arktype` | small   | [fixed in featherduster](#fix-1160) | .required() on a key with a default keeps Default&lt;...> in the type, so inferIn still says the key is optional even though runtime requires it.                                                                                                                                 |
| [#1430](https://github.com/arktypeio/arktype/issues/1430) | `schema`  | small   | [fixed in featherduster](#fix-1430) | Array/tuple types with minLength/maxLength constraints drop them from `.expression` and `.description`.                                                                                                                                                                           |
| [#1530](https://github.com/arktypeio/arktype/issues/1530) | `regex`   | small   | [fixed in featherduster](#fix-1530) | With capture groups in several alternation branches, the inferred captures tuples are too short: earlier branches lack trailing `undefined`s, and later branches are padded only for the first branch's groups, which also shifts the inferred index of later captures.           |
| [#1555](https://github.com/arktypeio/arktype/issues/1555) | `util`    | small   | [fixed in featherduster](#fix-1555) | Importing arktype throws `ReferenceError: Blob is not defined` (or URL/FormData/...) in runtimes lacking web platform globals (WeChat mini programs, AudioWorklet, bare V8/QuickJS).                                                                                              |
| [#1676](https://github.com/arktypeio/arktype/issues/1676) | `schema`  | small   | [fixed in featherduster](#fix-1676) | Types built from fresh functions (narrow/pipe/match/defaults) are never garbage collected because each function is register()ed into the global $ark registry. On 2.2.8 this also pins the nodes built from them; on featherduster only the function and its closure stay pinned. |

### [#1023](https://github.com/arktypeio/arktype/issues/1023) Infer any as morph return

`arktype` · effort trivial · [fixed in featherduster](#fix-1023) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** A morph returning `any` infers its output as the morph function `(In: string) => Out<any>` instead of `any`, at the top level and nested.

**Evidence:** Reproduces on 2.2.8 and featherduster under tsgo and TS 6. `type("string", "=>", s => s as any).infer` is `(In: string) => Out<any>`, so `T.assert("x")` is typed as a function, which is unsound; a nested prop is wrong too. Root cause is `ark/type/attributes.ts:55-56`: `finalizeDistillation` uses `equals` (`[l, r] extends [r, l]`), which holds whenever the distilled type is or contains `any` in place of the morph, so the undistilled type is returned. A scratch copy using `exactEquals` fixes both cases on both checkers and keeps `never`, named `.as<Interface>()`, instanceof, parse morphs, defaults and tuple display unchanged.

**Fix:** `ark/type/attributes.ts:55-56`: change `equals<t, distilled> extends true ? t : distilled` to `exactEquals<t, distilled> extends true ? t : distilled` (import `exactEquals` from @ark/util), then uncomment `attest<any>(T.infer)` at `ark/type/__tests__/pipe.test.ts:318`. Side effect: `.as<A & B>()` now displays as the flattened `{ a: string; b: number }` instead of `A & B` (types equivalent); check type-display snapshots and `operator.bench.ts` for drift.

### [#1306](https://github.com/arktypeio/arktype/issues/1306) Attest trace fails on `composite` typescript projects

`attest` · effort trivial · [fixed in featherduster](#fix-1306) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** attest trace/stats run tsc with --incremental false, which errors (TS6379) on composite projects, so tsc skips type checking and the trace/stats are empty.

**Evidence:** Reproduced the exact command from `ark/attest/cli/shared.ts:4` (identical on 2.2.8 and the featherduster tip) on the reporter's composite tsconfig with TS 6.0.3 and TS 7.1.0-dev: TS6379 is emitted and checking is skipped (Types 85, Instantiations 0). Adding --composite false removes the error and the project is actually checked. The fix is one token in a shared string, which also fixes `attest stats`; --composite false is a no-op for non-composite projects.

**Fix:** `ark/attest/cli/shared.ts:4`: add "--composite false" to baseDiagnosticTscCmd (used by both `cli/trace.ts:321` and `cli/stats.ts:10`).

### [#1445](https://github.com/arktypeio/arktype/issues/1445) ParseError when `match`ing against a [string, {[string]: unknown}]

`schema` · effort trivial · [fixed in featherduster](#fix-1445) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** match throws "The intersection of distinct morphs at a single path is indeterminate" when discrimination reorders tuple cases, even though the reordered cases' inputs are disjoint.

**Evidence:** The issue's original sort/match code and a minimal [string,number]/[number,string]/[string,string] matcher both throw identically on 2.2.8 and the featherduster tip. viableOrderedCandidates (`ark/sets/roots/union.ts:383` on featherduster, `ark/schema/roots/union.ts:767` on 2.2.8) calls `overlaps` on whole morph nodes, and morph∩morph runs assertEqualMorphs (`ark/sets/roots/morph.ts`) before considering input disjointness. Emulating a rawIn comparison makes the original matcher return -1, 1, ss, dd, 0 and still preserves order for overlapping cases.

**Fix:** `ark/sets/roots/union.ts:383` (featherduster tip), in viableOrderedCandidates: `originalBranches[currentIndex].rawIn.overlaps(originalBranches[nextIndex].rawIn)`, matching the rawIn comparison at `union.ts:346`. rawIn is the node itself for non-morphs, and for equal morphs the old check already reduced to input overlap, so only the previously-throwing case changes. Add a match test with reordered disjoint tuple cases.

### [#1470](https://github.com/arktypeio/arktype/issues/1470) Using configure on string literal causes the enum to become "anyOf" in schema

`schema` · effort trivial · 1 reaction · [fixed in featherduster](#fix-1470) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** `.configure({ title })` (or `.describe()`) on a union of string literals makes toJsonSchema emit `anyOf: [{const, title}, ...]` instead of `enum` plus `title`.

**Evidence:** Reproduces on 2.2.8 and the featherduster tip, including the issue's exact object type and `.describe()`. Shallow `.configure` copies the meta onto every unit branch, and the union's enum collapse (`ark/sets/toJsonSchema.ts:116-128` on featherduster, `ark/schema/roots/union.ts:318-328` on 2.2.8) only fires for branches whose only key is `const`, though its own comment says it is meant for pure unit values. The output is valid but redundant, and form generators that label `anyOf` const options by `title` would label every option "Database Provider". Fix is local to the collapse check.

**Fix:** `ark/sets/toJsonSchema.ts:116-128` (union handler): when deciding whether to collapse to `enum`, treat a branch as a pure unit if every key besides `const` is a meta key whose value is identical to the union's own `node.meta[k]` (configure spreads the same meta object, so reference/primitive equality suffices). toResolvedJsonSchema (line 75) re-adds the union's meta onto the enum result. Add snapshot tests for `type("'a'|'b'").configure({ title })` and `.describe()`.

### [#1473](https://github.com/arktypeio/arktype/issues/1473) Content-Security-Policy warning

`schema` · effort trivial · 2 reactions · [fixed in featherduster](#fix-1473) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** The `new Function` CSP probe runs on import even when `jitless: true` is configured, which logs a CSP violation in strict-CSP browsers.

**Evidence:** Verified on both worktrees by replacing globalThis.Function with a throwing proxy and configuring `jitless: true` from arktype/config before importing arktype: `new Function("return false")` still runs exactly once, and `$ark.config` is already `{"jitless":true}` at that moment (logged from inside the proxy). The cause is `ark/schema/kinds.ts:91` (featherduster) / :92 (2.2.8), which evaluates `envHasCsp()` unconditionally while building `$ark.defaultConfig`; the maintainer named this location in the thread.

**Fix:** `ark/schema/kinds.ts:91`: change `jitless: envHasCsp()` to `jitless: $ark.config.jitless ?? envHasCsp()`, so the probe is skipped when the global config already sets jitless (verified `$ark.config.jitless` is set at that point when configured via arktype/config). A fuller version leaves jitless undefined in defaultConfig and uses `this.resolvedConfig.jitless ?? envHasCsp()` at `ark/schema/scope.ts:946` and :1052, which also covers scope-level config.

### [#1529](https://github.com/arktypeio/arktype/issues/1529) ArkRegex's `regex()` returns `any` type in the playground

`docs` · effort trivial · 2 reactions · [fixed in featherduster](#fix-1529) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** In the docs playground, `regex()` from arkregex is typed `any` because the bundled arkregex declarations it loads are missing the internal `s` namespace.

**Evidence:** The playground (`ark/docs/components/playground/tsserver.ts:27`) loads `ark/docs/components/dts/regex.ts`, generated by `ark/repo/dtsGen.ts` with `tsup --dts-resolve` from `ark/regex/index.ts`. The bundle drops `namespace s` (`ark/regex/state.ts:97`) because every `s.foo<...>` use sits in a type whose type parameter is also named `s`. Type-checking the bundled files with TS 6 gives 36x TS2702 in `regex.d.ts` and `regex()` is `any` on both worktrees. Verified two fixes on featherduster sources: renaming the namespace (s -> S\_) or bundling from `ark/regex/internal.ts` (which exports `s`) both produce a bundle with zero `regex.d.ts` errors and correct inference. Small, mechanical, no design call.

**Fix:** Smallest (featherduster tip only, since `internal.ts` doesn't exist on main): `ark/repo/dtsGen.ts:18-21` use `internal.ts` as the tsup entry for arkregex (and read `internal.d.ts` instead of `index.d.ts`), then regenerate `ark/docs/components/dts/regex.ts`. Alternative: rename `namespace s` in `ark/regex/state.ts:97` and its ~45 `s.` references/imports across `charset/escape/group/parse/quantify.ts` to a name no type parameter shadows. Both verified to produce an error-free bundle. Separately, `type.d.ts` has a stray `Required$1` (TS2749) the `(Omit|Exclude|Extract|Record)\$1` fixup in `dtsGen.ts` doesn't cover.

### [#1548](https://github.com/arktypeio/arktype/issues/1548) Some global types like `File`, `Blob` is conflicting and becomes `never` when used with `@cloudflare/workers-types` in `tsconfig.compilerOptions.types`

`util` · effort trivial · [fixed in featherduster](#fix-1548) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** With @cloudflare/workers-types and no DOM lib, the File, Blob, URL and Headers keywords infer as `never`.

**Evidence:** Reproduced on both worktrees (TS 7 and TS 6) with the real workers-types `index.d.ts` and `lib: ["ESNext"]`, matching the reporter's tsconfig: file/blob/url/headers infer `never`; FormData, Request, Response, ArrayBuffer and string are fine. Root cause: `instantiateConstructors` (`ark/util/objectKinds.ts:125-131` on featherduster) only reads instance types from `typeof globalThis`, which includes `declare var` globals but not `declare class` ones; workers-types declares Blob, File, Headers, URL as classes. A one-branch fallback to the explicitly typed `builtinConstructors[k]`, guarded against `any` for [#1246](https://github.com/arktypeio/arktype/issues/1246), typechecks correctly under the same config.

**Fix:** `ark/util/objectKinds.ts:125-131` (`instantiateConstructors`): add a final branch before `never`: `: 0 extends 1 & builtinConstructors[k] ? never : InstanceType<builtinConstructors[k]>`, so class-declared globals resolve via the explicit `platformConstructors` type (`Blob: typeof Blob` etc.) while unresolved (`any`) globals still map to never per [#1246](https://github.com/arktypeio/arktype/issues/1246). Verified in scratch against the real workers-types `d.ts` on TS 7 and TS 6.

### [#1577](https://github.com/arktypeio/arktype/issues/1577) The inferred type of X cannot be named without a reference to ark/util when using Brand-Type

`arktype` · effort trivial · 2 reactions · [fixed in featherduster](#fix-1577) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** Under pnpm, exporting a branded (or `Json`-typed) Type fails declaration emit (TS2883) because `Brand` and `Json` live in `@ark/util` and aren't re-exported from `arktype`.

**Evidence:** Reproduced with published arktype 2.2.8 tarballs in a pnpm layout (TS 6.0.3 and tsgo 7.1) and with featherduster sources copied into the same layout: `type("string").brand("X")` and `type("string.lower#GID")` fail with TS2883 for `Brand`, and `string.json.parse`, `object.json` and `object.json.stringify` fail the same way for `Json`. Configure, defaults, narrows, scopes, match, generics, keyof, merge and other keywords emit fine. Re-exporting `type Brand, type Json` from arktype's entry fixes all of them on both (emit becomes `import("arktype").Brand<...>` / `import("arktype").Json`).

**Fix:** `ark/type/index.ts:10`: `export { Hkt, inferred, ParseError, type Brand, type Json } from "@ark/util"` (`internal.ts` re-exports index, so deep paths get it too). Verified to make declaration emit succeed for brand and json keywords on 2.2.8 tarballs and featherduster sources.

### [#1600](https://github.com/arktypeio/arktype/issues/1600) Using `.to` after a `.pipe` throws a `ParseError: instanceOf operand must be a function (was undefined)`

`schema` · effort trivial · [fixed in featherduster](#fix-1600) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** Any definition-taking method (`.to`, `.or`, `.and`, ...) on a type produced by `type.Record(...)` parses string definitions as @ark/schema schemas, so `"string[]"` crashes with `instanceOf operand must be a function`.

**Evidence:** Reproduces on both 2.2.8 and the featherduster tip, and has nothing to do with `.pipe`: `type.Record("string","boolean").or("string[]")` throws the same error, and `.and({a: "string"})` throws `{"a":"string"} is not a valid type schema`, while `type("Record<string, boolean>")` works. Root cause: builtin generics are created by `genericNode` (rootSchemaScope.generic, `ark/schema/scope.ts:1302`). Lazy (Hkt) bodies are parsed with `this.$` = rootSchemaScope (`generic.ts:214-215`, same on 2.2.8 at `generic.ts:104-107`), so the instance's `$` is the schema scope and string definitions go through `proto.ts:80` `builtinConstructors[schema]`. Binding the lazy result to `this.arg$` (monkeypatched on the featherduster tip) fixes the original repro, `.or("string[]")` and `.to("Array")`, and gives the correct output `{"tags":["6baf599f-..."]}`.

**Fix:** `ark/schema/generic.ts:214-215` (featherduster tip): bind lazy instantiations to the invoking scope before caching them: `this.defIsLazy() ? this.arg$.bindReference(this.$.parse(this.bodyDef(argNodes))) : ...`. Doing it inside `instantiate` keeps the identity of `this.instantiations[key]` (bindReference on nodes isn't cached). Add a test that `type.Record("string", "boolean").or("string[]")` parses.

### [#1121](https://github.com/arktypeio/arktype/issues/1121) Replace cases of {} being used to store arbitrary names with Object.create(null)

`schema` · effort small · [fixed in featherduster](#fix-1121) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** Plain {} objects used as name maps inherit Object.prototype members. The original register case is fixed, but alias names like toString/constructor/valueOf still cause false ParseErrors and internal TypeErrors.

**Evidence:** The register case is fixed: `ark/util/registry.ts` uses Object.create(null) for nameCounts. Two failures reproduce on both 2.2.8 and the featherduster tip. `scope({ toString: "string" }).export()` throws a false duplicate-alias ParseError. `type("toString")` crashes with an internal TypeError where it should report 'toString' is unresolvable. The groupBy crash on a `valueOf` key is 2.2.8-only, because groupBy has no library callers on featherduster. Patching four sites in memory through a Node load hook fixed every case on the featherduster tip: scope aliases named toString/constructor resolve, generics and `this` still work, and `type("toString")` reports unresolvable.

**Fix:** Four one-line changes on the featherduster tip, all verified together with an in-memory load-hook patch. (1) `ark/schema/scope.ts:467-475`: initialize referencesById, resolutions and aliases with Object.create(null). This fixes the false duplicate error from `name in this.aliases` at :503/:506. (2) `ark/type/parser/definition.ts:72`: `scopeCache = Object.create(null)`. The string parse cache returned Object.prototype.toString, and that is the actual crash site for type("toString"). (3) `ark/type/parser/shift/operand/unenclosed.ts:121`: `if (s.ctx.args && Object.hasOwn(s.ctx.args, token))`, because ctx.args is the literal `{ this: ctx.id }` from `ark/type/scope.ts:321`. (4) `ark/schema/scope.ts:818`: only read `this.ambient[name]` when `Object.hasOwn(this.ambient, name)`, because $ark.ambient is a plain object. Optional: on featherduster, `ark/util/registry.ts` nextName's `name in registry` check makes a function named toString register as `toString1`. That is harmless but could also use Object.hasOwn. A lint rule against `{}` dictionaries is follow-up work.

### [#1160](https://github.com/arktypeio/arktype/issues/1160) Strip optional/default type-level attributes on `.required()`

`arktype` · effort small · [fixed in featherduster](#fix-1160) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** .required() on a key with a default keeps Default&lt;...> in the type, so inferIn still says the key is optional even though runtime requires it.

**Evidence:** Runtime is correct on both branches: the expression is `{ foo: string }` and `T({})` gives 'foo must be a string (was missing)'. Inference is wrong on both. `typeof T.inferIn` is `{ foo?: string }`, and `.t` is `{ foo: Default<string, "bar"> }`, not the issue's expected `{ foo: string }`. The same holds for the `Required<T>` generic keyword and for morphs with defaults. The cause is that required() at `ark/type/variants/object.ts:133` maps `-?` over `t` without unwrapping Default. The proposed `withoutDefault` mapping was type-checked on both branches against boolean defaults, union defaults, union morphs with defaults, plain keys and optional morph keys, and it matches the expected types in and out.

**Fix:** In `ark/type/attributes.ts`, add `type withoutDefault<t> = t extends Default<infer c> ? c : t extends InferredMorph<Default<infer i, infer _>, infer o> ? (In: i) => o : t`. Use it in required() at `ark/type/variants/object.ts:133` as `Type<{ [k in keyof t]-?: withoutDefault<t[k]> }, $>`, and in RequiredHkt's body at `ark/type/keywords/ts.ts:189`. Add the issue's test to `ark/type/__tests__/objects/defaults.test.ts`.

### [#1430](https://github.com/arktypeio/arktype/issues/1430) Improve sequence min/max length expressions/descriptions

`schema` · effort small · [fixed in featherduster](#fix-1430) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** Array/tuple types with minLength/maxLength constraints drop them from `.expression` and `.description`.

**Evidence:** Reproduces on both 2.2.8 and the featherduster tip: `number[] > 1`, `number[] < 5`, `0 < number[] <= 5` and `number[] == 1` all have expression and description `number[]`, and `type("number[] > 1 | string[] < 1").expression` is `number[] | string[]`, so non-equal types print identically. Cause: `ark/schema/roots/intersection.ts` returns the structure's string early in the `description` default (line 217) and `writeIntersectionExpression` (line 368), ignoring `prestructurals`. The same early return also drops non-length refinements and the proto when a structure is present (`type("Date > 0").and({ foo: "string" }).expression` is `{ foo: string }`). Secondary gap: `[number, ...number[]]` is stored as variadic `number` with minVariadicLength 1, so its minLength is implied by the sequence and it would still print `number[]` unless the sequence description (`ark/schema/structure/sequence.ts:200`) accounts for minVariadicLength.

**Fix:** `ark/schema/roots/intersection.ts` (featherduster tip): in the `description` default (line 217) and `writeIntersectionExpression` (line 368), when `node.structure` is present, collect the length prestructurals not implied by the sequence (exclude those equal to a node in `structure.sequence.impliedSiblings`, and `exactLength` when sequence.minLength === sequence.maxLength === rule), then append them to the structure's string: `${structure.expression} ${exprs.join(" & ")}` and `${structure.description} ${descs.join(" and ")}` (matching the issue's snapshots, e.g. `number[] >= 2` / `number[] at least length 2`). Existing tuples (`[number]`, `[number, number?]`) keep their output because all their length nodes are implied siblings. ~15 lines.

### [#1530](https://github.com/arktypeio/arktype/issues/1530) Incorrect unnamed captures inference given alternation

`regex` · effort small · [fixed in featherduster](#fix-1530) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** With capture groups in several alternation branches, the inferred captures tuples are too short: earlier branches lack trailing `undefined`s, and later branches are padded only for the first branch's groups, which also shifts the inferred index of later captures.

**Evidence:** Unsound inference that reproduces on both versions. `^(a)|(b)$` infers `["a"] | [undefined, "b"]`, but `exec("a")` returns `["a","a",undefined]`, and `^(?:(a)|(b)(c))(d)$` infers `["a","d"]` for the first branch while runtime has `d` at index 4. Cause: `UnionTree.finalizeBranchCaptures` in `ark/regex/state.ts:424-440` pads only with `acc[0]["captures"]` (l.434), and `finalizeBranches` (l.442) never pads trailing groups. A fix verified in scratch is +22/-10 lines in `state.ts`, and the existing `regex.test.ts` still type-checks against it.

**Fix:** `ark/regex/state.ts` (verified in `ark/repo/scratch/audit/i1530/regexfix/state.ts` on the featherduster worktree). In `finalizeBranchCaptures` (l.424-440), replace the `acc[0]` logic with: `acc extends [...unknown[], infer last extends FinalizedBranch] ? last["captures"] extends infer prior extends IndexedCaptures ? [...{ [i in keyof prior]: undefined }, ...branchCaptures] : never : branchCaptures`. In `finalizeBranches` (l.453), use `captures: [...ctx["captures"], ...padCaptures<acc[i]["captures"], lastOf<acc>["captures"]>]` with helpers `lastOf<acc>` and `padCaptures<captures, all> = all extends [...{ [i in keyof captures]: unknown }, ...infer rest] ? [...captures, ...{ [i in keyof rest]: undefined }] : captures` (export `FinalizedBranch`). Gives correct results for all repro cases; `^((a)|b)$` stays `["a","a"] | ["b",undefined]`. Add `regex.test.ts` cases for `^(a)|(b)$`, `^(?:a|(b))$` and `^(?:(a)|(b)(c))(d)$`.

### [#1555](https://github.com/arktypeio/arktype/issues/1555) Blob and File Obj check would not work in Mini-Program enviroment

`util` · effort small · [fixed in featherduster](#fix-1555) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** Importing arktype throws `ReferenceError: Blob is not defined` (or URL/FormData/...) in runtimes lacking web platform globals (WeChat mini programs, AudioWorklet, bare V8/QuickJS).

**Evidence:** Reproduced by deleting the globals before a dynamic import. On 2.2.8, deleting any one of Blob, FormData, Headers, Request, Response or URL throws (deleting File alone throws only from Node's internal undici, not from arktype). On the featherduster tip FormData/Headers/Request/Response are already lazy getters (`objectKinds.ts:69-81`) and import succeeds without them, but Blob (`objectKinds.ts:48,67`) and URL (:82) are still read at module load. Keyword definitions in `ark/type/keywords/constructors.ts` are thunks, so making the remaining entries lazy suffices. Three users have hit it.

**Fix:** `ark/util/objectKinds.ts` on featherduster: make `Blob`, `File` and `URL` in `platformConstructors` (lines 64-82) getters returning `globalThis.Blob` / `globalThis.File ?? globalThis.Blob` / `globalThis.URL`, and change the existing FormData/Headers/Request/Response getters to read `globalThis.X` too, since a bare identifier still throws. Then drop the eager `FileConstructor` const (line 48) and either make `registry.FileConstructor` (`ark/util/registry.ts:16`) a getter or have `ark/type/keywords/FormData.ts` read `platformConstructors.File`. Finally use `builtinConstructors[name]?.prototype` in `objectKindOf` (line 170). Verified on featherduster that `objectKindOf(new (class Headers {})())` currently throws `ReferenceError: Headers is not defined` when the global is missing.

### [#1676](https://github.com/arktypeio/arktype/issues/1676) Memory leak: functions passed to `narrow`, `pipe`, `match` and defaults are never released

`schema` · effort small · [fixed in featherduster](#fix-1676) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** Types built from fresh functions (narrow/pipe/match/defaults) are never garbage collected because each function is register()ed into the global $ark registry. On 2.2.8 this also pins the nodes built from them; on featherduster only the function and its closure stay pinned.

**Evidence:** On 2.2.8 all four of the issue's WeakRef tests fail and $ark grows by 2 per narrow call. On the featherduster tip those four tests pass, but a narrow or pipe closure that captures `request` still keeps it alive, and $ark grows by 1 per call. The cause is createNode's JSON serialization: the predicate key, PredicateNode.serializedPredicate, morph serialize, the optional/sequence default keys, the default cache keys and meta values all go through defaultValueSerializer -> compileSerializedValue -> registeredReference. featherduster already uses nameOf for this exact reason in `structure.ts:1155`, so a small, local fix exists. I checked it in a patched copy of ark/schema.

**Fix:** featherduster tip, ark/schema only. Name user functions with nameOf, not register, everywhere except unit and proto values. Add `unregisteredValueSerializer = v => typeof v === "function" ? reference(nameOf(v)) : defaultValueSerializer(v)` in `shared/implement.ts`. Use it for: `predicate.ts:58` (key `predicate: { serialize: unregisteredValueSerializer }`) and :72 (`serializedPredicate = reference(nameOf(this.predicate))`); `roots/morph.ts:73` and :94 (`reference(nameOf(m))`); `structure/optional.ts:61` (`default` key serialize) and :119 (cacheKey); `structure/sequence.ts:132` and :505; `parse.ts:278` (meta values). Do NOT change defaultValueSerializer itself. Unit compiledCondition (`case $ark.f:`) and unitKeyOf (`union.ts:496`) read function units from $ark, so a global change breaks `type.unit(fn)` discrimination. About 15 changed lines plus a GC test like the issue's.

## Clear bugs

These are real bugs that reproduce on the featherduster branch but aren't easy wins: they are larger, they need investigation against the checker, or they need a decision about behavior first. They are ordered by effort.

### [#963](https://github.com/arktypeio/arktype/issues/963) Custom error message for discriminated union

`schema` · effort small · possibly breaking · 1 reaction · [note](#note-963) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** A discriminated union's missing-case error ignores descriptions set on the union and on its branches, while an indiscriminable union uses them.

**Evidence:** Reproduces on both versions. `type("string | number").describe("a primitive")({})` gives `must be a number or a string`, but `type("string < 2 | string > 5").describe("short or long")("abc")` gives `must be short or long`. Branch descriptions are dropped too (TizzySaurus's repro), even though the union's own `.description` is `baz or foo`. The cause: the missing-case error passes an explicit `expected` built by `describeCases(discriminant)` (featherduster: `ark/schema/roots/union.ts:306`, :412, :502), and `ArkError.expected` (`ark/schema/shared/errors.ts`) returns `input.expected` before consulting `meta`, so even `configure({ expected })` is ignored. It isn't a pure easy win: for a keyed discriminant the error sits at the discriminant path (`kind must be ...`), so using the union's description needs a call on path and wording. The "convert domain to typeof" part is already done on featherduster (switch on `typeof`, `union.ts:373`).

**Fix direction:** `ark/schema/roots/union.ts` (featherduster). In `traverseApply` (:302-313) and `compile` (:412-420), when the union has an explicit description/expected in `this.meta`, report the missing case with that instead of `describeCases(...)`, at the union's own path for keyed discriminants. Optionally, have `describeCases` (:502) use each case node's explicit description, when it has one, in place of the domain/unit name.

**Decision:** When a discriminated union (or its branches) has an explicit description, should a missing-case error report it at the union's root path the way an indiscriminable union does, instead of `kind must be "a" or "b"` at the discriminant path?

### [#1213](https://github.com/arktypeio/arktype/issues/1213) Improve autocomplete + error messages for comparator expressions

`arktype` · effort small · [note](#note-1213) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** A comparator with no right operand ("number >=", "Date >") gives misleading errors: a trailing `>` is parsed as a generic-close finalizer, and type-level completions after a comparator list keywords even though only a literal is valid there.

**Evidence:** Reproduces the same way on both worktrees, at runtime and in the types. "Date >" / "number >" throw "'>' is not allowed here". "number >=" throws "Expected an expression". The type-level error is a 41-member union of "Comparator >= must be followed by a corresponding literal (was number >=ArrayBuffer)" etc., built from keyword completions. Separately, "5 &lt;" reports "Token '>' requires a right operand" because previousOperator() returns the inverted left-bound comparator. These are DX/error-message defects, not unsound behavior, and the type-level completion change takes design work, so this is not an easy win.

**Fix direction:** `ark/type/parser/shift/operator/bounds.ts:156` parseRightBound (runtime + type): if the unscanned input after the comparator is empty or whitespace, error with writeInvalidLimitMessage / writeMissingRightOperandMessage before calling parseOperand. That stops keyword completions from being offered. `ark/type/parser/string.ts:43` and :127: when the top-level finalizer is ">" (no generic open), report a missing comparator operand instead of writeUnexpectedCharacterMessage(">"). `ark/type/parser/reduce/dynamic.ts:223` previousOperator() and its static twin `ark/type/parser/reduce/static.ts:291`: return invertedComparators[leftBound.comparator] (reduceLeftBound at `dynamic.ts:103` stores the inverted comparator) so "5 &lt;" names '&lt;'.

### [#1287](https://github.com/arktypeio/arktype/issues/1287) attest: replace references to Node's builtin assertions

`attest` · effort small · possibly breaking · [note](#note-1287) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** attest `.equals` hands same-constructor objects to node:assert deepStrictEqual, whose failure-diff generation hangs or runs out of memory when the values contain arktype Types; the maintainer wants a custom or targeted diff instead.

**Evidence:** Reproduces on both branches (`assertions.ts` is identical). A top-level Type fails cleanly through the function branch, but `attest({ a: type.string }).equals({ a: type.boolean })` gets the process killed. The comparison itself is fine: node:util isDeepStrictEqual returns false in 1ms (2.2.8) / 109ms (featherduster). The hang is node:assert building its diff: `new AssertionError({ actual, expected, operator: "deepStrictEqual" })` never finishes, even with a custom message, while the same call without `operator` returns at once. The crash fix is small, but it changes the failure output for every object mismatch, and the maintainer wants to pick a diff strategy, so it isn't an easy win.

**Fix direction:** `ark/attest/assert/assertions.ts:86-87` (unversionedAssertEquals): replace `assert.deepStrictEqual(actual, expected)` with `isDeepStrictEqual` from node:util. On a mismatch, throw an AssertionError built from printable() serializations with no `operator`, like the neighboring branches at :89-97 (printable({ a: type.string }) gives {"a":{"domain":"string"}} instantly). Longer term, diff those serializations, or use a structural diff lib, to get readable diffs; then drop the remaining node:assert uses in assert/\*.ts.

**Decision:** Should .equals failures show serialized snapshots with an internal string diff (losing Node's structured diff), or use an external structural diff library (microdiff/superdiff/jsondiffpatch)?

### [#1310](https://github.com/arktypeio/arktype/issues/1310) type reference inferred without ` | undefined` without `exactOptionalPropertyTypes`

`arktype` · effort small · [note](#note-1310) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** With TS exactOptionalPropertyTypes off, a Type referenced as a property value ({ age: type("number | undefined") }) infers age: number (key stays required, undefined dropped); the inline string def infers correctly.

**Evidence:** Unsound inference, reproduced on 2.2.8 and the featherduster tip with tsgo and TS 6; runtime is correct (accepts undefined, rejects missing). Root cause: inferDefinition matches `def extends type.cast<infer t>` and type.cast declares an optional `[inferred]?: to`, so inferring from a Type's required `[inferred]: t` into that optional property strips undefined when exactOptionalPropertyTypes is off. The maintainer said in the thread that the fixes he found had significant checker overhead, so the fix has to be benchmarked first. That keeps it out of easy_win.

**Fix direction:** `ark/type/parser/definition.ts:149`: before `def extends type.cast<infer t>`, add a branch matching the required key that Type/Inferred declares (`ark/type/variants/base.ts:41` `[inferred]: t`), e.g. `: def extends { [inferred]: infer t } ? t`. Alternatively, change how type.cast (`ark/type/keywords/keywords.ts:139`, `[inferred]?: to`) is matched so a required `[inferred]` source isn't inferred through an optional target. Run the type perf benchmarks before landing either.

**Decision:** Is the cost of one more conditional branch in inferDefinition (the hottest inference path) acceptable, or should the type.cast matching change instead?

### [#1337](https://github.com/arktypeio/arktype/issues/1337) check prototype when checking `object.js`on

`schema` · effort small · breaking · [note](#note-1337) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** `object.js`on accepts non-plain objects such as Map, Set, Date, RegExp, typed arrays, functions and class instances, plus nested ones like { a: new Map() } and [new Map()], because it only checks domain object plus a string index signature.

**Evidence:** Reproduces on 2.2.8 and the featherduster tip. The runtime accepts values (Map, functions) that aren't assignable to the inferred Json type, so validation is wider than the inferred type. The fix needs a policy call (plain objects and arrays only, vs excluding specific builtins), which rejects class instances that JSON.stringify serializes today, and it changes the JSON Schema output and adds a predicate. The maintainer labeled it enhancement.

**Fix direction:** `ark/schema/intrinsic.ts:55-61` (jsonObject): split into an Array branch with `sequence: "$jsonData"` and an object branch whose prototype is Object.prototype or null (needs a predicate or a new plain-object constraint), so Map, Set, Date, functions and class instances are rejected.

**Decision:** Should `object.js`on accept only plain objects (Object.prototype or null prototype) and arrays, or only exclude known non-JSON builtins (Map, Set, functions), given that a plain-object check needs a predicate in the JSON Schema output?

### [#1343](https://github.com/arktypeio/arktype/issues/1343) Missing type error on invalid HKT definition return type

`arktype` · effort small · [note](#note-1343) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** Two problems. (1) A generic(...) value under a scope key that also declares params ("Name&lt;s extends string>": generic(...)) isn't rejected; it fails later with a type-level circularity (TS5114/TS2589) and at runtime with "'generic' is unresolvable". (2) The maintainer's point: with valid usage, an HKT generic's instantiateDef return isn't checked against the HKT body, so types and runtime silently diverge.

**Evidence:** Both reproduce on 2.2.8 and the featherduster tip. (1) isn't HKT-specific: a plain `generic(["s","string"])({ box: "s" })` under a parameterized key fails the same way, while scope.validate (`ark/type/scope.ts:425`) and preparseOwnAliasEntry (`scope.ts:256-279`) never reject a Generic value there. (2) With a bare key, the user's own callback type-checks and infers "$a", but `${args.s}`stringifies the Type, so the runtime validator is the unit`$Type<"a">` and `assert("$a")`throws. LazyGenericBody's return is`unknown`, so checking it against the HKT body is a design question. That keeps it out of easy_win.

**Fix direction:** (1) `ark/type/scope.ts`: in preparseOwnAliasEntry, after the `firstParamIndex === -1` branch (~line 256), throwParseError if hasArkKind(def, "generic"), with a message saying to declare the generic without params in its key. In scope.validate's generic-key branch (line 425), return ErrorType&lt;that message> when def[k] is a Generic, before type.validate. (2) Would need GenericBodyParser's HKT overload (`ark/type/generic.ts:358`) to validate the callback's return as a definition and compare its inference against the HKT body, which costs type perf and constrains HKT use as an escape hatch.

**Decision:** Is rejecting a generic() value under a parameterized scope key enough, or should the HKT overload also type-check the instantiateDef's return against the HKT body?

### [#1390](https://github.com/arktypeio/arktype/issues/1390) Config for values that fallback to a default

`schema` · effort small · possibly breaking · 1 reaction · 2.2.8: reproduces, featherduster: reproduces

**Summary:** With exactOptionalPropertyTypes: false, an explicit `undefined` should trigger a key's default. The issue also proposes a general configurable fallback (null, "", a `"-"` key).

**Evidence:** The core case is unsound on both worktrees. With `configure({ exactOptionalPropertyTypes: false })`, `type({ key: "number = 5" })({ key: undefined })` returns `{ key: undefined }` (nested too), although the output type is `{ key: number }`. The docs (`configuration/index.mdx`, the 'exactOptionalPropertyTypes does not yet affect default values!' callout) document this as a known gap tracked by this issue. Cause: the optional value is widened to `| undefined` (featherduster `ark/sets/structure/prop.ts:69`), but defaults apply only when the key is absent (`ark/schema/structure/structure.ts:635` and the compiled sites around :894/:1006). With the default config, the call errors (`key must be a number (was undefined)`). The null/"" generalization is an open design shared with [#1283](https://github.com/arktypeio/arktype/issues/1283).

**Fix direction:** featherduster: under exactOptionalPropertyTypes === false, apply the default when `data[key] === undefined` as well as when the key is missing. That means `ark/schema/structure/structure.ts:635` (applyStructuralMorph), the compiled default checks around :894, and the unchanged-key check around :1006. Alternatively, skip the `| undefined` widening for defaultable props in `ark/sets/structure/prop.ts:69` and treat undefined as missing.

**Decision:** Should undefined trigger defaults only under exactOptionalPropertyTypes: false (bug fix), with the configurable null/"" fallback (`"-"` key or shouldDefault) designed separately alongside [#1283](https://github.com/arktypeio/arktype/issues/1283)?

### [#1412](https://github.com/arktypeio/arktype/issues/1412) Unable to directly configure top-level intersection error message

`schema` · effort small · possibly breaking · 1 reaction · [note](#note-1412) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** `.configure({ message })` on a type whose failure produces multiple constraint errors (e.g. `string.email > 0` on "") is ignored: the merged `intersection` error has no meta, so the default bulleted message is shown.

**Evidence:** Reproduces identically on 2.2.8 and the featherduster tip. Each constraint carries the configured meta (a single failure, e.g. `Thing("x")` or `Thing(5)`, prints "Email is not valid"), but `ArkErrors.add` (`ark/schema/shared/errors.ts:247-293`) builds the merged `intersection` ArkError without meta, and its default `expected` (`ark/schema/roots/intersection.ts:244-245`) lists each child's `expected`, not its `message`. The configuration docs mark message/problem as 'may not apply to composite errors like unions', so this is a semi-documented limitation and the fix needs a semantics call, not an easy win.

**Fix direction:** `ark/schema/shared/errors.ts:268-279` (ArkErrors.add): when constructing the `intersection` ArkError, pass `meta: existing.meta` if every constituent error has the same `meta.message` (or `meta.problem`), so the `message` getter (`errors.ts:132-137`) resolves the configured message. Optionally de-duplicate identical bullets in the `expected` default at `ark/schema/roots/intersection.ts:244-245` (the `"@"` case lists the same text twice).

**Decision:** When all of an intersection error's constituents come from one `.configure({ message/problem })`, should the merged error adopt that single message (and should identical expected bullets be de-duplicated)?

### [#1475](https://github.com/arktypeio/arktype/issues/1475) `toJsonSchema()` fails when a field is `string.url`

`arktype` · effort small · 2 reactions · [note](#note-1475) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** `toJsonSchema()` throws a `predicate` ToJsonSchemaError for the built-in `string.url` (also `string.url.parse`, `string.date`), even though `string.url` carries `format: "uri"` meta meant for JSON Schema.

**Evidence:** Reproduces on 2.2.8 and the featherduster tip. The docs list the `predicate` fallback code as "custom narrow function", but here it fires for a built-in keyword, and `ark/type/keywords/string.ts:819-831` deliberately attaches `meta: { format: "uri" }` because there is no other serializable validation, so the intended output is unreachable without a fallback that drops every predicate. Making built-in predicates serializable needs a mechanism (e.g. [#1571](https://github.com/arktypeio/arktype/issues/1571)'s `jsonSchema` meta or a predicate-level flag), which is a design call rather than a local patch.

**Fix direction:** Have string.url (`ark/type/keywords/string.ts:819-831`) declare its JSON Schema form so the predicate handler in `ark/sets/toJsonSchema.ts` doesn't fall back. Options: (a) build [#1571](https://github.com/arktypeio/arktype/issues/1571)'s `jsonSchema` meta and set `{ type: "string", format: "uri" }` on the keyword, or (b) mark built-in keyword predicates whose root carries a `format` as JSON-representable and skip them. `string.date` (isParsableDate, `string.ts:277-287`) also throws but has no format meta, so it would need its own decision on what to emit.

**Decision:** Should built-in predicate keywords (string.url, string.date) serialize without a fallback, and if so via [#1571](https://github.com/arktypeio/arktype/issues/1571)'s `jsonSchema` meta or a predicate-level flag?

### [#1479](https://github.com/arktypeio/arktype/issues/1479) Custom error messages don't work on morph

`schema` · effort small · breaking · 1 reaction · [note](#note-1479) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** `.configure({ message })` on a pipe (`A.to(B)`) applies to errors from the input type but not to errors from the piped output type.

**Evidence:** Reproduces on 2.2.8 and the featherduster tip for string and number inputs, with `"self"` selector, with `.describe()`, and with `.pipe(fn, type)`. Root `morphs` entries aren't node children (`ark/schema/roots/morph.ts:69-75` has no `child: true`), and `_transform` (`ark/schema/node.ts:826-844`) only descends into child keys, so shallow configure never reaches the output validator. Making it descend changes configure/describe for every pipe (out descriptions, expressions, JSON Schema of outputs) and touches the generic transform, so it needs a design call.

**Fix direction:** Either let shallow configure descend into root entries of Morph `morphs` (handle the `morphs` key in `_transform` at `ark/schema/node.ts:826-844` for the shallow boundary, or include root morphs in shallowReferences), or have morph traversal apply the morph node's `message` meta to errors raised by its piped roots. Add tests covering `.to()` and `.pipe(fn, type)`.

**Decision:** Should shallow `.configure`/`.describe` on a pipe also apply to its piped output validators (changing their description/JSON Schema), or only to errors raised while validating the output?

### [#1481](https://github.com/arktypeio/arktype/issues/1481) index signature including literals (e.g. string.uuid) treated as having required keys

`schema` · effort small · possibly breaking · [note](#note-1481) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** An index signature whose key type mixes literals with a pattern (string.uuid = versioned regex | nil literal | max literal) turns the literal keys into required props, so `{}` fails, while the inferred type `{ [x: string]: ... }` accepts `{}`.

**Evidence:** Reproduces identically on 2.2.8 and the featherduster tip, and `typeof Uuid.infer` is `{ [x: string]: string | number }`, so runtime is stricter than inference. The maintainer reopened it to revisit diverging from TS semantics, so it needs a design call. A general fix in normalizeIndex isn't safe: `['a' | /^x/]` correctly infers `{ [x: `x${string}`]: string; a: string }` with `a` required, so making mixed-signature literals optional would make the runtime looser than the inferred type.

**Fix direction:** Narrow option: fold the nil and max literals into the single `#versioned` regex of `string.uuid` in `ark/type/keywords/string.ts:870-879`, so the key is one pattern and no required props are produced; keep the `@ { description: "a UUID", format: "uuid" }` meta. General option: change normalizeIndex in `ark/schema/structure/structure.ts:1267`, but only together with inference changes, since a domain-based rule (any non-unit string branch => optional) is unsound for e.g. `'a' | /^x/`.

**Decision:** Fix only string.uuid's representation (single regex covering nil/max), or diverge from TS generally and make literal keys optional in index signatures that also have a pattern branch, with matching inference changes?

### [#1492](https://github.com/arktypeio/arktype/issues/1492) .partial() is ignoring custom error messages on fields in a type

`schema` · effort small · possibly breaking · [note](#note-1492) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** A custom `message` configured on a prop is lost when the error comes from a non-discriminated union; the union rebuilds its message from each branch error's `expected`. .partial() only triggers this by making the discriminant optional.

**Evidence:** Reproduces on both. It isn't specific to .partial(): `type({'a?': X, 'b?': "'x'"}).or({'a?': X, 'b?': "'y'"})` with X = string configured {message: 'custom message'} reports 'a must be a string (was a number)'. With required `b` (discriminated) it reports 'custom message'. The union error's `expected` default (`schema/roots/union.ts`) groups branch errors by path and joins their `expected`, never `message`. The fix is small, but how custom messages combine in a union error is a design call (related: [#963](https://github.com/arktypeio/arktype/issues/963), [#1613](https://github.com/arktypeio/arktype/issues/1613)).

**Fix direction:** `ark/schema/roots/union.ts:157-184` (featherduster) in the union `expected` default: when every error grouped at a path has the same `message`, use that message as the path's description instead of rebuilding `${path} must be ${expected} (was ${actual})` from `expected`.

**Decision:** Should a union error surface a branch's custom `message`? Options: only when every branch failing at a path agrees on it, or also when just some branches set one.

### [#1575](https://github.com/arktypeio/arktype/issues/1575) Standard JSON Schema Default Values

`schema` · effort small · possibly breaking · [note](#note-1575) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** `~standard.jsonSchema.input()` omits `default` for defaultable keys, although `toJsonSchema()` emits it.

**Evidence:** Reproduced the original report on both worktrees: `schema.toJsonSchema()` emits `default: "First"/"Last"`, but the Standard converter calls `this.rawIn.toJsonSchema(...)` (`ark/schema/roots/root.ts:105-109`) and `.in` drops defaults by design (OptionalNode.getIo, `ark/schema/structure/optional.ts:82-89`), so the input schema loses them. Borderline bug/feature (the schema still validates correctly), but ArkType's own converter emits the annotation for the same type; the fix is small but must pick a mechanism that doesn't change `.in` validation semantics.

**Fix direction:** `ark/schema/roots/root.ts:105-109`: build the input schema from `this` with a morph fallback defaulting to `ctx => ctx.base` (merged under any user `libraryOptions.fallback`) instead of `this.rawIn`; alternatively carry the default as `meta.default` on the value in OptionalNode.getIo("in") (`optional.ts:82`), which `ark/sets/toJsonSchema.ts:77-90` already emits.

**Decision:** Should the input JSON Schema (Standard `input` and `.in.toJsonSchema()`) annotate defaultable keys with `default`, and via which mechanism: morph-fallback over the original node, or keeping the default as meta on `.in`?

### [#1644](https://github.com/arktypeio/arktype/issues/1644) scope.import() causes circular type inference when imported definitions participate in ArkEnv.meta augmentation

`arktype` · effort small · [note](#note-1644) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** If ArkEnv.meta() returns a type inferred from a scope that contains any Type value (via .import() or a plain `type()` in the scope), TS reports circularity errors (TS2577/TS7022/TS2615) and the scope becomes any.

**Evidence:** Reproduced on both worktrees with tsgo and TS 6: the reporter's code yields TS2615 'Type of property "#BaseMeta" circularly references itself in mapped type validate&lt;...>' plus TS2577; the inline variant is clean. Not specific to .import(): `scope({ BaseMeta: type({...}), ... })` fails the same way. The cause is the structural `def[k] extends type.Any` check in scope validation (`ark/type/scope.ts:418`): an isolated mapped type with only that check reproduces the cycle, while one checking the `[inferred]` brand key does not. The code comment there warns that changing this check broke cyclic tests before, so it is not a guaranteed easy win.

**Fix direction:** `ark/type/scope.ts:418` (scope `validate`): replace `def[k] extends type.Any | PreparsedResolution` with a nominal check that doesn't resolve Type's meta-dependent members, e.g. `def[k] extends { [inferred]: unknown } | PreparsedResolution` (verified in an isolated mimic to avoid the cycle). Check that PreparsedResolution (Module/Generic) doesn't hit the same issue, and run `pnpm typecheck` against the cyclic tests the comment there warns about.

### [#1663](https://github.com/arktypeio/arktype/issues/1663) Regex `\d+` infers `${number}`, which rejects valid digit strings longer than ~309 digits

`regex` · effort small · breaking · [note](#note-1663) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** arkregex infers `${number}` for repeated digits (\d+, \d\*, \d{n}), which is unsound because digit runs whose Number() is Infinity (above ~1.8e308) validate at runtime but aren't assignable to the inferred type.

**Evidence:** Reproduced on both worktrees: `type("/^\\d+$/")` and `regex("^\\d+$")` accept "1" followed by 309 zeros at runtime, but assigning it to the inferred type is a TS error. This is unsound inference, which is a real bug. The collapse to `${number}` is in `ark/regex/quantify.ts:95` (tryFastPath) and in appendNonRedundant/prependNonRedundant at `ark/regex/state.ts:743`/756. The fix is small, but the replacement type is a design call: `${bigint}` isn't a sound drop-in (verified: TS rejects "0123" and "000"), `string` loses precision, and the reporter's intersection type, or the [#1664](https://github.com/arktypeio/arktype/issues/1664) encodings, change what users see on hover.

**Fix direction:** `ark/regex/quantify.ts:95` tryFastPath: when the pattern is `${number}` and max is null (or large), return a sound digit-run type instead of `${number}`. Apply the same change to the `${number}${number}` -> `${number}` merges in appendNonRedundant/prependNonRedundant (`ark/regex/state.ts:743-766`). Candidate types: the reporter's intersection of `Lowercase<string> & Uppercase<string>` with digit-bounded template literals, or plain `string`. Leave single `\d` (`escape.ts:51`) and the [0-9] range (`charset.ts:58`) as `${number}`.

**Decision:** Which sound type should repeated `\d` infer: plain `string`, the reporter's Caseless/Digit intersection, or the more precise [#1664](https://github.com/arktypeio/arktype/issues/1664) encodings?

### [#577](https://github.com/arktypeio/arktype/issues/577) Fix scope tuple expression functional inference

`arktype` · effort medium · [note](#note-577) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** A tuple morph [in, "=>", fn] with an un-annotated parameter infers its output as never when `in` is an object literal nested in a type or scope (and poisons sibling morphs in the same scope); runtime is correct.

**Evidence:** Reproduces identically on 2.2.8 and the featherduster tip, under both tsgo and TS 6. The trigger is any un-annotated (context-sensitive) parameter, not a parameter-dependent return: `d => "x" as const` infers never while `() => ...` and `(d: unknown) => ...` infer correctly. The issue's own `okType` example (`type({ a: [{ a: "1" }, "=>", data => `${data}`] })`) now infers `{ a: never }` too, and one such scope entry makes an unrelated sibling `["string", "=>", s => s.length]` infer never. Root-level `type([...])` works. Circular contextual inference in TS, no obvious small fix. [#1624](https://github.com/arktypeio/arktype/issues/1624) is a newer, more detailed report of the same problem.

**Fix direction:** `ark/type/parser/tupleExpressions.ts:112` (validateIndexOneExpression) types the morph contextually as `Morph<type.infer.Out<def[0], $, args>>`, which depends on the `def` (and in a scope the `$`) TS is still inferring from the same argument; a context-sensitive parameter makes inference circular and parseMorph (line 181) yields never. A fix must break that cycle (e.g. NoInfer-style wrapping of def[0] or inferring the morph input from a separate position) and be checked against scope inference. Investigation, not a local patch.

### [#1375](https://github.com/arktypeio/arktype/issues/1375) Allow liftArray or direct chaining to work with certain nested morphs

`schema` · effort medium · [note](#note-1375) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** `type.keywords.Array.liftFrom(T)` where T has a nested morph (and unions applying the same morph to T and T[]) throws the 'unordered union ... indeterminate' ParseError.

**Evidence:** Reproduces on both worktrees. `Array.liftFrom(myData)` throws even standalone. The same-morph workaround from discussion [#1374](https://github.com/arktypeio/arktype/issues/1374) throws too, and so does the scope from discussion [#1402](https://github.com/arktypeio/arktype/issues/1402). liftFrom works when T has no morph, or only a root-level one. The overlap is technically real: an array carrying a `bool` prop matches both branches and gets different outputs. In [#1402](https://github.com/arktypeio/arktype/issues/1402), `{ name, files: [], opts }` is a valid file and module but only the file branch transforms `opts`. Allowing it needs a design call on accepting that edge case, so it isn't an easy win. Verified workaround: `type("object").pipe(toArray).to(myData.array())`.

**Fix direction:** featherduster: `ark/type/keywords/Array.ts:13-24` (liftFrom builds nonArrayElement.rawOr(lifted)) and `ark/sets/roots/union.ts:546-574` (assertDeterminateOverlap). Either let liftFrom build an ordered, array-first union whose `in` computation doesn't re-run the unordered morph check, or teach the overlap check to treat an Array branch and a non-Array object branch with the same nested morph as determinate.

**Decision:** Should liftFrom (and same-morph unions over T | T[]) be allowed via an ordered array-first union, or by relaxing the overlap check for array vs non-array object branches, given that the input overlap is technically real?

### [#1435](https://github.com/arktypeio/arktype/issues/1435) Improve partially discriminated error context

`schema` · effort medium · possibly breaking · 1 reaction · [note](#note-1435) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** When one union branch's discriminant is a literal union (`'c' | 'd'`), it becomes the switch default, so errors for a missing or invalid discriminant blame only that branch.

**Evidence:** Reproduces on both 2.2.8 and the featherduster tip, even with the discriminant present: `Thing({ type: "e" })` gives `type must be "c" or "d" (was "e")` plus `val3 must be a number`. Cause is in `discriminate` (featherduster: `ark/sets/roots/union.ts:131-145`; 2.2.8: `ark/schema/roots/union.ts:519-528`): the disjoint between `"a"` and `"c" | "d"` has kind `"union"` (verified), and only `"domain"`/`"unit"` entries become cases, so that branch lands in the default. A fully literal version reports `type must be "a", "b" or "c"`. On the featherduster tip the jitless path now gives the same narrowed error too (2.2.8 jitless lists all values), so the reporter's jitless workaround no longer applies there. Not an easy win: the maintainer has said he's weighing a design, and the fix changes discrimination/error output for every union with literal-union discriminants.

**Fix direction:** `ark/sets/roots/union.ts` `discriminate` (~line 131): when a disjoint entry has kind "union" and every l/r branch is a case unit, register each unit as its own case (mapping to that branch index) instead of `continue`. The literal-union branch then gets explicit cases and `default` becomes the error listing all values. Alternatively keep the default branch but add the other cases' expected values to its discriminant error.

**Decision:** Should a branch whose discriminant is a union of literals be split into explicit switch cases, so the default always reports every valid value, or should the default branch keep its own errors with added context about the other branches?

### [#1524](https://github.com/arktypeio/arktype/issues/1524) `type.map()` collapses discriminated union

`arktype` · effort medium · possibly breaking · [note](#note-1524) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** Type.map on a union is applied per branch at runtime, but its inferred type merges the branches. When the branches share no keys, the callback's entry is typed `never`.

**Evidence:** Runtime is correct on 2.2.8 and the featherduster tip: the result is `{ name: "number", type: number[] } | { name: "string", type: string[] }`, and `{ name: "number", type: ["x"] }` is rejected. Types are wrong in `ark/type/variants/object.ts:159-179`: typePropOf uses `keyof` of the whole union, so the reported case infers a sound but collapsed `{ name: "number" | "string"; type: string[] | number[] }`. For `type.or({ a: "string" }, { b: "number" }).map(...)` the entry is `never` ("Property 'key' does not exist on type 'never'") although the callback receives `a` and `b` at runtime. Not an easy win: the callback's return can't be correlated to a branch, so a sound union output type needs a design call.

**Fix direction:** `ark/type/variants/object.ts:174-179`: make typePropOf distribute over `o` (`o extends unknown ? ... : never`) so the entry is the union of each branch's props. Also make constructMapped (line 235) sound for union `t`; naively distributing the entry alone would produce `{ a: string[]; b: number[] }` for disjoint branches, which is unsound.

**Decision:** What should .map infer on a union, given that the callback's output can't be tied back to a branch: a per-branch result that is only right when keys don't overlap, a loose sound supertype, or no union support at the type level (pointing to .distribute)?

### [#1532](https://github.com/arktypeio/arktype/issues/1532) capture groups inside lookarounds not captured

`regex` · effort medium · [note](#note-1532) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** Capture groups inside lookahead or lookbehind are dropped from inferred captures and names, which also shifts the inferred indices of every later capture group and makes backreferences to them a false type error.

**Evidence:** Unsound on both versions: `^(?=(a))a(b)$` infers captures `["b"]`, so `m[1]` is typed `"b"` while it holds `"a"` at runtime. Cause: `popGroup` in `ark/regex/state.ts:219` replaces a lookaround group's root with `""`, discarding its inner AST (`group.ts:23` "for now, lookarounds don't affect inference"). Not an easy win: the triager's plan (wrap lookarounds in GroupTree as the root) makes quantified lookarounds stop erroring and breaks the existing "quantified lookahead" test (`regex.test.ts:1164`). A working fix needs the lookaround pushed into the sequence with an empty root, a new negative-lookaround kind, and undefined-mapping for negative captures/names: verified at ~+53/-11 lines across `state.ts` and `group.ts`.

**Fix direction:** Verified in ark/repo/scratch/audit/i1532/regexfix/ on the featherduster worktree. 1) `state.ts:43` add `negativeLookaround` to `State.UnnamedCaptureKind`; `group.ts:23-25` and :144-146 push `lookaround` for `=` and `negativeLookaround` for `!` (small `pushLookaround` helper). 2) `state.ts`: add `LookaroundKind` and `GroupKind = CapturedGroupKind | LookaroundKind`, widen `GroupTree`'s `capture` constraint to `GroupKind`. 3) `popGroup` (l.216-220): for lookarounds, push `GroupTree<State.Group.finalize<s>, s["capture"]>` into the sequence and keep `root: ""`, so quantifiers after a lookaround still error. 4) `finalizeGroupResult` (l.526-542): pattern `""` for lookaround kinds; for negative lookarounds, map new captures (via `extractNewCaptures`) and new names to `undefined`. Results: `["a"]`, `["a","b"]`, `{x:"a"}`, `[undefined]`, `{y:undefined}`, `^(?=(a))\\1$` -> `Regex<"a", {captures:["a"]}>`, quantified lookahead still errors, and the copied `regex.test.ts` type-checks. Add cases under "lookarounds" (`regex.test.ts:1149`).

### [#1533](https://github.com/arktypeio/arktype/issues/1533) arkregex: simple regexes' types too deep?

`regex` · effort medium · [note](#note-1533) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** Case-insensitive (`i` flag) regexes with 3+ alternation branches hit TS2589 "excessively deep" and the inferred type silently degrades to accept any string.

**Evidence:** Reproduces identically on 2.2.8 and featherduster (arkregex 0.0.13 in both; regex sources identical apart from a new `internal.ts` export), with tsgo 7.1 and TS 6.0.3. The limit tracks alternation of case-split branches, not total string count: "relay|relai", "abcd|efgh|ijkl" and "abcdefghij" pass, "relay|point|abcde" fails. A real type-level bug, but the fix is a restructuring of type-level finalization, not a local tweak (triager tried changing `parse.ts` maybeSplitCasing to a plain union in a scratch copy; still failed).

**Fix direction:** `ark/regex/parse.ts:37-40` (maybeSplitCasing) splits each cased char into a UnionTree&lt;[Lowercase, Capitalize]>; `ark/regex/state.ts` SequenceTree.\_finalize and finalizeTree then distribute every case-split char into separate recursive FinalizationResults per branch, which UnionTree.\_finalize multiplies across alternatives. Fix: finalize capture-free case-split chars (and capture-free sequences generally) as a single result whose pattern is a string union, so expansion happens in one template-literal concatenation instead of recursive distribution. Medium refactor of the type-level finalizer.

### [#1652](https://github.com/arktypeio/arktype/issues/1652) Out of memory error when inintializing a merged type with a lot of or

`schema` · effort medium · [note](#note-1652) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** Chaining .merge() over 11 two-branch unions builds a 2^11 = 2048-branch union, and construction time and memory blow up: OOM crash on 2.2.8, and about 205s with a ~1.9GB heap on featherduster.

**Evidence:** The 2048-branch output follows from merge distributing over unions (TS spreads give the same product), but building it is superlinear. With the reporter's exact code, 2.2.8 crashed with 'JavaScript heap out of memory' at the 1024-branch step (Node default ~4.5GB heap) after the 512-branch step took 44s and 1.1GB. On featherduster the chain completes, but the 2048-branch step alone takes 137s with a 1.9GB heap. A CPU profile of the 512-branch chain splits inclusive time between reduceBranches' pairwise intersections (53% on 2.2.8, 39% on featherduster) and discriminate (49% and 46%). Fixing it needs algorithmic work, so it is not an easy win.

**Fix direction:** `ark/sets/roots/union.ts:505` reduceBranches: avoid the O(n^2) pairwise intersectNodesRoot, e.g. with a cheap disjointness pre-check on unit/domain values at shared required keys, or by skipping reduction when the branches of a product of already-reduced unions are disjoint by construction. `ark/sets/roots/union.ts:102` discriminate takes a comparable share of time at this size and needs the same scrutiny.

### [#813](https://github.com/arktypeio/arktype/issues/813) Fix circular inference on cyclic thunk reference

`arktype` · effort large · [note](#note-813) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** Mutually referencing thunk aliases in a scope (`a: () => $.type({b: "b"}), b: () => $.type({a: "a"})`) fail inference with TS circularity errors; on 2.2.8 they also overflow the stack at runtime.

**Evidence:** On 2.2.8 the scope fails both ways: `$.export()` throws RangeError: Maximum call stack size exceeded, and tsc reports TS7023/TS2615. On the featherduster tip the runtime works (`thunk.test.ts:124` 'cyclic thunks in scope' cites [#813](https://github.com/arktypeio/arktype/issues/813), but casts everything to `never`, so types are untested) and the same TS errors remain on TS 7 and TS 6. A narrower case reproduces on both with no cycle at all: a plain string alias that references a thunk alias (`any: "remote"`), which explains the commenter's error persisting after removing the cyclic member. Points at bootstrapAliases thunk-return inference; needs work against the checker, not a local patch.

**Fix direction:** Type-level only: `ark/type/scope.ts:145-160` (`bootstrapAliases`, which infers thunk return types via `def[k] extends () => infer thunkReturn`) and the `validate` mapped type. String-alias validation forces the thunk's return type, which needs `$`'s own type; make that resolution lazy (e.g. defer thunk returns behind a reference not forced during validation). Needs investigation against the checker.

### [#806](https://github.com/arktypeio/arktype/issues/806) Morph intersection in chained object inferred as never

`arktype` · effort unknown · [note](#note-806) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** A tuple morph with an un-annotated parameter, at an object key with an array or object-literal input, infers `never` for that key. The input is lost too: `{ c: never }`, not a morph. This isn't specific to `.and`.

**Evidence:** Reproduces on both worktrees with tsgo and TS 6; runtime is correct. It doesn't depend on the return using the parameter: `type({ c: ["string[]", "=>", s => 5] })` infers `{ c: never }`, but `() => 5` and `(s: string[]) => 5` infer correctly. Inputs that fail at a key are `"string[]"`, `["string", "[]"]`, `"string | string[]"` and object literals. Inputs that work are `"string"`, `"string | number"`, `"Date"`, `"object"` and `"Record<string, string>"`, and so do top-level tuples and `type("string[]").pipe(s => 5)`. It's the same symptom as [#1624](https://github.com/arktypeio/arktype/issues/1624), where in a scope even `["Base", "=>", d => 5]` and `["string", "=>", s => s.length]` give never. This is TS context-sensitive inference interacting with the def validation, so it isn't a small local fix.

**Fix direction:** Investigate why the inferred def for the tuple at a key stops matching `parseMorph` (`ark/type/parser/tupleExpressions.ts:181`, `morph extends Morph ? ... : never`) when the morph is context-sensitive. Its contextual type comes from validateIndexOneExpression's `Morph<type.infer.Out<def[0], $, args>>` (`tupleExpressions.ts:113`), which depends on the def being inferred. A fix likely means deriving the morph parameter's contextual type without a circular dependence on the outer def. Shared with [#1624](https://github.com/arktypeio/arktype/issues/1624).

### [#1072](https://github.com/arktypeio/arktype/issues/1072) TS crash on some cyclic thunks

`arktype` · effort unknown · possibly breaking · [note](#note-1072) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** A cyclic scope whose thunk calls `.narrow()` on a type referencing the cycle crashes the TS checker.

**Evidence:** Reproduces on 2.2.8 and the featherduster tip with the issue's code. TS 6.0.3 `tsc` dies with `RangeError: Maximum call stack size exceeded`. tsgo doesn't crash but reports TS7023/TS2615 circularity on `children`. Without `.narrow` the scope typechecks, and so does the same predicate written as a `["root[]", ":", predicate]` tuple expression (predicate param inferred, not any). Runtime is correct on both. Not small: the cause is how `narrow`'s signature forces resolution of the cyclic scope.

**Fix direction:** Likely `ark/type/variants/base.ts:402-414` (featherduster tip): `narrow`'s `narrowed extends this["infer"]` bound and its `r` default (`t extends InferredMorph<...>` conditional) force evaluation of the cyclic alias while the scope is still being inferred. Needs a restructured or deferred signature (unverified).

### [#1288](https://github.com/arktypeio/arktype/issues/1288) Non keywords not inferred in some chained `at` cases

`arktype` · effort unknown · [note](#note-1288) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** `match.in<T>().at(key, cases)` leaves the parameter of a non-keyword case like "0" implicitly `any` when `cases` has no `default`; chained `.at(key).match(cases)` infers it correctly.

**Evidence:** Reproduces on both branches with tsgo and TS 6, only when `.at`'s second argument has no `default`. With `default: "assert"`, or when chained through `.match`, `o` is inferred as { id: 0 }. In a properly resolved copy of the featherduster `ark/type/match.ts`, these signature rewrites did not fix it: inlining ctxAtKey, swapping overload order, typing key as `keyof ctx["input"]`. Delegating to CaseMatchParser's parameter type hung tsgo. Only hardcoding the key literal (no inferred key) worked, which is not a viable fix. The root cause is contextual typing of `cases` while `key` is inferred in the same call; no small fix is known.

**Fix direction:** `ark/type/match.ts:225-233` (AtParser two-arg overload): contextual typing of `cases` fails while `key` is inferred in the same call. Tried and failed: inlining ctx.atKey, swapping overload order, constraining key to keyof input. Delegating to Parameters&lt;CaseMatchParser&lt;...>> hangs the checker. Needs a deeper restructuring; no concrete small change known.

### [#1370](https://github.com/arktypeio/arktype/issues/1370) TypeScript issues with large recursive schema

`arktype` · effort unknown · 1 reaction · [note](#note-1370) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** A module with a 26-member string union (`"string | accordion | ... | tooltip"`) fails with TS2589 "excessively deep" and makes `.infer` unusable.

**Evidence:** Reproduces on both worktrees with tsgo and TS 6 (TS2589, plus TS5114 on tsgo). The cause is the number of branches in one string union, not the cycle. A non-cyclic module with a 26-alias union fails too, and so does a flat `type()` union of 25 quoted literals with no scope at all. Literal length doesn't matter: 24 branches pass and 25 fail, with both 'a0'-style and 20-char literals. It also fails against the published arktype 2.2.7 `.d.ts`. Numeric literals pass at 25. Splitting the union across two private aliases makes the original module type-check, `@ts-expect-error` included. The parser loop (`parseUntilFinalizer<next<s>>`, `ark/type/parser/string.ts:110`) is nominally tail-recursive, so some state member must be nesting once per branch. The triager's two experiments didn't find which one.

**Fix direction:** featherduster: ark/type/parser: the `string.ts` parseUntilFinalizer/next loop, the `reduce/static.ts` state reducers (reduceBranch/mergeToUnion/setRoot), and `shift/operand/enclosed.ts` \_parseEnclosed for quoted literals. Find which lazily instantiated state member nests once per branch, and make it evaluate eagerly so union length doesn't consume instantiation depth. Two things alone did not fix it: making the union merge eager (`static.ts:120-140`) and dropping the `scanned` accumulation.

### [#1510](https://github.com/arktypeio/arktype/issues/1510) Unable to set default on referenced `type.string.matching` when defined within scope

`arktype` · effort unknown · [note](#note-1510) · 2.2.8: reproduces, featherduster: reproduces

**Summary:** Inside scope(), an alias defined inline as a Type with `.describe()`/`.configure()` resolves to `never` while the scope is validated, so `"alias = 'literal'"` is rejected at the type level ('Default value ... must be assignable to alias'); runtime is fine.

**Evidence:** Reproduces on both under TS 7 and TS 6; types only, since runtime parsing and the defaults work. `.matching()` isn't the trigger: `type.string.describe("x")` and `.configure({description})` inline fail, while plain `.matching()` inline or the same Type hoisted to a const pass. A tuple default `["s", "=", () => 5]` reports `Type 'number' is not assignable to type 'never'`, showing the alias is `never` during validation, but the final scope inference is correct (string). Likely a TS inference quirk with the generic overloaded `SelectableFn` signature of describe/configure during scope's `const def` inference; the fix isn't obvious.

**Fix direction:** Investigate `ark/schema/node.ts:1253` NodeSelector.SelectableFn (the generic overloads used by describe/configure in `ark/type/variants/base.ts:222,236`): during inference of scope's `const def` (`ark/type/scope.ts`) the inline call's type resolves to never. Try a non-generic overload for the common (string) case, or check validateDefault (`ark/type/parser/ast/default.ts`) against an alias resolution that isn't never.

## Fixed on featherduster

Each of these reproduces on 2.2.8 and is fixed on the featherduster branch. They can be closed when featherduster ships, or now with a pointer to the fix.

- **[#579](https://github.com/arktypeio/arktype/issues/579) Reintegrate static shallow cycle check** (`arktype` · breaking · [note](#note-579)). Report a type error for scope aliases that resolve to themselves without passing through an object, array or morph, e.g. scope({ a: "a" }).

  On 2.2.8 both examples type-check and accept every value (`a(5)` returns 5, expressions `$a` and `$a | undefined`). On the featherduster tip both are type errors ("Alias 'a' has a shallow resolution cycle: a->a", "a->b->a" / "b->a->b") and throw that message at runtime. Landed in 74a4df18b "fix(type): check shallow cycles statically" (on the public featherduster branch), CHANGELOG "Reject shallow cycles".

- **[#928](https://github.com/arktypeio/arktype/issues/928) Reduce equivalent cyclic types** (`schema` · [note](#note-928)). Structurally equivalent cyclic types (same shape, different alias names) should be recognized as equal and reduced.

  The issue's literal example already holds on 2.2.8 (admin references user[], so types.user === types.admin), but alpha-equivalent cycles don't: `admin2: { friends: "admin2[]" }` is not equal to user, `user | admin2` stays a 2-branch union, and `listPos.extends(list)` is false. On the featherduster tip equals/extends are true and unions/intersections reduce (`user | admin2` -> one branch) via bisimulation (8d423cdbe, 8325a9794). Caveat for the maintainer: on featherduster exported equivalent aliases are no longer the same node (types.user !== types.admin; admin's expression unrolls one level), so the issue's literal `attest(types.user).equals(types.admin)` (reference equality for functions) passes on 2.2.8 but would fail on featherduster. Not a correctness issue.

- **[#930](https://github.com/arktypeio/arktype/issues/930) Ensure cyclic aliases are serialized with a scope reference** (`schema` · [note](#note-930)). Cyclic alias references serialize as `$name` with no scope identity, so same-named aliases from different scopes collide in hashing/caching.

  Reproduces on 2.2.8: two scopes with differently-defined `a` and identical `box: { "inner?": "a" }` give identical json `{ inner?: "$a" }`, `s1.box.equals(s2.box) === true`, and `s1.box.and(s2.box)` (expression `{ inner?: $a }`) accepts `{ inner: { v: "x" } }`, which s2.box rejects (unsound). On the featherduster tip aliases serialize with their definition's unique id (`$ark.a1` / `$ark.a2`), equals is false and the intersection reduces to `{ inner?: never }` and rejects it; commit 2be0c8ea3.

- **[#944](https://github.com/arktypeio/arktype/issues/944) Create a robust lazy resolution system, integrate with transforms** (`schema` · [note](#note-944)). Node transforms (e.g. getting `.in`/`.out`, deep undeclared-key config) don't cross cyclic alias references, so derived types of cyclic types are wrong.

  On 2.2.8, for `node: { n: "string.numeric.parse", "next?": "node" }`, `.out` keeps the morph `$node` (rejects valid output `next.n must be a string`, accepts invalid `{ n: 1, next: { n: "2" } }`), and `.in` still parses the nested value; same for mutually recursive aliases and `tree[]`, and `.onDeepUndeclaredKey("reject"/"delete")` stops at the alias. On the featherduster tip all of these are correct (5fb19e554 'transform node trees through aliases', ba6c398b4 for mutual recursion). Separate observation from the triager: featherduster no longer preserves identity of a shared (DAG) input object transformed at two keys, a consequence of clone removal, not this issue.

- **[#961](https://github.com/arktypeio/arktype/issues/961) Traverse discriminant at runtime in jitless environments** (`schema` · [note](#note-961)). In jitless mode, discriminated unions check every branch instead of switching on the discriminant, so they're slower and give worse errors.

  Reproduces on 2.2.8: with `jitless: true`, `{kind:'a',a:string} | {kind:'b',b:number}` on `{kind:'a',a:1}` reports `a must be a string (was a number) or b must be a number (was missing)` rather than `a must be a string (was a number)`. On the featherduster tip the jitless output matches the compiled output, because `UnionNode.traverseAllows`/`traverseApply` (`ark/schema/roots/union.ts:280-318`) dispatch on `compiledDiscriminant`. That was added in 97059c4fe "fix(schema): dispatch interpreted unions on their discriminant" (contained in origin/featherduster). [#1435](https://github.com/arktypeio/arktype/issues/1435)'s jitless-vs-JIT error difference has the same cause.

- **[#1026](https://github.com/arktypeio/arktype/issues/1026) Only allow AliasNode as a structural reference** (`schema` · 1 reaction · [note](#note-1026)). Maintainer TODO: aliases for cyclic types should only appear in structural positions (required/optional/sequence/index), so cyclic unions can be discriminated again.

  Walking every node reachable from cyclic scope exports finds aliases in union branches on 2.2.8 (`$Group in union` for the [#1630](https://github.com/arktypeio/arktype/issues/1630) Field/Group/Part scope, `$LinkedList in union` for `next?: "LinkedList | null"`), with `Part` undiscriminated and `Record<string, json>` throwing `'json' is unresolvable`. On the featherduster tip every alias sits under a structural node, `Part` is discriminated on `["type"]` and the JSON scope validates. Fixed by f57ad99cb "fix(schema): allow an alias only as a structural value" (on origin/featherduster). The issue's optional extras (a scopeless `node` layer) aren't done, but the core ask and cyclic discrimination are.

- **[#1082](https://github.com/arktypeio/arktype/issues/1082) Support recursive generics in `2.0` release candidate** (`schema` · 5 reactions · [note](#note-1082)). Recursive generics (e.g. `alternate<a, b>` referencing `alternate<b, a>`) type-check but overflow the stack at runtime when the scope is exported.

  On 2.2.8 both `alternate<a,b>` and `tree<t>` with `children?: tree<t>[]` throw `RangeError: Maximum call stack size exceeded` on export. On the featherduster tip both export and validate correctly, the issue's type assertions all hold, and `nest: "nest"` throws `nest<t> requires exactly 1 args (got 0)`. Fixed by 87fd01ea8 "fix(schema): instantiate recursive generics once per argument set", which also re-enabled the `self-reference` tests in `ark/type/__tests__/generic.test.ts:628-660`.

- **[#1237](https://github.com/arktypeio/arktype/issues/1237) Intersect with discriminated type** (`schema` · [note](#note-1237)). A cyclic scope that applies Omit&lt;> to aliases whose resolution is an intersection with a cyclic union throws "ParseError: T must be assignable to object".

  The reporter's scope still throws the same ParseError on 2.2.8. On the featherduster tip it parses and validates correctly: valid editing and non-editing nodes pass, and invalid edits, unknown discriminants and deeply nested missing keys are rejected with correct paths. The fix is commit 2be0c8ea3, "fix(schema): identify an alias by its context id". The earlier phase-2 notes list [#1237](https://github.com/arktypeio/arktype/issues/1237) as an acceptance test for that change.

- **[#1380](https://github.com/arktypeio/arktype/issues/1380) Context-free traversal for determinstic morph at path** (`schema` · [note](#note-1380)). onDeepUndeclaredKey("delete") forces the slow contextual apply strategy even though its nested morph is deterministic.

  On 2.2.8, `tDelete.internal.rootApplyStrategy` is "contextual" (flatMorphs.length > 0 forces it). On the featherduster tip it is "transform" with allowsRequiresContext false. The fix is commit 333fea95f, "feat(schema)!: transform valid data in a compiled copy-on-write pass". Rough local timing with an undeclared key at both levels: 2.2.8 ~27µs, featherduster ~170ns. Side finding: on featherduster, `"+": "delete"` (shallow or deep) returns keys in sorted order (`{b,a}` in comes back as `{a,b}`), while 2.2.8 keeps input order. Non-delete morphs like string.trim keep order. This isn't in the CHANGELOG and may be unintended. [#1375](https://github.com/arktypeio/arktype/issues/1375) (EDIT2) still reproduces on featherduster.

- **[#1437](https://github.com/arktypeio/arktype/issues/1437) Deeply nested scopes breaks type inference of generics mixed with private alias** (`arktype` · effort trivial · [note](#note-1437)). A generic whose body references a private alias infers `never` once its scope's export has been spread through two further scopes (runtime is correct).

  Reproduces on 2.2.8 with tsgo and TS 6: Thing3 (and a 4th hop) infer never while runtime returns "hello". Fixed on the featherduster tip by 74a4df18b ("fix(type): check shallow cycles statically", Fixes [#1437](https://github.com/arktypeio/arktype/issues/1437)), which changes `ark/type/module.ts:37` to infer `GenericAst<infer params, infer body, infer body$, any>` so body$ is no longer inferred from the defaulted arg$ slot; repro typechecks cleanly on TS 6 and 7 there. The commit is also on the public featherduster branch.

- **[#1457](https://github.com/arktypeio/arktype/issues/1457) `never` property type when using generic types** (`arktype` · [note](#note-1457)). A generic from a nested submodule, instantiated with an alias of the referencing scope, infers that alias's nested properties as `never` (runtime is correct).

  Minimized and confirmed on 2.2.8: `A.infer` is `{ refs: { id: never }[] }`; on the featherduster tip it is `{ refs: { id: string }[] }` (also the reporter's full playground repro: `id: never` vs `ID<"Metaobject">`, on both TS7 and TS6). Fixed by featherduster commit a36569f8f "fix(type): infer a foreign generic's arguments in the referencing scope"; runtime validates correctly on both. Related [#1437](https://github.com/arktypeio/arktype/issues/1437) (private alias through nested scope exports).

- **[#1476](https://github.com/arktypeio/arktype/issues/1476) Recursive conjunction causes OOM** (`schema` · 2 reactions · [note](#note-1476)). Exporting two mutually recursive scope aliases whose union branches intersect overlapping objects never finishes (OOM) or overflows the stack.

  On 2.2.8 the issue's scope hangs: no output after 60 s with RSS at 1.4 GB and climbing, and a plain-object variant throws `RangeError: Maximum call stack size exceeded`. On the featherduster tip the issue's scope exports in ~116 ms and classifies 12 Truthy/Falsy cases correctly; the plain-object variant runs in ~260 ms. The fix is d15c0e522 "fix(sets): key cyclic intersections canonically" (ancestor of the tip), and the repro is pinned in `ark/type/__tests__/cyclic.test.ts:1114` (5521dd641).

- **[#1486](https://github.com/arktypeio/arktype/issues/1486) string.date.parse does not work on cyclic objects** (`schema` · [note](#note-1486)). In a cyclic scope, a morph nested under a union with an alias branch (`"supervisor?": "User | null"`) is silently skipped, so supervisor.lastUpdate stays a string and unparsable nested dates are accepted.

  Reproduces on 2.2.8: supervisor.lastUpdate stays '1', string.trim is skipped the same way, and `supervisor: { lastUpdate: "x" }` passes validation. On the featherduster tip all of these are fixed: Dates at every depth, and "x" is rejected. Root cause on 2.2.8: `ark/schema/roots/union.ts:346` and :455 keep a taken branch's queued morphs only if `branch.includesTransform`, which is false for the alias branch. Fixed on featherduster by 044fe5f4f "fix(schema): keep a taken union branch's morphs when an alias reaches them".

- **[#1511](https://github.com/arktypeio/arktype/issues/1511) toJsonSchema({ useRefs: true }) fails for partially overlapping discriminated union** (`schema` · [note](#note-1511)). toJsonSchema({ useRefs: true }) on a discriminated union of objects throws an internal error "Unexpected JSON Schema input for structure: {}".

  Reproduces on 2.2.8 (throws). On 2.2.8 `root.ts:173` puts every root in this.references into $defs, including the discriminant's case nodes (branches pruned of their object domain, e.g. `{ a: "a"|"b"|"c" }` with no domain), whose structure reduce throws. On the featherduster tip it emits valid $defs: commit f57ad99cb ("fix(schema): allow an alias only as a structural value") made $defs hold only nodes a $ref reaches (`ark/sets/toJsonSchema.ts:36-50`); its message names [#1612](https://github.com/arktypeio/arktype/issues/1612) and [#1546](https://github.com/arktypeio/arktype/issues/1546) as fixed by the same change. [#1612](https://github.com/arktypeio/arktype/issues/1612)'s repro (`type({ a: "string" }).or("null")`) verified: throws on 2.2.8 and works on featherduster.

- **[#1543](https://github.com/arktypeio/arktype/issues/1543) Discrimination with optional never** (`arktype` · [note](#note-1543)). A union of objects made disjoint by `"key?": "never"` vs `key: "string"`, where both branches have conflicting defaults, throws at parse time instead of being allowed.

  On 2.2.8 the issue's exact snippet works in a fresh process but throws `Invalid intersection of default values "EXPIRED" & "REJECTED"` when a simpler union with the same `key?: never` discriminant and defaults was created earlier (order/cache-dependent). The same order-dependent throw hits the nested-object variant. On the featherduster tip every order and variant parses and applies the right default; no specific CHANGELOG entry (likely the arksets discrimination/intersection rewrite).

- **[#1546](https://github.com/arktypeio/arktype/issues/1546) JSON Schema generation fails for discriminated unions in recursive scopes** (`schema` · 1 reaction · [note](#note-1546)). toJsonSchema() throws "Unexpected JSON Schema input for structure: {}" for cyclic types (which force useRefs) containing a discriminated union whose branches have 2+ props.

  Both the issue's scope repro and the comment's 2-props-per-branch repro throw on 2.2.8 and produce valid schemas on the featherduster tip. Root cause on 2.x (`ark/schema/roots/root.ts:165-178`): cyclic types force useRefs, and $defs are built from node.references, which include the union's discriminant-pruned case nodes (e.g. `{ value: string }`, no object domain), whose structure reducer throws. Same error as [#1612](https://github.com/arktypeio/arktype/issues/1612) and [#1511](https://github.com/arktypeio/arktype/issues/1511) (plain discriminated union with `useRefs: true` throws identically on 2.2.8). featherduster pins this repro in `ark/type/__tests__/toJsonSchema.test.ts:123` (commit 5521dd641).

- **[#1568](https://github.com/arktypeio/arktype/issues/1568) Arktype doesn't work with @date-fns/utc UTCDate class.** (`schema` · [note](#note-1568)). A Date subclass (e.g. @date-fns/utc UTCDate) passed through any type with a morph comes out as a broken object whose Date methods throw `incompatible receiver`.

  Reproduced the reporter's exact StackBlitz code (`type.instanceOf(UTCDate).pipe(d => d.toISOString())(new UTCDate())`) with the real @date-fns/utc 2.1.1 on 2.2.8. Cause: the default `clone` (`ark/util/clone.ts`) only special-cases a `Date` whose constructor is exactly Date, and copies subclasses with `Object.create(proto)`, losing the internal [[DateValue]] slot. Types without morphs are unaffected, and `configure({ clone: false })` fixes it. On featherduster the clone option was removed (CHANGELOG "Remove the `clone` option": transforms no longer copy untransformed values), and every variant returns the correct date, with `instanceof UTCDate` preserved.

- **[#1587](https://github.com/arktypeio/arktype/issues/1587) Union with common merge child doesn't find error in child** (`schema` · [note](#note-1587)). A union of two objects that both reference the same cyclic alias accepts invalid nested data that each branch alone rejects.

  Reproduces on 2.2.8 (`A.allows` false, `B.allows` false, `A.or(B).allows` true); Merge and "+": "reject" are irrelevant. Root cause on 2.2.8: AliasNode.traverseAllows/Apply and compile (`ark/schema/roots/alias.ts:160-180`) append each visited object to ctx.seen and never remove it, so after branch A fails on `inner`, branch B sees `inner` as an in-progress cycle and accepts it. Fixed on featherduster by 9d02c8cbe "fix(schema): track cyclic data per key and object", whose message cites exactly this failed-branch case; featherduster reports `inner.category must be a number (was a string)`.

- **[#1598](https://github.com/arktypeio/arktype/issues/1598) Make "number" reject Infinity, or make it easy to parse only finite numbers** (`schema` · breaking · [note](#note-1598)). Asks for `number` to reject ±Infinity by default (like Zod 4) or for a `number.finite` keyword.

  On arktype 2.2.8 `type.number(Infinity)` returns Infinity; on the featherduster tip it returns `must be a number (was Infinity)`, and the same for -Infinity, `number.integer` and `number > 0`. Implemented by 71aeadbdd "feat(schema)!: reject Infinity from number by default" and listed in the featherduster CHANGELOG, with the `numberAllowsInfinity` opt-out and `number.Infinity`/`number.NegativeInfinity` keywords.

- **[#1612](https://github.com/arktypeio/arktype/issues/1612) toJsonSchema throws "Unexpected JSON Schema input for structure: {}" error when useRefs is true when structure is first child of intersection.** (`schema` · [note](#note-1612)). `type({ a: "string" }).or("null").toJsonSchema({ useRefs: true })` throws `Unexpected JSON Schema input for structure: {}`.

  Reproduces on 2.2.8 for `obj | null`, `obj | string` and the same union nested at a key; plain objects and arrays work. On the featherduster tip all of these produce valid `$ref`/`$defs` output. JSON Schema generation moved to arksets (b8b1f7cef "feat: generate JSON Schema from arksets", `ark/sets/toJsonSchema.ts`).

- **[#1630](https://github.com/arktypeio/arktype/issues/1630) [bug] inconsistent errors for unions with cycles** (`schema` · [note](#note-1630)). In a cyclic scope, `Part: "Field | Group"` reports a `union` error instead of the Field branch's `minLength` error once Group references Part.

  Reproduces on 2.2.8: Part's json is `["$Group", {...Field}]`, an alias branch, so the union isn't discriminated; in jitless mode even the acyclic case reports `union` when Part is called directly. On the featherduster tip both jit and jitless give `minLength` at parts[0].value and for direct Part calls. Fixed by f57ad99cb "fix(schema): allow an alias only as a structural value" ([#1026](https://github.com/arktypeio/arktype/issues/1026)), an ancestor of the featherduster tip, with a regression test citing [#1630](https://github.com/arktypeio/arktype/issues/1630) at `ark/type/__tests__/cyclic.test.ts:410`.

## Probably close: out of date

### Fixed in a release

These no longer reproduce on 2.2.8.

- **[#787](https://github.com/arktypeio/arktype/issues/787) Investigate inference for inlined type definitions** (`arktype` · [note](#note-787)). Maintainer observed that type({ a: type("string") }) checked much slower than referencing a pre-defined type.

  Doesn't reproduce on 2.2.8 or featherduster. With TS 6 `--extendedDiagnostics`, inlining three non-trivial `type()` calls costs a constant 8 instantiations more than defining and referencing them (2.2.8: 415,883 vs 415,875; featherduster: 380,912 vs 380,904; tsgo on 2.2.8: 604,795 vs 604,787). The gap doesn't grow with the size of the inner definitions, so the inner def isn't being validated twice.

- **[#950](https://github.com/arktypeio/arktype/issues/950) Default value inference incorrectly displays `| undefined` in parameter type** (`arktype` · [note](#note-950)). The old default representation `(In?: number) => Default<5>` displayed `In?: number | undefined` due to TS #58578.

  That function-shaped representation no longer exists. On both 2.2.8 and the featherduster tip, `type({ bar: ["number", "=", 5] })` has `t` = `{ bar: Default<number, 5>; }` (`attributes.ts:272` `Default<t, v> = { [defaultsToKey]: [t, v] }`). `inferIn` is `{ bar?: number }`, and `{ bar: undefined }` is rejected under exactOptionalPropertyTypes. The display bug can't happen any more.

- **[#951](https://github.com/arktypeio/arktype/issues/951) Default values for tuple elements** (`arktype` · 1 reaction · [note](#note-951)). Asks for defaultable tuple elements like `["string", ["number", "=", 5]]`, with the same semantics as defaultable object properties.

  Shipped in [#1228](https://github.com/arktypeio/arktype/issues/1228) ("feat: tuple defaults...", merged 2024-12-18), not [#1139](https://github.com/arktypeio/arktype/issues/1139) (default value functions) as the last comment says. On 2.2.8 and the featherduster tip, the issue's exact example gives `inferIn` = `[string, number?]` and `infer` = `[string, number]` (checked both directions), and `t(["a"])` returns `["a", 5]`. It's documented at /docs/objects#tuples-defaultable and tested in `ark/type/__tests__/arrays/defaults.test.ts`.

- **[#970](https://github.com/arktypeio/arktype/issues/970) Narrowing a morph within a single type preserves the type-level morph representation** (`arktype` · [note](#note-970)). `type("string").pipe(...).narrow(...)` was inferred as `of<"foo!", Narrowed>`, losing the morph's input side.

  Fixed on 2.2.8. `T.t` is `(In: string) => Out<"foo!">`, `inferIn` is `string` and `infer` is `"foo!"`, on both 2.2.8 and the featherduster tip. The test the issue calls commented out is enabled at `ark/type/__tests__/narrow.test.ts:144` with that snapshot.

- **[#1069](https://github.com/arktypeio/arktype/issues/1069) Thunk generics in-scope not inferred** (`arktype` · 1 reaction · [note](#note-1069)). A generic defined via thunk in a scope (`orOne: () => $.type("<t>", "t|one")`) failed inference with a circular reference error after 2.0.0-beta.2.

  The test from the issue body runs and typechecks with no errors on 2.2.8 and the featherduster tip under both TS 6.0.3 and tsgo. `bit.t` is exactly `0 | 1` (strict type-equality check), and the runtime json equals `type("0|1").json`.

- **[#1085](https://github.com/arktypeio/arktype/issues/1085) Arkdark breaks syntax highlighting when jsx/tsx templates contain functions ending with `type`** (`arkdark` · [note](#note-1085)). ArkDark's injection grammar matched `fn_name_ends_with_type(` as an ArkType `type(` call, breaking TSX highlighting for the rest of the JSX.

  The definition matcher `([^\)\(\s]+)?(\.)?(type|...)(\()` had no word boundary. `\b` was added in cda83764d ([#1126](https://github.com/arktypeio/arktype/issues/1126), 2024-09-13), and the grammar is identical on main and featherduster (`tsWithArkType.tmLanguage.js`on has it too). Tokenizing the issue's component with Shiki: the pre-[#1126](https://github.com/arktypeio/arktype/issues/1126) grammar scopes `type` inside `fn_name_ends_with_type()` as `entity.name.function.ts` and leaves `</button>` out of a JSX tag. The current grammar's full scope stacks are identical to plain TSX.

- **[#1191](https://github.com/arktypeio/arktype/issues/1191) Add an option to allow `undefined` for optional properties** (`arktype` · 4 reactions · [note](#note-1191)). Request for a global option so optional keys also accept an explicit `undefined` value.

  Implemented in arktype 2.1.12 as `configure({ exactOptionalPropertyTypes: false })` (CHANGELOG 2.1.12), documented under configuration#exactoptionalpropertytypes, as the last commenter pointed out. Verified with the issue's own `{ phoneNumber: "string?" }` on 2.2.8 and the featherduster tip: `{ phoneNumber: undefined }` is accepted with the config and rejected without it. The null-as-absent follow-up is tracked separately in [#1283](https://github.com/arktypeio/arktype/issues/1283).

- **[#1204](https://github.com/arktypeio/arktype/issues/1204) Propagate captured RegExp groups to the output value** (`arktype` · 1 reaction · [note](#note-1204)). Request for regex definitions to output their capture groups instead of only the matched string.

  Shipped in arktype 2.2.0 as the `x`-prefixed regex literal, added in [#1558](https://github.com/arktypeio/arktype/issues/1558) (merged 2025-12-03). It validates the pattern and morphs to the RegExpExecArray, with typed positional and named captures via arkregex (`ark/type/parser/shift/operand/enclosed.ts:72-77`). Both of the issue's examples, `x/^(abc)d$/` and the address pattern, parse, run and type-check on 2.2.8 and the featherduster tip, and plain `/.../` still outputs a string.

- **[#1415](https://github.com/arktypeio/arktype/issues/1415) React Native: TypeError: \_result.isRoot is not a function (it is undefined)** (`schema` · 1 reaction · [note](#note-1415)). On Hermes (Expo/React Native), unions of objects disjoint at a key crashed at startup with `_result.isRoot is not a function`, because `Array.prototype.map` doesn't preserve the `Disjoint` Array subclass in `Disjoint.withPrefixKey`.

  Root cause is exactly the one the last comment patched: `withPrefixKey` returned a plain array under Hermes, so `.isRoot()` was called on it. [#1674](https://github.com/arktypeio/arktype/issues/1674) (commit 066f4f20b, closing [#1645](https://github.com/arktypeio/arktype/issues/1645)) added that guard (`ark/schema/shared/disjoint.ts:103-115`) and shipped in arktype 2.2.7 ('Fix crashes on Hermes and Turbopack'); it is present in 2.2.8 and the featherduster tip. Simulating Hermes by overriding `Disjoint[Symbol.species]`, the issue's union and the `type.match` case from the comments work on both worktrees, while the pre-[#1674](https://github.com/arktypeio/arktype/issues/1674) implementation under the same simulation throws `result.isRoot is not a function`.

- **[#1434](https://github.com/arktypeio/arktype/issues/1434) fn docs** (`docs` · [note](#note-1434)). Write docs and an intro section for `type.fn`.

  Already done: the `### fn` section in ark/docs/content/docs/(arktype)`/expressions/index.mdx` (params, return types, defaults, optionals, variadics, introspection) and the 2.2 blog post landed in 2.2.0 ([#1594](https://github.com/arktypeio/arktype/issues/1594), commit 3ad19d55a). The documented examples run as written on 2.2.8 and the featherduster tip, and https://arktype.io/docs/expressions has the `fn` anchor.

- **[#1483](https://github.com/arktypeio/arktype/issues/1483) declare dont work with optional()** (`arktype` · [note](#note-1483)). declare&lt;User>().type({ age: type("number").optional() }) failed to typecheck against `age?: number`.

  Compiles cleanly on 2.2.8 and the featherduster tip, under both tsgo and TS 6 and with exactOptionalPropertyTypes on or off. A mismatched `type("string").optional()` still errors as expected. Fixed in 2.1.28 ("more flexible `type.declare`": optionality can now be expressed via a property value).

- **[#1514](https://github.com/arktypeio/arktype/issues/1514) `.onUndeclaredKey('delete')` does not work if added before `.pipe()`, on a `type.or()` schema** (`arktype` · [note](#note-1514)). A union with .onUndeclaredKey("delete") followed by .pipe(), used as a property value, didn't delete undeclared keys.

  The issue's exact repro keeps `_meta` on arktype 2.1.22, 2.1.29, 2.2.0, 2.2.3 and 2.2.5 (installed from npm in /tmp). It deletes it on 2.2.6, 2.2.7, 2.2.8 and the featherduster tip. The fix shipped in 2.2.6. Root-level and nested variants (before or after the pipe, no pipe, single branch) all delete the key on 2.2.8 and featherduster.

- **[#1595](https://github.com/arktypeio/arktype/issues/1595) jsonSchemaToType: `{ type: "string", enum: [...] }` throws "Intersection of string and object results in an unsatisfiable type"** (`json-schema` · [note](#note-1595)). jsonSchemaToType threw when `type: "string"` was combined with `enum` because the enum array was treated as a single unit value.

  Reported against @ark/json-schema 0.0.4. Root cause was `type.enumerated(jsonSchema.enum)` (array passed as one value, an object) in `ark/json-schema/common.ts`; fixed by ed541c4fc ([#1566](https://github.com/arktypeio/arktype/issues/1566), `type.enumerated(...jsonSchema.enum)`), first released in @ark/json-schema 0.0.5. All cases from the issue now parse on main (0.0.12) and featherduster.

### Obsolete

These are about removed packages or APIs, plans superseded by other work, or empty TODOs that no longer point at any code.

- **[#318](https://github.com/arktypeio/arktype/issues/318) Look into useExternalStore react 18 hook for @re-/state** (`other`). Empty 2022 maintainer TODO to investigate React 18's useSyncExternalStore for the old @re-/state package.

  @re-/state was abandoned in the pre-2.0 era; no state package exists in either worktree (ark/ has attest, docs, extension, fast-check, fs, json-schema, regex, repo, schema, sets, themes, type, util). Nothing left to apply it to.

- **[#350](https://github.com/arktypeio/arktype/issues/350) Finish State 1.0 initial implementation** (`other`). Empty 2022 maintainer TODO to finish the @re-/state 1.0 implementation.

  Refers to the abandoned pre-2.0 @re-/state package, which no longer exists in the monorepo; superseded by ArkType's focus on validation.

- **[#362](https://github.com/arktypeio/arktype/issues/362) Centralize scripts to new @re-/cli package** (`repo`). Empty 2022 meta TODO to move repo scripts into a @re-/cli package.

  The @re-/ package namespace is gone; repo scripts already live centrally in ark/repo (e.g. `ark/repo/ts.js` used by `pnpm ts`). Stale internal TODO.

- **[#550](https://github.com/arktypeio/arktype/issues/550) Optimize mapped prop intersections** (`schema`). Empty 2022 internal TODO to optimize intersections of mapped (index-signature) props.

  Written against the pre-2.0 type system before the 'refactor: re-type 2.0' rewrite; structure/index intersections have since been reimplemented in @ark/schema and moved to arksets on the featherduster branch. The empty TODO no longer points at any existing code.

- **[#585](https://github.com/arktypeio/arktype/issues/585) Unify AST processing between functional expressions, tuple expression, strings, standardize runtime semantic validation** (`arktype` · [note](#note-585)). Pre-1.0 refactor tracker: unify string/tuple/functional AST handling, add `=` defaults and merge, flat tuple expressions, and static satisfiability checks.

  The tracked refactor happened in 2.0, and no source on either 2.2.8 or the featherduster tip references issues/585. Defaults (`{ a: "number = 5" }`, `["number", "=", 5]`) and merging (`.merge()`, `"..."`) have shipped. Leftovers: flat tuple expressions are a type error but at runtime silently drop the extra operands (`string | false | true`); `type("string&number")` throws "results in an unsatisfiable type" at runtime but is not a type error. Each would be a better-scoped new issue.

- **[#648](https://github.com/arktypeio/arktype/issues/648) Integrate custom parsedDate formats** (`arktype` · [note](#note-648)). Empty pre-1.0 TODO to support custom formats for the old `parsedDate` keyword.

  `parsedDate` no longer exists ("'parsedDate' is unresolvable" on both versions; last touched in the 2.0 rewrite). It was replaced by `string.date.parse`, `string.date.iso.parse` and `string.date.epoch.parse`, all verified working. The issue has no body defining which formats were meant. Specific date-only keywords are requested separately in [#1307](https://github.com/arktypeio/arktype/issues/1307).

- **[#789](https://github.com/arktypeio/arktype/issues/789) Investigate using ArkType for types in JS** (`arktype` · [note](#note-789)). Maintainer idea: no-op ArkType APIs so plain-JS users can type things like function signatures without JSDoc.

  Superseded by `type.fn` (added in 2.2). The 2.2 blog post (ark/docs/content/docs/(arktype)`/blog/2.2.mdx:51`) says it gives fully typed signatures in plain .js files with no JSDoc, and it works on both worktrees. It validates at runtime rather than being a no-op, but it covers the stated goal. Data types already work in JS through `typeof T.infer`.

- **[#949](https://github.com/arktypeio/arktype/issues/949) Check snaps across tsVersions in attest** (`attest` · [note](#note-949)). Check type snapshots against every configured tsVersion, not just the primary one.

  The `tsVersions` option was removed in @ark/attest 0.57.0 ([#1680](https://github.com/arktypeio/arktype/issues/1680), published on npm as the current version): attest analyzes with the single resolved `typescript` and writes one `assertions.js`on, with multiple versions tested via a CI matrix (`ark/attest/CHANGELOG.md`). There is no secondary version left to check snapshots against.

- **[#982](https://github.com/arktypeio/arktype/issues/982) ArkType Drizzle Validators** (`other` · 9 reactions · [note](#note-982)). Request for Drizzle ORM schema-to-ArkType validators, like drizzle-zod.

  Superseded by Drizzle's own integration: `drizzle-arktype` on npm (published 2025-03-28 by the Drizzle team, peer `arktype >=2.0.0`, latest 0.1.3) and `drizzle-orm/arktype` in drizzle-orm 1.0, documented at https://orm.drizzle.team/docs/arktype with createSelectSchema/createInsertSchema/createUpdateSchema. Nothing left to do in this repo.

## Probably close: out of scope or incorrect

### Out of scope

- **[#573](https://github.com/arktypeio/arktype/issues/573) type "safes"** (`arktype`). Idea for boxes/proxies around data that auto-validate every mutation (set/update/proxy setters).

  Mutation-tracking containers are a state-management layer (the abandoned @re-/state direction, cf. [#350](https://github.com/arktypeio/arktype/issues/350)), not validation; the sketch uses APIs that no longer exist (`model.user.box`, `Problems`, `xor`). Users can build it in a few lines on top of `.assert` in a Proxy setter. No demand since 2022.

- **[#769](https://github.com/arktypeio/arktype/issues/769) Support arktype to zod function** (`other` · 2 reactions · [note](#note-769)). Asks for an arktypeToZod converter so ArkType types can use Zod-to-X tooling, chiefly to get JSON Schema output.

  Maintainer already said a Zod converter would never be part of core. The stated motivation (no way to generate JSON Schema) is solved: `.toJsonSchema()` ships in 2.2.8 and works on both worktrees, and JSON-Schema-based converters cover the rest.

- **[#839](https://github.com/arktypeio/arktype/issues/839) Require Regular Expressions without `^$` to have `g` flag** (`arktype` · breaking · [note](#note-839)). Proposes throwing at parse time when a regex has neither ^/$ anchors nor the g flag, to catch accidental partial-match patterns.

  Unanchored matching is 1:1 with JS RegExp.test and with JSON Schema `pattern`, which the spec requires to be unanchored (TizzySaurus's comment). The maintainer's own counterpoint already holds: regex inference now shows the difference (`type("/ab/")` infers `${string}ab${string}`, `/^ab$/` infers "ab" on both worktrees). Requiring `g` would also push users toward a stateful-lastIndex flag. Side finding, a separate unsound-inference bug: unanchored digit patterns drop the `${string}` padding, so `type("/\\d+/")` infers `${number}` while "x1y" validates, on 2.2.8 and featherduster. Cause: `ark/regex/state.ts:743-768` appendNonRedundant/prependNonRedundant merge `${number}` with `string` because `${number}` extends string. Fix: merge only when the suffix/prefix is exactly `${number}` (e.g. `[suffix] extends [`${number}`]`), which type-checks in scratch. It's not filed; related to [#1663](https://github.com/arktypeio/arktype/issues/1663) but distinct.

  _Decision:_ Keep unanchored regexes 1:1 with JS and JSON Schema (close), or add a parse-time error for unanchored patterns?

- **[#1088](https://github.com/arktypeio/arktype/issues/1088) Make `@ark/schema` more resilient to duplicate installations or initializations** (`schema` · effort trivial · 1 reaction · [note](#note-1088)). A morph returning another installed copy's `ArkErrors` is treated as a successful output, because morph results are checked with `instanceof`. Running two copies isn't supported.

  Recognizing another copy's errors by their brand was fixed in 8d6dceecd and reverted in de03d8dee: checking every object a morph returns cost about 5% to 10% per call when one call site sees many output shapes, and up to about 25% for trivial morphs, with no cheaper check found. Instead, precompile is to fail a build that resolves more than one copy of `arktype`, `@ark/schema` or `@ark/util`, and its standalone runtime is to share arktype's error classes. The note recommends a single copy (`npm dedupe`, `overrides`) and gives a workaround in the morph.

- **[#1461](https://github.com/arktypeio/arktype/issues/1461) Allow array of readonly arrays for ArkError** (`schema` · breaking · [note](#note-1461)). Request to let ArkError `path` hold nested arrays so one error can point at several related locations.

  ArkErrors are the Standard Schema issues, whose `path` is a flat `ReadonlyArray<PropertyKey | PathSegment>`; nested arrays would break that contract plus `flatByPath` and path-prefixed messages. The idiomatic approach, one error per path via `ctx.reject({ relativePath })`, works on both 2.2.8 and the featherduster tip (verified, including Standard Schema issue paths).

- **[#1463](https://github.com/arktypeio/arktype/issues/1463) Allow merging of ArkErrors with additional ArkError in pipe** (`arktype` · [note](#note-1463)). Asks for a pipe/business-logic step to run, and add its errors, even when the base object type fails, e.g. by merging in default values so the morph can run on invalid input.

  Morphs and root narrows receive the validated `In` type, so running them on input that failed validation would break their parameter's type. The proposed `withShape` defaults would feed fabricated values into user logic, which goes against the design. Ran on both: a root pipe or narrow only reports `bar must be a number (was missing)`. A narrow placed on the key itself runs regardless of sibling failures and reports both errors, which covers single-field business rules.

- **[#1570](https://github.com/arktypeio/arktype/issues/1570) Jsdoc is lost** (`arktype` · [note](#note-1570)). JSDoc on object-literal definition keys is missing from the `.d.ts` emitted for `type({...})` / `typeof T.infer`.

  Reproduced on both worktrees (emitted ObjectType&lt;{ name: string; age?: number; v?: number }> has no JSDoc with key or value optionality). Plain TS drops JSDoc the same way for any evaluated mapped type (`{ [k in keyof t]: t[k] } & unknown`) while keeping it for identity-inferred literals or un-evaluated alias references, so this is TypeScript's declaration emitter (mapped property symbols have no valueDeclaration to copy comments from), not something ArkType's inference can preserve.

- **[#1616](https://github.com/arktypeio/arktype/issues/1616) Update Jetbrains Plugin** (`other` · [note](#note-1616)). Asks for the ArkType JetBrains plugin to declare compatibility with IDE builds 261.\* (it currently stops at 253.\*).

  The plugin isn't in this repo: the marketplace API for plugin 27099 shows xmlId com.github.niklaswortmann.arktypeideaplugin, vendor Jan-Niklas Wortmann, source https://github.com/niklas-wortmann/arktype-idea-plugin, latest 0.0.5 with since/until 242.0-253.\*. The compatibility bump has to happen in that repo, which has no open issue for it. The arktype docs only link to the plugin (ark/docs/content/docs/(arktype)`/intro/setup.mdx:43-47` on main; `ark/docs/content/docs/intro/setup.mdx` on featherduster).

### Not a bug

In each of these, the behavior is documented or intended, or the report is mistaken.

- **[#1456](https://github.com/arktypeio/arktype/issues/1456) enumerated with single entry gets converted to const in Json Schema** (`json-schema` · [note](#note-1456)). `type.enumerated('foo').toJsonSchema()` emits `const: "foo"`; reporter wants `enum: ["foo"]` for forward compatibility.

  `type.enumerated("foo")` reduces to the same unit node as `type("'foo'")` (`.equals` is true on both worktrees), so there is no enum to preserve, and `const: x` is semantically identical to `enum: [x]` in JSON Schema. Same output on 2.2.8 and the featherduster tip; multi-value enumerations still emit `enum`. A per-type JSON Schema override is tracked separately as [#1571](https://github.com/arktypeio/arktype/issues/1571).

- **[#1462](https://github.com/arktypeio/arktype/issues/1462) toJsonSchema() fails when a field is `string | undefined`** (`schema` · [note](#note-1462)). toJsonSchema() throws ToJsonSchemaError code "unit" for `string | undefined`; a commenter hits the same with `type.enumerated(["first", "sec"])`.

  This is documented. `undefined` has no JSON Schema equivalent, and the configuration docs' Fallback Codes table lists `unit` ("non-serializable `===` reference (e.g. `undefined`)") as a reason toJsonSchema throws by default, configurable through `fallback`. The comment's case is user error: `type.enumerated` is variadic, so passing an array makes a single unit whose value is that array object. `type.enumerated("first", "sec")` emits `{enum: ["first","sec"]}`. Ran on both: same throw, and the fallback workaround works on both.

- **[#1468](https://github.com/arktypeio/arktype/issues/1468) Narrow expressions not executed when type is spread** (`arktype` · [note](#note-1468)). Spreading (`"..."`) a type that has a root `.narrow` drops the narrow, so the merged object never runs it.

  This is documented. The objects docs on 2.2.8 (the "structural transformations" callout, and the merge section at `objects/index.mdx:305`, which is aliased as the spread anchor) say `merge`/spread build a new object from the properties only, so "a root narrow or metadata is not carried over". Reproduced on both with the reporter's scope: spread accepts mismatched passwords. An intersection (tuple `["passwordWithConfirmation", "&", {...}]` in the scope, or `.and()`) keeps the narrow.

- **[#1469](https://github.com/arktypeio/arktype/issues/1469) pattern in configure is not typed** (`arktype` · [note](#note-1469)). `.configure({ pattern })` (and `multipleOf`) is a TS error even though the key is passed through to toJsonSchema output.

  Meta keys outside TypeMeta are rejected unless declared through the documented `ArkEnv.meta()` interface extension (configuration#metadata). With that declaration the call type-checks and the keys pass through to JSON Schema. Verified with tsc and at runtime on both worktrees. Such meta is not validated at runtime (`"ABC"` passes `pattern: "^[a-z]+$"`), so a regex literal is the right tool for `pattern`. A typed `jsonSchema` meta property for arbitrary JSON Schema is the maintainer's own [#1571](https://github.com/arktypeio/arktype/issues/1571).

- **[#1576](https://github.com/arktypeio/arktype/issues/1576) is ArkRegex a drop-in replacement for `new RegExp` even with dynamic patterns?** (`regex` · 1 reaction · [note](#note-1576)). `regex(p)` with a non-literal `string` pattern is a type error. That is by design: `regex()` validates its pattern at the type level, and a pattern that can't be proven valid is rejected. "Drop-in replacement" refers to runtime parity with `new RegExp()`.

  Reproduced on 2.2.8 and featherduster: `regex.parse<string>` is `never`, so `regex(p)` reports TS2345, while `regex.as(p)` and a template with a dynamic part (`regex(`^${p}$`)`, `Regex<string, {}>`) compile. The maintainer confirmed the rejection is intended. The error doesn't say why the pattern was rejected, since the parameter is just `never`.

### Answered questions

Each answer was run on both lines and is in the issue's note.

- **[#908](https://github.com/arktypeio/arktype/issues/908) [Request] Utility for creating unions from object keys** (`arktype` · 4 reactions · [note](#note-908)). Asks for a helper that turns an object's keys (e.g. an enum-label map) into a string-literal union type.

  `type.enumerated(...keys)` already does this in one line with correct inference and errors on both versions, including when nested in an object type. The issue's helper is a workaround for not knowing it.

- **[#1446](https://github.com/arktypeio/arktype/issues/1446) How to properly set up a discriminated union?** (`arktype` · [note](#note-1446)). User asks for a z.discriminatedUnion/v.variant equivalent that statically requires every branch to have the discriminant key.

  ArkType discriminates every union automatically (documented: "All unions are automatically discriminated"); the reporter's ResponseSchema already discriminates on `type` (discriminantJson path ["type"]) and reports "union.type must be \"2\", \"3\" or \"1\"" on both versions. The only missing piece is a static guarantee that each branch has the key, which a one-line type constraint provides; no open issue requests an explicit-key API.

- **[#1447](https://github.com/arktypeio/arktype/issues/1447) Question: Can I detect when a field in an object is from another defined type?** (`arktype` · [note](#note-1447)). User wants to derive a 'flat' variant of a model where fields referencing other defined types become string ids, without maintaining two schemas.

  Inferred types are structural, so there is no way to tell at the type level that a property came from another named Type. The supported pattern is to make the reference representation a generic parameter; verified on both versions that `generic("ref")({ ..., x: "ref[]" })` instantiated with a ref-string type, with X, and with their union gives the variants with correct inference and validation, and that scope generics (`"Z<ref>": { y: { "[string]": "Y<ref>" } }`) extend it to nested models like the issue's Z.

- **[#1450](https://github.com/arktypeio/arktype/issues/1450) When using enum type, it's not possible to specify both default value and description simultaneously.** (`arktype` · 1 reaction · [note](#note-1450)). User wants a default and a description on the same property; tried '@' inside string syntax and inside a default tuple, both throw ParseErrors.

  '@' is only documented in fluent/tuple/args form (ark/docs expressions), never inside a string, so "... = 'auto' @ '...'" throwing "'@' is not allowed here" is intended; a default inside a '@' tuple throws because defaults are only valid as a property's own definition. Nesting the described tuple inside a default tuple `[[def, "@", desc], "=", value]` or chaining `.describe().default()` works on both 2.2.8 and the featherduster tip with exact inference (infer/inferIn) and JSON Schema (description + default). The per-branch description duplication in the body is [#1470](https://github.com/arktypeio/arktype/issues/1470).

- **[#1465](https://github.com/arktypeio/arktype/issues/1465) Producing JsonSchema with discriminator field** (`schema` · [note](#note-1465)). Asks how to emit an OpenAPI `discriminator` (with mapping) on a union and how to emit the branch schemas separately for `$ref`s.

  `.configure(meta, "self")` puts the meta only on the union node, so `discriminator` (including `mapping`) is emitted once at the union root instead of on every branch. Arbitrary meta keys, including the reporter's `name`, can be typed through `ArkEnv.meta()`. Branch schemas can be generated separately with `Person.toJsonSchema()`. Named `$defs` and `$ref`s are tracked in [#1459](https://github.com/arktypeio/arktype/issues/1459) (open PR [#1467](https://github.com/arktypeio/arktype/issues/1467)). The `"$ark.object189"` stringification shown in the issue no longer happens on 2.2.8. Verified on both worktrees, runtime and tsc.

- **[#1518](https://github.com/arktypeio/arktype/issues/1518) How to get correct literals from 'predicate' error ?** (`arktype` · [note](#note-1518)). Usage question: how to get the allowed literal values (e.g. ['a','b','c']) from a failed union-of-literals error instead of parsing `expected`/`message`.

  A discriminated union failure reports code "predicate" with `expected` as a description string (`ark/schema/roots/union.ts:305`). The allowed values aren't stored on the error, but they can be read from the schema at the error's path. `Schema.internal.get(...e.path).select({ kind: "unit" }).map(n => n.unit)` returns ['a','b','c'], verified at runtime and with tsc on 2.2.8 and the featherduster tip.

### Duplicates

- **[#1431](https://github.com/arktypeio/arktype/issues/1431) Error-specific property aliases** (`arktype` · effort medium · 9 reactions · [note](#note-1431)). Let a property declare a display name (e.g. "Date of birth" for `dob`) used in error messages instead of the key.

  Same request as the older open [#1418](https://github.com/arktypeio/arktype/issues/1418) "Alias for object property names to be shown in error messages" (from @stuartbritt, very likely the Discord user quoted here), which has the full motivation and a proposed `alias` meta. Combined demand is 12 thumbs-up (9 here, 3 on [#1418](https://github.com/arktypeio/arktype/issues/1418)). A per-value `message` workaround runs on both 2.2.8 and featherduster but doesn't cover missing-key errors, which the parent object reports. [#1413](https://github.com/arktypeio/arktype/issues/1413) is different (input key aliases).

  Duplicate of [#1418](https://github.com/arktypeio/arktype/issues/1418) (Alias for object property names to be shown in error messages).

- **[#1580](https://github.com/arktypeio/arktype/issues/1580) Optional object index signatures do not work.** (`arktype` · [note](#note-1580)). `"[Locales]?": "string"` should expand to optional literal props (like TS `{ [K in Locales]?: string }`) but is parsed as a literal optional key `[Locales]`; secondary report: a piped key `string.lower |> "en"|...` in an index signature doesn't behave as expected.

  Main report is the same as open [#1525](https://github.com/arktypeio/arktype/issues/1525) (same `[K]?` syntax, maintainer already explained it parses as a literal key and kept [#1525](https://github.com/arktypeio/arktype/issues/1525) open; the reporter also posted the mapped-type proposal there). Repro on both worktrees: expression `{ [Locales]?: string }`, `{ en: 5 }` passes. Secondary piped-key part is [#817](https://github.com/arktypeio/arktype/issues/817) (Morph keys): the signature's morph is never applied and the key check uses the morph's input, so every string key matches (`{ fr: 5 }` -> `fr must be a string (was a number)`) on both 2.2.8 and featherduster.

  Duplicate of [#1525](https://github.com/arktypeio/arktype/issues/1525) (Add type error to optional index signature expression like `[sizes]?`).

- **[#1624](https://github.com/arktypeio/arktype/issues/1624) Tuple morph with un-annotated parameter infers `.infer` as `never` when the return depends on that parameter** (`arktype` · effort unknown · [note](#note-1624)). Inside `scope()`, a `[In, "=>", fn]` morph whose parameter is contextually typed and whose return depends on it infers output `never`.

  Reproduces on 2.2.8 and the featherduster tip with both TS 7 and TS 6, for alias, inline-object, keyword and tuple inputs (`["string", "=>", s => s.length]`, `[["string"], "=>", d => d]`). The same tuple passed to `type()` or the `.pipe()` form infers correctly, and runtime is correct. It's the same scope tuple-expression inference bug as the maintainer's open [#577](https://github.com/arktypeio/arktype/issues/577) (2023), which already includes the `{ a: "number" }` example from [#1034](https://github.com/arktypeio/arktype/issues/1034); the keyword/tuple cases [#577](https://github.com/arktypeio/arktype/issues/577) listed as working now also collapse.

  Duplicate of [#577](https://github.com/arktypeio/arktype/issues/577) (Fix scope tuple expression functional inference).

## Needs info

- **[#1508](https://github.com/arktypeio/arktype/issues/1508) Starting with version arktype@2.1.21 svelte-check fails with memory related error** (`arktype` · effort unknown · 1 reaction). svelte-check runs out of heap after upgrading arktype 2.1.20 -> 2.1.21 in a SvelteKit project; no repro provided, one +1.

  No code or project to reproduce. The 2.1.20..2.1.21 library diff is tiny: BaseRoot now implements StandardSchemaV1.WithJSONSchemaSource and adds a `~standard.toJSONSchema` converter (`ark/schema/roots/root.ts`, `shared/standardSchema.ts`), plus comment typo fixes. The maintainer suspects duplicate arktype installs being compared structurally. Can't be assessed without a minimal project.

- **[#1581](https://github.com/arktypeio/arktype/issues/1581) `arktypeio.arkdark` syntax highlighting does not close strings in `type()` calls** (`arkdark` · effort unknown · [note](#note-1581)). In VS Code `typescript` mode (not `typescriptreact`), a JSDoc comment after a `type()` call with quotes/backticks loses comment highlighting and later strings appear unclosed.

  Tokenized the exact repro with the extension's injection grammar (`ark/extension/injected.tmLanguage.js`on, v6.6.0, identical on main and featherduster) injected into the exact `TypeScript.tmLanguage.js`on / `TypeScriptReact.tmLanguage.js`on shipped in code-oss 1.107.1 (the reporter's version) via shiki 3.13's vscode-textmate: the JSDoc line is `comment.block.documentation.ts`, the `type(...)` embed closes at `)`, and `Thing.from('')` gets a closed `string.quoted.single.ts` in both modes. Doesn't reproduce outside the reporter's editor; another extension/grammar may be involved, so a scope inspection or an extension-bisect from the reporter is needed. (The built-in-theme screenshots don't exonerate the extension: its grammar injection is active regardless of color theme.)

## Relevant features

These are the requests worth keeping. They are grouped by package and ordered by reactions. Where a feature needs a design call before work can start, the entry ends with the decision.

### `arktype`

- **[#810](https://github.com/arktypeio/arktype/issues/810) Precompilation** (`arktype` · effort large · 29 reactions). Emit ArkType's JIT-compiled validators at build time to eliminate runtime compilation/startup cost.
- **[#831](https://github.com/arktypeio/arktype/issues/831) Index access expressions** (`arktype` · effort medium · 14 reactions · [note](#note-831)). Support TS-style index access in string syntax (`"base['foo']"`, `"base.bar"`), including generic `base[t]` with `t extends keyof base`.

  _Decision:_ Bracket form only, or also `base.key` dot form despite its overlap with submodule access?

- **[#491](https://github.com/arktypeio/arktype/issues/491) Template literal** (`arktype` · effort large · 10 reactions · [note](#note-491)). Request for TS-style template literal string syntax (e.g. "`a${string}z`[]") compiling to a regex, ideally composing other types/aliases.

  _Decision:_ Which types may be embedded in `${}` (only regex-representable ones?), and should captures be exposed in the output (cf. [#1204](https://github.com/arktypeio/arktype/issues/1204))?

- **[#909](https://github.com/arktypeio/arktype/issues/909) Support two-way serialization/deserialization** (`arktype` · effort large · 9 reactions). Request for bidirectional codecs: a type that can both decode (parse) and encode (serialize) a value, e.g. LocalDate &lt;-> "2024-01-01", composable across nested types.

  _Decision:_ Build bidirectional codecs into core now, or only as sugar over the n-variant type graph described in [#574](https://github.com/arktypeio/arktype/issues/574)?

- **[#775](https://github.com/arktypeio/arktype/issues/775) Type aware serializers and deserializers** (`arktype` · effort large · 7 reactions). Asks for type-specific generated serializers/deserializers that handle circular references and validate while deserializing.

  _Decision:_ Is type-directed data serialization (including cyclic data) in scope for ArkType, or should it go under [#909](https://github.com/arktypeio/arktype/issues/909)'s morph/codec direction or be closed?

- **[#1498](https://github.com/arktypeio/arktype/issues/1498) Official i18n recommendation** (`arktype` · effort medium · 7 reactions). Maintainer TODO: decide on and document an official way to translate ArkType error messages (integrating with i18next or similar, like zod-i18n).

  _Decision:_ Recommend a docs-only recipe built on existing per-code config functions, or add a first-class locale/translation API?

- **[#611](https://github.com/arktypeio/arktype/issues/611) Catch transformations (morphs for problem results)** (`arktype` · effort medium · 5 reactions · [note](#note-611)). Add a zod-style `.catch(fallback)` that returns a fallback value (or the result of a handler given the errors) when validation fails.

  _Decision:_ Should `.catch` widen the input to `unknown` (zod 3) or keep the original input type (zod 4), and should it take a value, a handler receiving the errors, or both?

- **[#808](https://github.com/arktypeio/arktype/issues/808) readonly prefix operator for key, string and tuple definitions** (`arktype` · effort medium · possibly breaking · 5 reactions). Add a `readonly` operator in string (`"readonly string[]"`), tuple (`["readonly", {...}]`) and per-key (`"readonly a"`) syntax, possibly with optional Object.freeze.

  _Decision:_ Add only the string/tuple operator, or also the `"readonly key"` prefix, which changes the meaning of keys currently parsed literally as `readonly x`?

- **[#1054](https://github.com/arktypeio/arktype/issues/1054) Default values for generic parameters** (`arktype` · effort medium · 3 reactions). Support TS-style defaulted generic params (`type("<t = unknown>", "t[]")`, `"array<t = unknown>"` in scopes) so trailing args can be omitted; also give builtins like Set/Map/Array defaults.
- **[#1283](https://github.com/arktypeio/arktype/issues/1283) Allow null to be treated as not-present for optional fields** (`arktype` · effort medium · 3 reactions). Let optional keys treat certain values (null from pydantic JSON, empty strings from forms) as if the key were absent, configurable per key or globally.

  _Decision:_ What should the API be: per-key, global config, or both? Should it be limited to null or accept arbitrary values such as ""? Should a matched key be deleted from the output or kept as undefined?

- **[#1334](https://github.com/arktypeio/arktype/issues/1334) Additional match utilities** (`arktype` · effort medium · 3 reactions). Maintainer's wishlist for match: opt-in runtime exhaustiveness (e.g. default: "exhaustive"), a matcher over a record of string literals, and .out to constrain the return type.

  _Decision:_ What should "exhaustive" mean at runtime: assert that the cases' union covers the `in` type at definition time, or throw on unmatched input?

- **[#462](https://github.com/arktypeio/arktype/issues/462) arktype dedicated Promise handling** (`arktype` · effort large · possibly breaking · 2 reactions · [note](#note-462)). Request for first-class async morphs: validation that awaits Promise-returning morphs (including nested ones) and reports their errors, e.g. for Astro's Standard Schema image transforms.

  _Decision:_ Should async morphs be supported, with Standard Schema `validate` returning a Promise for types containing one, or should the FAQ's 'handle it as a promise on the output' stance stand?

- **[#1424](https://github.com/arktypeio/arktype/issues/1424) String-embeddable object/tuple syntax** (`arktype` · effort large · 2 reactions). Allow object/tuple literals inside string definitions, e.g. `"{foo: string}[]"`.

  _Decision:_ Is string-embedded object/tuple syntax worth the parser and type-level complexity (and TS perf cost), given you'd not recommend it as a default?

- **[#762](https://github.com/arktypeio/arktype/issues/762) Add a decorator-based API for type** (`arktype` · effort large · 1 reaction). Empty 2023 TODO for a class/decorator-based way to define types (class-validator style).

  _Decision:_ Is a decorator/class-based definition API still in scope, or should this be closed as out of scope?

- **[#791](https://github.com/arktypeio/arktype/issues/791) Declared scopes** (`arktype` · effort medium · 1 reaction). Add declare&lt;{...}>().scope/module so a whole scope can be checked against expected TS types, with alias autocomplete and explicit cyclic interface declarations.
- **[#925](https://github.com/arktypeio/arktype/issues/925) Support for `!=` bound operator** (`arktype` · effort small · 1 reaction). Add a `!=` (or `<>`) comparator so e.g. `number.integer != 0` expresses a non-zero number.

  _Decision:_ Compile `!=` to a union of exclusive bounds, or add an inequality/negation constraint ([#815](https://github.com/arktypeio/arktype/issues/815)) for a dedicated error message?

- **[#1542](https://github.com/arktypeio/arktype/issues/1542) Feature Request: Public API for Introspecting Constraints** (`arktype` · effort medium · 1 reaction). Request stable public getters on Type (getAtLeast/getMoreThan/getMaxLength/getPattern/getMin/getMax...) instead of reading `select({ kind })` node internals.

  _Decision:_ Should constraint introspection be a stable public API, and if so as per-constraint getters on Type or as one structured summary object (and how should it treat unions/morphs)?

- **[#1554](https://github.com/arktypeio/arktype/issues/1554) meta key** (`arktype` · effort small · possibly breaking · 1 reaction). Maintainer TODO: support an `"@"` key in object literals for attaching top-level metadata (e.g. description) to the object type.

  _Decision:_ Reserve the `"@"` key (literal "@" keys then need `\\@` escaping), and should its value accept only a meta object or also a description string?

- **[#1556](https://github.com/arktypeio/arktype/issues/1556) allow object spread operator to accept multiple args via a tuple** (`arktype` · effort small · 1 reaction). Maintainer TODO: let `"..."` accept a tuple of object types to spread several at once.
- **[#1560](https://github.com/arktypeio/arktype/issues/1560) support Standard JSON Schema for compliant definitions** (`arktype` · effort medium · 1 reaction). Maintainer TODO: when a Standard Schema definition (e.g. a zod object) also implements `~standard.jsonSchema`, use it for the wrapping arktype type's toJsonSchema output.

  _Decision:_ Should this ride on a general `jsonSchema` meta property ([#1571](https://github.com/arktypeio/arktype/issues/1571)), and how are the converter's `target`/io options mapped from toJsonSchema's options?

- **[#485](https://github.com/arktypeio/arktype/issues/485) Allow relative references for constraints (e.g. "string==./repeatPassword")** (`arktype` · effort medium · [note](#note-485)). Proposed string syntax for constraints that reference a sibling value by relative path, e.g. password confirmation equality.

  _Decision:_ Is relative-path constraint syntax worth adding given `.narrow` already covers cross-field checks, or should this close?

- **[#497](https://github.com/arktypeio/arktype/issues/497) TypeOf utility for extracting optionally narrowed types from data** (`arktype` · effort medium). Empty maintainer placeholder (originally titled "Data to definition?") for a utility deriving a Type from a sample value, either widened (`{a: number}`) or narrowed (`{a: 5}`).

  _Decision:_ Keep this as a feature (data-to-Type inference) or close it as a stale placeholder?

- **[#568](https://github.com/arktypeio/arktype/issues/568) Contextual definitions** (`arktype` · effort large). Idea for definitions with per-context variants (e.g. server vs app) selected by a scope-level context setting.

  _Decision:_ Keep this as a feature, or close it as covered by generics/separate scopes?

- **[#574](https://github.com/arktypeio/arktype/issues/574) Add "traits" as named sets of morphs, maybe other properties** (`arktype` · effort large). Placeholder for attaching named morphs (graph edges like serialize/deserialize) to a type.

  _Decision:_ What is the API shape for named morph sets, and should it subsume [#909](https://github.com/arktypeio/arktype/issues/909)/[#775](https://github.com/arktypeio/arktype/issues/775) (codecs/serializers)?

- **[#584](https://github.com/arktypeio/arktype/issues/584) Mapped types** (`arktype` · effort large · [note](#note-584)). Mapped-key syntax like { "[K in index]": ... } where a value can depend on its key (proposed with pre-1.0 traversal types); the finite-record half already works.

  _Decision:_ Add a `[K in X]` mapped-key syntax with key-dependent values, or close given that `.map()` covers it at runtime?

- **[#588](https://github.com/arktypeio/arktype/issues/588) Allow arbitrary types to be compared using a length prop** (`arktype` · effort medium · [note](#note-588)). Allow length bounds (e.g. `Function > 1`, `.atLeastLength`) on any type with a `length` property, not only strings and arrays.

  _Decision:_ Is length-bound syntax on arbitrary objects worth adding, given that `.and({ length: "number > 1" })` already expresses it, or should this be closed?

- **[#785](https://github.com/arktypeio/arktype/issues/785) Extensible ambient scope resolutions** (`arktype` · effort medium). Empty-body maintainer TODO, apparently about letting users add their own aliases to the ambient (global keyword) scope.

  _Decision:_ Is a user-extensible global keyword scope still wanted, or should this empty TODO be closed?

- **[#818](https://github.com/arktypeio/arktype/issues/818) Explore recreating definitions from nodes** (`arktype` · effort large). Unparse a node back into a canonical, scope-aware ArkType definition, for converting from other formats and for round-trip property tests with fast-check.

  _Decision:_ Pursue canonical ArkType-syntax unparsing, or settle on `toJson`/`type.schema` ([#1569](https://github.com/arktypeio/arktype/issues/1569)) as the supported serialization?

- **[#827](https://github.com/arktypeio/arktype/issues/827) Compile to HTML validation constraints** (`arktype` · effort medium). Generate HTML form validation attributes (required, min/max, minlength/maxlength, pattern, step) from a Type for form integrations.

  _Decision:_ Should this ship in core, or be left to form libraries consuming `toJsonSchema()`?

- **[#850](https://github.com/arktypeio/arktype/issues/850) Investigate autocompleting index signatures** (`arktype` · effort medium). Maintainer TODO to offer string-definition completions inside index-signature keys like `"[str"` in object literals.
- **[#1014](https://github.com/arktypeio/arktype/issues/1014) Add custom Date keywords like `now`** (`arktype` · effort medium · [note](#note-1014)). Support a dynamic `now` bound in date expressions, e.g. type("Date &lt; now"), evaluated at validation time.

  _Decision:_ Should `now` be a dynamic bound evaluated per validation (opaque to intersection/reduction/JSON Schema), or not supported at all in favor of .narrow?

- **[#1053](https://github.com/arktypeio/arktype/issues/1053) Allow generic constraints referencing other generic parameters** (`arktype` · effort medium). Allow a generic parameter's constraint to reference earlier parameters, e.g. `<t, k extends keyof t>`.
- **[#1119](https://github.com/arktypeio/arktype/issues/1119) withIn/withOut methods for constraining one side of a morph ** (`arktype` · effort medium). Maintainer proposal for chainable .withIn(mapIn)/.withOut(mapOut) methods that constrain a morph's input or output without re-intersecting/re-piping from scratch.

  _Decision:_ How should withIn/withOut map over a type whose input is a union of morph branches: apply the callback per branch or to the whole input?

- **[#1166](https://github.com/arktypeio/arktype/issues/1166) Size constraint on File** (`arktype` · effort medium · [note](#note-1166)). Request for range-bound syntax on File (e.g. `File < 5MB`) to constrain file size.

  _Decision:_ Should File bounds support unit suffixes (KB/MB, 1000-based vs KiB 1024-based), or only raw byte counts?

- **[#1265](https://github.com/arktypeio/arktype/issues/1265) Allow bigints as a comparator operand** (`arktype` · effort medium). Support range constraints on bigint (`bigint > 10` / `bigint > 10n`, plus moreThan/atLeast etc.) with the same semantics as number ranges.

  _Decision:_ Should a bigint bound be written `bigint > 10n`, `bigint > 10`, or either, and are mixed number/bigint bounds allowed?

- **[#1307](https://github.com/arktypeio/arktype/issues/1307) Allow more specific "date" keywords** (`arktype` · effort small · [note](#note-1307)). Request a date-only string keyword (RFC 3339 full-date, YYYY-MM-DD) distinct from date-time, to mirror Swagger/OpenAPI `date` vs `date-time` formats.

  _Decision:_ What should the date-only and date-time keywords be named (e.g. string.date.iso.date / string.date.iso.datetime vs string.date.only), and should they reject calendar-invalid dates like 2017-02-30?

- **[#1338](https://github.com/arktypeio/arktype/issues/1338) add `json` and `json.stringify` keywords** (`arktype` · effort small · [note](#note-1338)). Asks for top-level `json` (any JSON-serializable value, primitives included, rejecting anything not assignable to Json) and `json.stringify` keywords, distinct from `object.js`on.

  _Decision:_ Should top-level `json` accept primitives (i.e. be `intrinsic.js`onData), should it live in `ts.ts` next to `object.js`on or as its own module, and does it wait on [#1337](https://github.com/arktypeio/arktype/issues/1337)'s plain-object policy?

- **[#1361](https://github.com/arktypeio/arktype/issues/1361) Scope Without Primitive Types** (`arktype` · effort medium · [note](#note-1361)). Asks for a scope/type factory that exposes only JSON-Schema-representable keywords (no ambient intrinsics), possibly per LLM provider, so unsupported constructs are rejected at definition time.

  _Decision:_ Should scopes support opting out of (or replacing) the ambient keyword set, and should JSON-Schema-only validation be left to toJsonSchema()?

- **[#1413](https://github.com/arktypeio/arktype/issues/1413) [Request a feature] Support for Field Aliases in ArkType Validation** (`arktype` · effort large). Request for Pydantic-style key aliases: read a property from a different (or one of several) input key(s) and output it under the declared key, e.g. `type("string").fromKey("name")`.

  _Decision:_ Is input-key aliasing/renaming something ArkType should support natively in object definitions, or should it stay a `.pipe` concern?

- **[#1454](https://github.com/arktypeio/arktype/issues/1454) can we choose fields for .partial() and .required()?** (`arktype` · effort small · [note](#note-1454)). Request for key-selective `.partial(...keys)` / `.required(...keys)` (like Zod's partial mask) instead of all-or-nothing.

  _Decision:_ Add key arguments to partial()/required() (Zod-style), or keep the surface minimal and point to omit/pick/merge or map()?

- **[#1490](https://github.com/arktypeio/arktype/issues/1490) Export a `TerminalObject` utility** (`arktype` · effort trivial). Maintainer TODO: export a public type for ArkType's set of terminally-inferred objects (Date, Promise, etc.), the objects that inference doesn't expand, so users can reuse or extend it in their own type transforms.

  _Decision:_ Is exporting the existing union enough, given that extension already works through `ArkEnv.prototypes()`, or does the Discord request need something more?

- **[#1512](https://github.com/arktypeio/arktype/issues/1512) string.uuid infer type** (`arktype` · effort trivial · possibly breaking · [note](#note-1512)). Asks for string.uuid (and its v1-v8 variants) to infer a template literal like node:crypto's UUID (`${string}-${string}-${string}-${string}-${string}`) instead of string.

  _Decision:_ Should fixed-shape string keywords like string.uuid infer a template literal instead of string, given that a plain `string` would then no longer be assignable to the inferred type?

- **[#1525](https://github.com/arktypeio/arktype/issues/1525) Add type error to optional index signature expression like `[sizes]?`** (`arktype` · effort small · breaking · [note](#note-1525)). `"[k]?"` keys are silently parsed as a literal optional key named "[k]"; the maintainer kept this open to add a type error for that key form, and later commenters ask for it to expand finite index keys into optional props instead (like TS `[K in Locales]?`).

  _Decision:_ Should `"[k]?"` throw, requiring an escape for a literal key, or should finite index keys expand to optional props like TS `{ [K in Locales]?: V }`?

- **[#1591](https://github.com/arktypeio/arktype/issues/1591) Infer for modules/scopes** (`arktype` · effort small · [note](#note-1591)). Asks for a built-in way to get the inferred types of every export of a module/scope at once (like a mapped `InferModule<typeof M>`); also notes go-to-definition doesn't work on scope-resolved types.

  _Decision:_ Should this be a standalone type helper (e.g. `type.infer<typeof Mod>` / `Module.infer<...>`) or a phantom property on Module/Scope, given property names can collide with alias names?

- **[#1607](https://github.com/arktypeio/arktype/issues/1607) Support for Ordered Unions and/or Matchers as types** (`arktype` · effort large · [note](#note-1607)). Asks for an ordered (first-match) union, e.g. allowing a `match` matcher as a type or a `type.firstMatch`, to avoid the indeterminate morph-union ParseError when the user knows which branch should win.

  _Decision:_ Should ArkType support ordered (first-match) unions at all, and if so as `match`-as-definition, a new `type.firstMatch`, or an option on `.or`?

- **[#1621](https://github.com/arktypeio/arktype/issues/1621) Add string.boolean.parse keyword** (`arktype` · effort small · [note](#note-1621)). Requests `string.boolean` / `string.boolean.parse` keywords (validate "true"|"false", morph to boolean), mirroring string.integer.parse / string.numeric.parse, so it can be expressed in a pure string definition.

  _Decision:_ Should `string.boolean` accept only "true"/"false" (case-sensitive), or also forms like "1"/"0" and other casings?

- **[#1627](https://github.com/arktypeio/arktype/issues/1627) [feature request] Validate while ignoring constraints (structure-only comparison)** (`arktype` · effort medium · [note](#note-1627)). Requests a way to derive a structure-only Type from a constrained one (drop length, range and similar constraints), or an `allows`-like check that skips constraints, so one definition serves both lenient response parsing and strict form validation.

  _Decision:_ Is a public constraint-stripping method wanted, and which kinds does it drop (are narrow predicates and patterns structure or constraints)?

- **[#1661](https://github.com/arktypeio/arktype/issues/1661) Allow non-empty array literal defaults in string syntax** (`arktype` · effort medium). Accept unit-literal array defaults after `=` in string syntax (e.g. "string[] = ['localhost']"), cloned per traversal like `= []`.

  _Decision:_ Should string syntax grow array-literal default values at all (and if so, unit literals only), or should non-empty array defaults stay limited to the thunk/`.default()` forms, possibly folded into [#1424](https://github.com/arktypeio/arktype/issues/1424)'s embedded-literal work?

### `schema`

- **[#1418](https://github.com/arktypeio/arktype/issues/1418) Alias for object property names to be shown in error messages** (`schema` · effort medium · 3 reactions · [note](#note-1418)). Request for property-label metadata (e.g. `dob` -> "Date of Birth") that replaces the path in default error messages without fully custom messages.

  _Decision:_ How is the label specified (meta key name, on the value vs. the prop) and does it replace only the last path segment or the whole path?

- **[#1459](https://github.com/arktypeio/arktype/issues/1459) Allow to use `$ref` for json schema generation** (`schema` · effort medium · 1 reaction · [note](#note-1459)). Request to emit `$ref`s (with user-chosen paths) for reused subtypes in toJsonSchema instead of inlining them.

  _Decision:_ Should `$defs` names come from user meta (a `defId`-style key as in [#1467](https://github.com/arktypeio/arktype/issues/1467)) or scope alias names, and should refs to locations outside the generated document be supported (e.g. via [#1571](https://github.com/arktypeio/arktype/issues/1571)'s `jsonSchema` meta)?

- **[#1538](https://github.com/arktypeio/arktype/issues/1538) Globally configure format of error messages.** (`schema` · effort small · 1 reaction · [note](#note-1538)). Request a single top-level `configure({ actual: ... })` (and presumably expected/problem/message) that applies to every error kind, e.g. to drop `(was ...)` project-wide.

  _Decision:_ Should a top-level error config (expected/actual/problem/message) apply as a default across all error codes, with per-kind config taking precedence?

- **[#924](https://github.com/arktypeio/arktype/issues/924) Use the result with the shortest path when finalizing errors for a cyclic value** (`schema` · effort medium · 1 reaction · [note](#note-924)). For cyclic data validated by a cyclic type, report each error only at the shortest path the invalid object is reached at, instead of the first (longer) path.

  _Decision:_ Is the shortest path worth a second traversal in order of path length? featherduster had one (62dc7f1ce, 009f43a74) and removed it, since only shared or cyclic data, which JSON can't express, reaches it.

- **[#751](https://github.com/arktypeio/arktype/issues/751) Collapse common parts of union** (`schema` · effort medium · possibly breaking · [note](#note-751)). Reduce unions of structures that differ in exactly one key ({ a: string } | { a: number } -> { a: string | number }) and adjacent ranges (1&lt;n&lt;10 | 10&lt;=n&lt;100 -> 1&lt;n&lt;100).

  _Decision:_ Is canonicalizing these unions worth the reduction cost and the changed expressions/JSON/discrimination shapes?

- **[#786](https://github.com/arktypeio/arktype/issues/786) Discriminate based on key presence if keys are strict** (`schema` · effort medium · possibly breaking). Discriminate unions of objects that reject undeclared keys by which key is present, e.g. {a: string} | {b: string} with onUndeclaredKey("reject").
- **[#815](https://github.com/arktypeio/arktype/issues/815) Negated types** (`schema` · effort large). Add negated types (e.g. a `!` operator / `.not()`) that are fully reducible in intersections and comparable to other types.

  _Decision:_ Full reducible negation node in the set algebra, or a shallow predicate-based `.not()` that does not participate in reduction?

- **[#817](https://github.com/arktypeio/arktype/issues/817) Morph keys** (`schema` · effort medium · possibly breaking · [note](#note-817)). Allow morphs as index signature keys so keys are transformed (input `{a: string}` -> output `{b: string}`).

  _Decision:_ Support transformed keys, or reject morph signatures at runtime to match the existing type error?

- **[#853](https://github.com/arktypeio/arktype/issues/853) Reduce regex intersections** (`schema` · effort large · possibly breaking). Type-system TODO: reduce/compare regex patterns (e.g. intersect DFAs) so disjoint patterns reduce to never and subpattern assignability is detected.
- **[#867](https://github.com/arktypeio/arktype/issues/867) Add runtime depth-limit for validation** (`schema` · effort medium · possibly breaking · [note](#note-867)). Asks for a validation depth limit, so that input whose getter builds a new value of the cyclic type at every level can't hang validation.

  _Decision:_ Should over-deep input produce an ArkError through a new depth-limit config option, or is a thrown RangeError acceptable for pathological input?

- **[#899](https://github.com/arktypeio/arktype/issues/899) Support static config for custom error codes** (`schema` · effort medium). Let users register custom error codes and their context shape globally (via a declaration-merged interface) so `ctx.reject`/error APIs type-check custom codes.
- **[#1298](https://github.com/arktypeio/arktype/issues/1298) Consider checking array children when minLength/maxLength fails for non-tuples** (`schema` · effort small · possibly breaking). When a length constraint on a variadic array fails, element errors aren't reported because traversal stops at the first failing level; the reporter (a form library) wants element errors too, as Zod/Valibot report.

  _Decision:_ Should a failed length constraint on a non-tuple array still traverse and report element errors, breaking the stop-at-first-failing-level rule used everywhere else?

- **[#1322](https://github.com/arktypeio/arktype/issues/1322) `expression` variant that preserves aliases** (`schema` · effort medium). Asks for a variant of .expression, or a scope-level `.d.ts`-style declarations output, that prints named aliases by name instead of inlining their resolved structure.

  _Decision:_ Should this be a standalone Type option (opaque aliases in .expression), a Scope method that emits declarations, or both?

- **[#1403](https://github.com/arktypeio/arktype/issues/1403) Add dedicated error code for undeclared key** (`schema` · effort small · breaking · [note](#note-1403)). Undeclared-key rejections ("+": "reject") are reported as code "predicate" with expected "removed"; the request is for a dedicated code so they can be customized separately.

  _Decision:_ What should the code be named, and is changing these errors' `code` from "predicate" acceptable as a breaking change?

- **[#1491](https://github.com/arktypeio/arktype/issues/1491) Fully discriminate literal unions nested in properties** (`schema` · effort medium · possibly breaking · [note](#note-1491)). A union whose discriminant property is itself a union of literals (tag: '"b" | "c"') is not discriminated, so errors list every branch's other props instead of saying the discriminant is missing/invalid.
- **[#1569](https://github.com/arktypeio/arktype/issues/1569) Serializability** (`schema` · effort medium). Maintainer TODO: make round-tripping a Type through its serialized node JSON (`T.json` -> `type.schema`) a supported public API, with clear errors for non-serializable constraints.

  _Decision:_ Should the public serialization format be the existing node JSON (`.json`) or a canonical definition ([#818](https://github.com/arktypeio/arktype/issues/818)), and what should happen to non-serializable constraints (throw vs. registry reference)?

- **[#1571](https://github.com/arktypeio/arktype/issues/1571) add jsonSchema metadata property** (`schema` · effort small). Add a `jsonSchema` meta property whose value is returned as the node's JSON Schema by `toJsonSchema` / Standard JSON Schema.

  _Decision:_ Should `jsonSchema` replace the generated schema or merge into it, and should `configure` avoid propagating it to shallow child nodes?

- **[#1613](https://github.com/arktypeio/arktype/issues/1613) Improve `unordered union` error message** (`schema` · effort small · [note](#note-1613)). Asks for the indeterminate morph-union ParseError to name the type/field involved, since its Left/Right descriptions can be identical and don't locate the problem.

  _Decision:_ Should this ParseError carry key-path context (re-thrown while parsing object literals) in addition to a better overlap description?

### `attest`

- **[#1016](https://github.com/arktypeio/arktype/issues/1016) Add a type.is method to attest that will statically assert bidirectional equality** (`attest` · effort small · 8 reactions). Add `attest(x).type.is<T>()` that statically (in the editor) asserts exact bidirectional type equality, not only in attest's runtime type analysis.
- **[#1093](https://github.com/arktypeio/arktype/issues/1093) Migrate attest inline snapshotting to a new `@ark/snap` package** (`attest` · effort medium · 1 reaction). Extract attest's inline object-literal snapshotting into a standalone `@ark/snap` package usable from other test frameworks without type assertions.

  _Decision:_ Is a standalone `@ark/snap` package still wanted, given snapshot call-site lookup now has to work with both the TS 6 server and TS 7?

- **[#1128](https://github.com/arktypeio/arktype/issues/1128) Attest Bun support** (`attest` · effort medium · 1 reaction · [note](#note-1128)). Officially support running @ark/attest under Bun. It was originally blocked by @prettier/sync failing in Bun.

  _Decision:_ Should Bun support be official while TS 7's API client depends on Node-internal `_handle.fd`, e.g. TS 6 only under Bun, or wait for upstream?

- **[#917](https://github.com/arktypeio/arktype/issues/917) Repo-wide typechecking option during attest setup** (`attest` · effort small). Add an attest setup option that fails fast on any TypeScript error in the analyzed project, so CI doesn't need a separate typecheck before tests.
- **[#964](https://github.com/arktypeio/arktype/issues/964) Generate TS error description in attest when comparing types** (`attest` · effort medium). When an attest type comparison fails, show the TS assignability diagnostic (stored in `typescript.js`on) alongside the string diff.
- **[#1270](https://github.com/arktypeio/arktype/issues/1270) attest: add option to normalize property/union order when serializing types** (`attest` · effort medium). Add a normalized type-snapshot option (e.g. `.type.toString.normalizedSnap`) that sorts properties and union members, so snapshots stay stable when TS changes print order.

### `arkdark`

- **[#989](https://github.com/arktypeio/arktype/issues/989) ArkDark Neovim Plugin** (`arkdark` · effort medium · 39 reactions · [note](#note-989)). Ship ArkType embedded syntax highlighting for Neovim (thread also asks for JetBrains and Zed).

  _Decision:_ Adopt or link the community tree-sitter-arktype grammar for Neovim, or build an official plugin?

- **[#1599](https://github.com/arktypeio/arktype/issues/1599) Zed extension** (`arkdark` · effort medium · 2 reactions · [note](#note-1599)). Asks for a Zed editor extension equivalent to ArkDark.

  _Decision:_ Should ArkType maintain editor integrations beyond VS Code (Zed, Neovim, JetBrains), or leave them to community packages?

### `other`

- **[#1357](https://github.com/arktypeio/arktype/issues/1357) Add TypeScript generate for Schema Serialization** (`other` · effort medium). Request to serialize a Type (e.g. its .in) to valid TypeScript declarations, with descriptions as JSDoc and named refs/scopes as separate type aliases, for LLM prompting.

### `util`

- **[#1448](https://github.com/arktypeio/arktype/issues/1448) Possibly a bug with `string.numeric`** (`util` · effort trivial · possibly breaking · [note](#note-1448)). string.numeric rejects exponent notation like "5.7153e-10"; the reporter expected it to be accepted.

  _Decision:_ Should string.numeric (and so string.numeric.parse) accept exponent notation like "1e3", widening what it accepts and its JSON Schema pattern?

### `json-schema`

- **[#1485](https://github.com/arktypeio/arktype/issues/1485) jsonSchemaToType is not allowing $ref** (`json-schema` · effort medium · 1 reaction · [note](#note-1485)). jsonSchemaToType has no `$ref`/`$defs` support, so any schema using refs (including arktype's own toJsonSchema output for cyclic scopes) throws the generic 'must have at least one of the keys' ParseError.

  _Decision:_ Support only local `#/$defs`/`#/definitions` refs (enough to round-trip toJsonSchema output), or also remote/`$id`-based refs?

### `regex`

- **[#1664](https://github.com/arktypeio/arktype/issues/1664) Exact regex types for digit patterns without combinatorial explosion (`\d{4}`, `\d+`, `0|[1-9]\d*`)** (`regex` · effort medium · breaking). Proposes union-free template-literal encodings (bigint & {} placeholders, "" & String zero-width anchors, Caseless intersections, with feature detection for older TS) so that arkregex infers exact or tighter types for \d-based patterns.

  _Decision:_ Accept noisier hover types (`${bigint & {}}...`) and TS-version-dependent inference in exchange for exact digit-pattern types, and invite the reporter's PR?

## Docs

- **[#1301](https://github.com/arktypeio/arktype/issues/1301) Add migrating from Zod section to docs** (`docs` · effort medium · 5 reactions). Maintainer TODO: add a Zod migration guide covering global config suggestions (onUndeclaredKey, onFail) and translation pitfalls.
- **[#896](https://github.com/arktypeio/arktype/issues/896) docs: Add comparison page** (`docs` · effort medium · 4 reactions · [note](#note-896)). Requests a docs page comparing ArkType with Zod, TypeBox and Valibot (pros/cons, differences, use cases).
- **[#1273](https://github.com/arktypeio/arktype/issues/1273) Documentaion for `ArkErrors`/`ArkError` API** (`docs` · effort small · 2 reactions). Maintainer TODO: document the ArkErrors/ArkError API with a generated JSDoc table like Type and Traversal, plus intro sections.
- **[#1420](https://github.com/arktypeio/arktype/issues/1420) Light Mode Docs** (`docs` · effort medium · 2 reactions · [note](#note-1420)). Add a light mode to the docs site using the ArkLight code theme.
- **[#1243](https://github.com/arktypeio/arktype/issues/1243) @ark/fast-check docs** (`fast-check` · effort small). @ark/fast-check (Type -> Arbitrary) has no README and no arktype.io page.
- **[#1251](https://github.com/arktypeio/arktype/issues/1251) Add JSDoc for subtypes** (`arktype` · effort medium). Add JSDoc to the subtype-specific Type methods (string/number/array/date/object variants) in the style of `base.ts`, and generate them into the Type API docs with a tag naming the required subtype.
- **[#1252](https://github.com/arktypeio/arktype/issues/1252) Add TypeScript documentation links for methods derived from TS functionality** (`arktype` · effort small). Add a JSDoc tag such as @tsEquivalent that links methods mirroring TS features (keyof, Omit, Pick, etc.) to the TypeScript docs, both in editor JSDoc and in the arktype.io Type API.
- **[#1253](https://github.com/arktypeio/arktype/issues/1253) Add JSDoc + generation for Scope methods** (`docs` · effort small). Maintainer TODO: JSDoc the Scope interface members and generate an ApiTable for them on the Scopes docs page, like the Type API table.
- **[#1254](https://github.com/arktypeio/arktype/issues/1254) Add JSDoc to utilities attached to `type`** (`docs` · effort small). Maintainer TODO: JSDoc every utility attached to `type` (define, module, scope, etc.) and render them as a separate table on the Type API page.
- **[#1291](https://github.com/arktypeio/arktype/issues/1291) Docs search does not include keywords from table** (`docs` · effort small · [note](#note-1291)). Keyword names/descriptions rendered by the auto-generated keyword tables (/docs/keywords, plus the string/number/generic tables on other pages) are not in the docs search index, and the table headings aren't linkable.
- **[#1300](https://github.com/arktypeio/arktype/issues/1300) Improve keywords docs** (`arktype` · effort small · [note](#note-1300)). Several built-in keywords have no custom description, so the keywords table shows auto-generated or garbled text (e.g. `object.js`on).
- **[#1419](https://github.com/arktypeio/arktype/issues/1419) Improve error customization docs** (`docs` · effort small). Maintainer TODO: add a walkthrough page for error customization (like the narrow/morph guides) instead of only the config table.
- **[#1433](https://github.com/arktypeio/arktype/issues/1433) Autogenerate fumadocs og images** (`docs` · effort small). Generate per-page Open Graph images for the docs with fumadocs' OG support instead of a few static images.
- **[#1573](https://github.com/arktypeio/arktype/issues/1573) document default scope overrides** (`docs` · effort small). Document overriding the default (ambient) scope via the type-level `ArkEnv.$` declaration plus a runtime `configure` call.

## Internal

These are maintainer TODOs for refactors, performance, tests and CI. None of them is a user-visible bug.

- **[#783](https://github.com/arktypeio/arktype/issues/783) Enable knip in CI** (`repo` · effort small). Maintainer TODO: configure knip to avoid false positives and run it in CI to catch unused deps and dead code.
- **[#952](https://github.com/arktypeio/arktype/issues/952) Allow index node to be parsed from enumerable keys** (`schema` · effort small · 4 reactions). The schema layer throws for an index signature that has unit (literal) keys. The request is to normalize those into named props at schema parse time, so arktype's objectLiteral doesn't have to.
- **[#975](https://github.com/arktypeio/arktype/issues/975) Prune index + optional props with a value of `unknown`** (`schema` · effort small). Perf optimization: skip traversing index signatures and optional props whose value is `unknown` (e.g. `Record<string, unknown>`), unless undeclared keys are rejected or deleted.
- **[#1067](https://github.com/arktypeio/arktype/issues/1067) Allow any `@ark/schema` Root as input for a union branch or morph endpoint** (`schema` · effort small · [note](#note-1067)). Schema-level normalization: union schemas should accept union branches and morph schemas should accept morph `in`/`out`, flattening internally instead of at every caller.
- **[#1421](https://github.com/arktypeio/arktype/issues/1421) Fix or replace import/no-cycle** (`repo` · effort small · 4 reactions). Repo lint: import/no-cycle misses real runtime import cycles and can be very slow; fix or replace it.
- **[#1639](https://github.com/arktypeio/arktype/issues/1639) Security: Improving OpenSSF Scorecard Rating (Targeting 7.0+)** (`repo` · effort small). Asks for repo hardening to raise the OpenSSF Scorecard (reported 5.8) to 7.0+, starting with least-privilege GITHUB_TOKEN permissions in the workflows (the issue body is truncated after item 1).
- **[#593](https://github.com/arktypeio/arktype/issues/593) Allow discrimination between non-empty arrays** (`schema` · effort medium · [note](#note-593)). Discriminate unions of non-empty variadic arrays like [string, ...string[]] | [number, ...number[]] on the type of element [0].
- **[#932](https://github.com/arktypeio/arktype/issues/932) Identify disjoints between sequences, props, and indices** (`schema` · effort medium · possibly breaking · [note](#note-932)). Intersection reduction should detect disjoints across structural constraints, e.g. a tuple element vs. a numeric-key prop, or a prop vs. an index signature.
- **[#940](https://github.com/arktypeio/arktype/issues/940) Improve safety + autocomplete for @ark/schema definitions** (`schema` · effort medium · possibly breaking). @ark/schema APIs accept a loose schema definition type; they should validate definitions (no extra keys, constraints narrowed by basis) for safety and autocomplete.
- **[#1020](https://github.com/arktypeio/arktype/issues/1020) Implement getIo using transform** (`schema` · effort medium). Maintainer refactor TODO: reimplement BaseNode.getIo on top of the general transform method.
- **[#1096](https://github.com/arktypeio/arktype/issues/1096) Add globally configured repo-wide test variants** (`repo` · effort medium). Maintainer TODO: run the whole test suite in global variants (jitless mode, inverted intersection order) to cover alternate code paths and commutativity.
- **[#1223](https://github.com/arktypeio/arktype/issues/1223) Move default/optional chained implementation to arktype** (`arktype` · effort medium). Maintainer TODO: move BaseRoot.optional()/.default(), which return arktype tuple syntax, out of @ark/schema and into arktype.
- **[#1247](https://github.com/arktypeio/arktype/issues/1247) Add TS error deltas against consumers of arktype to CI** (`repo` · effort medium). Maintainer TODO: run microsoft/typescript-error-deltas against downstream arktype consumers in CI to spot breaking type changes.

  _Decision:_ Is a downstream-consumer error-delta job worth its CI cost and supply-chain risk, and which consumers should it cover?

- **[#1340](https://github.com/arktypeio/arktype/issues/1340) CI tests for React-Native/Static Hermes** (`repo` · effort medium · 2 reactions). Run the runtime test suite (mocha --skipTypes) under a (static) Hermes engine in CI.
- **[#1358](https://github.com/arktypeio/arktype/issues/1358) Normalize morphs with union input back to unions** (`schema` · effort medium). A morph branch whose input is a union (e.g. `"2 | 3 | 5": fn` in match) stays one morph node with a union `in`, which blocks discriminating the surrounding union.

  _Decision:_ Should morphs with union input be split back into top-level branches at reduction time, or only expanded during discrimination?

- **[#852](https://github.com/arktypeio/arktype/issues/852) "factor" unions during compilation** (`schema` · effort large · 1 reaction). Perf TODO: when compiling unions, hoist the constraints shared by all branches (e.g. `{a} & ({b} | {c})`) so they're checked once.
- **[#891](https://github.com/arktypeio/arktype/issues/891) Split up type/schema tests** (`arktype` · effort large). Repo TODO: move intersection/traversal tests out of ark/type/**tests** into the schema layer, leaving parsing tests in arktype.
- **[#1015](https://github.com/arktypeio/arktype/issues/1015) Investigate contextual node trade-offs** (`schema` · effort large · possibly breaking). Maintainer investigation: give schema nodes contextual props (parent/path/scope) via bound prototypes, trading node caching for cheaper Disjoint prefixing and contextual traversal.

  _Decision:_ Is contextual (parent/path-bound) nodes still a direction worth pursuing after the featherduster perf rewrite, or should this be closed?

- **[#1051](https://github.com/arktypeio/arktype/issues/1051) Find a better strategy for external/internal implementation type compat** (`arktype` · effort large · possibly breaking). Maintainer TODO: internal (`InternalX`/`.internal`) and external types are mutually incompatible, forcing lots of casts; find a cohesive strategy.
- **[#1179](https://github.com/arktypeio/arktype/issues/1179) Review/refactor `.in`/`.inner.in`/`declaredIn`** (`schema` · effort large · possibly breaking). Maintainer refactor TODO: clarify which input/output variant (in, inner.in, declaredIn/declaredOut) each code path uses, and flatten morph `in` + `morphs` into a single array.

  _Decision:_ Should the MorphSchema `in` key be removed from the public @ark/schema schema shape (folded into `morphs`)?

- **[#1003](https://github.com/arktypeio/arktype/issues/1003) Improve declare type perf** (`arktype` · effort unknown). Maintainer TODO: `declare` type tests are disproportionately expensive to type-check; investigate and optimize.

## featherduster breaking-change candidates

Fixing or building any of these changes behavior or types that users could depend on, so featherduster is the natural window. Items marked _possibly_ break only under some of the designs in their decision.

- [#1337](https://github.com/arktypeio/arktype/issues/1337) check prototype when checking `object.js`on (bug). `object.js`on accepts non-plain objects such as Map, Set, Date, RegExp, typed arrays, functions and class instances, plus nested ones like { a: new Map() } and [new Map()], because it only checks domain object plus a string index signature.
- [#1403](https://github.com/arktypeio/arktype/issues/1403) Add dedicated error code for undeclared key (feature). Undeclared-key rejections ("+": "reject") are reported as code "predicate" with expected "removed"; the request is for a dedicated code so they can be customized separately.
- [#1479](https://github.com/arktypeio/arktype/issues/1479) Custom error messages don't work on morph (bug). `.configure({ message })` on a pipe (`A.to(B)`) applies to errors from the input type but not to errors from the piped output type.
- [#1525](https://github.com/arktypeio/arktype/issues/1525) Add type error to optional index signature expression like `[sizes]?` (feature). `"[k]?"` keys are silently parsed as a literal optional key named "[k]"; the maintainer kept this open to add a type error for that key form, and later commenters ask for it to expand finite index keys into optional props instead (like TS `[K in Locales]?`).
- [#1663](https://github.com/arktypeio/arktype/issues/1663) Regex `\d+` infers `${number}`, which rejects valid digit strings longer than ~309 digits (bug). arkregex infers `${number}` for repeated digits (\d+, \d\*, \d{n}), which is unsound because digit runs whose Number() is Infinity (above ~1.8e308) validate at runtime but aren't assignable to the inferred type.
- [#1664](https://github.com/arktypeio/arktype/issues/1664) Exact regex types for digit patterns without combinatorial explosion (`\d{4}`, `\d+`, `0|[1-9]\d*`) (feature). Proposes union-free template-literal encodings (bigint & {} placeholders, "" & String zero-width anchors, Caseless intersections, with feature detection for older TS) so that arkregex infers exact or tighter types for \d-based patterns.
- [#462](https://github.com/arktypeio/arktype/issues/462) arktype dedicated Promise handling (feature, _possibly_). Request for first-class async morphs: validation that awaits Promise-returning morphs (including nested ones) and reports their errors, e.g. for Astro's Standard Schema image transforms.
- [#751](https://github.com/arktypeio/arktype/issues/751) Collapse common parts of union (feature, _possibly_). Reduce unions of structures that differ in exactly one key ({ a: string } | { a: number } -> { a: string | number }) and adjacent ranges (1&lt;n&lt;10 | 10&lt;=n&lt;100 -> 1&lt;n&lt;100).
- [#786](https://github.com/arktypeio/arktype/issues/786) Discriminate based on key presence if keys are strict (feature, _possibly_). Discriminate unions of objects that reject undeclared keys by which key is present, e.g. {a: string} | {b: string} with onUndeclaredKey("reject").
- [#808](https://github.com/arktypeio/arktype/issues/808) readonly prefix operator for key, string and tuple definitions (feature, _possibly_). Add a `readonly` operator in string (`"readonly string[]"`), tuple (`["readonly", {...}]`) and per-key (`"readonly a"`) syntax, possibly with optional Object.freeze.
- [#817](https://github.com/arktypeio/arktype/issues/817) Morph keys (feature, _possibly_). Allow morphs as index signature keys so keys are transformed (input `{a: string}` -> output `{b: string}`).
- [#853](https://github.com/arktypeio/arktype/issues/853) Reduce regex intersections (feature, _possibly_). Type-system TODO: reduce/compare regex patterns (e.g. intersect DFAs) so disjoint patterns reduce to never and subpattern assignability is detected.
- [#867](https://github.com/arktypeio/arktype/issues/867) Add runtime depth-limit for validation (feature, _possibly_). Asks for a validation depth limit, so that input whose getter builds a new value of the cyclic type at every level can't hang validation.
- [#932](https://github.com/arktypeio/arktype/issues/932) Identify disjoints between sequences, props, and indices (internal, _possibly_). Intersection reduction should detect disjoints across structural constraints, e.g. a tuple element vs. a numeric-key prop, or a prop vs. an index signature.
- [#940](https://github.com/arktypeio/arktype/issues/940) Improve safety + autocomplete for @ark/schema definitions (internal, _possibly_). @ark/schema APIs accept a loose schema definition type; they should validate definitions (no extra keys, constraints narrowed by basis) for safety and autocomplete.
- [#963](https://github.com/arktypeio/arktype/issues/963) Custom error message for discriminated union (bug, _possibly_). A discriminated union's missing-case error ignores descriptions set on the union and on its branches, while an indiscriminable union uses them.
- [#1015](https://github.com/arktypeio/arktype/issues/1015) Investigate contextual node trade-offs (internal, _possibly_). Maintainer investigation: give schema nodes contextual props (parent/path/scope) via bound prototypes, trading node caching for cheaper Disjoint prefixing and contextual traversal.
- [#1051](https://github.com/arktypeio/arktype/issues/1051) Find a better strategy for external/internal implementation type compat (internal, _possibly_). Maintainer TODO: internal (`InternalX`/`.internal`) and external types are mutually incompatible, forcing lots of casts; find a cohesive strategy.
- [#1072](https://github.com/arktypeio/arktype/issues/1072) TS crash on some cyclic thunks (bug, _possibly_). A cyclic scope whose thunk calls `.narrow()` on a type referencing the cycle crashes the TS checker.
- [#1179](https://github.com/arktypeio/arktype/issues/1179) Review/refactor `.in`/`.inner.in`/`declaredIn` (internal, _possibly_). Maintainer refactor TODO: clarify which input/output variant (in, inner.in, declaredIn/declaredOut) each code path uses, and flatten morph `in` + `morphs` into a single array.
- [#1287](https://github.com/arktypeio/arktype/issues/1287) attest: replace references to Node's builtin assertions (bug, _possibly_). attest `.equals` hands same-constructor objects to node:assert deepStrictEqual, whose failure-diff generation hangs or runs out of memory when the values contain arktype Types; the maintainer wants a custom or targeted diff instead.
- [#1298](https://github.com/arktypeio/arktype/issues/1298) Consider checking array children when minLength/maxLength fails for non-tuples (feature, _possibly_). When a length constraint on a variadic array fails, element errors aren't reported because traversal stops at the first failing level; the reporter (a form library) wants element errors too, as Zod/Valibot report.
- [#1390](https://github.com/arktypeio/arktype/issues/1390) Config for values that fallback to a default (bug, _possibly_). With exactOptionalPropertyTypes: false, an explicit `undefined` should trigger a key's default. The issue also proposes a general configurable fallback (null, "", a `"-"` key).
- [#1412](https://github.com/arktypeio/arktype/issues/1412) Unable to directly configure top-level intersection error message (bug, _possibly_). `.configure({ message })` on a type whose failure produces multiple constraint errors (e.g. `string.email > 0` on "") is ignored: the merged `intersection` error has no meta, so the default bulleted message is shown.
- [#1435](https://github.com/arktypeio/arktype/issues/1435) Improve partially discriminated error context (bug, _possibly_). When one union branch's discriminant is a literal union (`'c' | 'd'`), it becomes the switch default, so errors for a missing or invalid discriminant blame only that branch.
- [#1448](https://github.com/arktypeio/arktype/issues/1448) Possibly a bug with `string.numeric` (feature, _possibly_). string.numeric rejects exponent notation like "5.7153e-10"; the reporter expected it to be accepted.
- [#1481](https://github.com/arktypeio/arktype/issues/1481) index signature including literals (e.g. string.uuid) treated as having required keys (bug, _possibly_). An index signature whose key type mixes literals with a pattern (string.uuid = versioned regex | nil literal | max literal) turns the literal keys into required props, so `{}` fails, while the inferred type `{ [x: string]: ... }` accepts `{}`.
- [#1491](https://github.com/arktypeio/arktype/issues/1491) Fully discriminate literal unions nested in properties (feature, _possibly_). A union whose discriminant property is itself a union of literals (tag: '"b" | "c"') is not discriminated, so errors list every branch's other props instead of saying the discriminant is missing/invalid.
- [#1492](https://github.com/arktypeio/arktype/issues/1492) .partial() is ignoring custom error messages on fields in a type (bug, _possibly_). A custom `message` configured on a prop is lost when the error comes from a non-discriminated union; the union rebuilds its message from each branch error's `expected`. .partial() only triggers this by making the discriminant optional.
- [#1512](https://github.com/arktypeio/arktype/issues/1512) string.uuid infer type (feature, _possibly_). Asks for string.uuid (and its v1-v8 variants) to infer a template literal like node:crypto's UUID (`${string}-${string}-${string}-${string}-${string}`) instead of string.
- [#1524](https://github.com/arktypeio/arktype/issues/1524) `type.map()` collapses discriminated union (bug, _possibly_). Type.map on a union is applied per branch at runtime, but its inferred type merges the branches. When the branches share no keys, the callback's entry is typed `never`.
- [#1554](https://github.com/arktypeio/arktype/issues/1554) meta key (feature, _possibly_). Maintainer TODO: support an `"@"` key in object literals for attaching top-level metadata (e.g. description) to the object type.
- [#1575](https://github.com/arktypeio/arktype/issues/1575) Standard JSON Schema Default Values (bug, _possibly_). `~standard.jsonSchema.input()` omits `default` for defaultable keys, although `toJsonSchema()` emits it.

## Side findings

No open issue tracks these. They turned up while reproducing other issues, and the first three were re-run for this file.

### featherduster behavior changes the CHANGELOG doesn't mention

- **`"+": "delete"` reorders keys.** On featherduster, deleting undeclared keys (shallow or deep) returns the declared keys in the node's sorted order. 2.2.8 keeps input order. `type({ "+": "delete", b: "string", a: "string", "c?": "number" })({ a: "1", z: 0, c: 1, b: "2" })` gives `{a, c, b}` on 2.2.8 and `{a, b, c}` on featherduster. Transforms that don't delete keys, like `string.trim`, keep input order on both. Found while checking [#1380](https://github.com/arktypeio/arktype/issues/1380). The order was set deliberately (713b65cdc, and d16b90039 for perf). It is kept, and the CHANGELOG now documents it.
- **A tuple union's `.allows` rejects a value it accepts on 2.2.8.** `type(["'x'", "string"]).or(["unknown", "undefined"]).or(["1", "object"]).allows(["x", undefined])` is false on featherduster and true on 2.2.8. Fixed in featherduster by the fixes for [#1445](https://github.com/arktypeio/arktype/issues/1445).
- **The call site drops out of the indeterminate-union ParseError's stack.** The extra `ark/sets/engine.ts` frame pushes the user's `.or(...)` frame past Node's default 10-frame stack limit, so the error no longer shows where it came from. Found on [#1613](https://github.com/arktypeio/arktype/issues/1613).
- **Equivalent cyclic aliases are no longer the same node.** On featherduster, `types.user !== types.admin` for structurally equal aliases, and `admin`'s expression unrolls one level. `equals` is true, so this is not a correctness issue, but it changes reference identity. Found on [#928](https://github.com/arktypeio/arktype/issues/928). The loss of identity for a shared input transformed at two keys is already listed under known regressions in [#1685](https://github.com/arktypeio/arktype/pull/1685).

### Unfiled bugs

- **Unanchored digit patterns infer an unsound type (2.2.8 and featherduster).** `type("/\\d+/")` infers `` `${number}` `` but accepts `"x1y"`. It is one case of a broader arkregex soundness gap, and a precise redesign was built but not landed. See the issue draft below. Found on [#839](https://github.com/arktypeio/arktype/issues/839).
- **`string[] & number[]` is `unknown[]` on 2.2.8 and accepts `["x"]`.** On featherduster it is `[]`, which is correct. No issue tracks it, so nothing needs closing. Found on [#1088](https://github.com/arktypeio/arktype/issues/1088).
- **Flat tuple expressions silently drop operands at runtime.** They are a type error, but at runtime the extra operands are dropped (`string | false | true`). Separately, `type("string&number")` throws "unsatisfiable" at runtime but isn't a type error. Found on [#585](https://github.com/arktypeio/arktype/issues/585).
- **A numeric finite index is a type error but works at runtime.** With `index: "1 | 3 | 5 | 7"`, `{ "[index]": "index" }` reports "Indexed key definition must be a string or symbol", but at runtime it expands fine. Found on [#584](https://github.com/arktypeio/arktype/issues/584).
- **`.brand()` on a string or number infers an `ObjectType` (2.2.7 and featherduster).** `type("string").brand("X")` has no `StringType` methods. `Brand<string, id>` is `string & {...}`, and `instantiateType` checks `[t] extends [object]` first.
- **arkregex inference gaps (2.2.7 and featherduster).** These turned up while fixing [#1530](https://github.com/arktypeio/arktype/issues/1530). Capture indices from a literal pattern are unsound for optional groups. The base `Regex` types `exec` groups as `undefined`. A template source with a dynamic part infers its captures as `[]`. `finalizeBranches` drops branch errors. A later alternation branch can't see named groups from earlier branches.
- **Putting a 2.2.8 `Type` in a featherduster definition throws `node.referencedBesidesChildren is not iterable`.** A duplicate copy of the same version works. Found while checking [#1088](https://github.com/arktypeio/arktype/issues/1088).
- **Date bounds print the local `Date.toString()` in expressions (2.2.8 and featherduster).** That drops milliseconds, so `type("Date > 0")` and `type("Date >= 0")` both print `Date >= Wed Dec 31 1969 19:00:00 GMT-0500 (Eastern Standard Time)`, and the expression depends on the machine's time zone. On featherduster, `description` is in UTC with milliseconds.
- **Intersecting tuples with an element after a variadic one is wrong in three ways (2.2.8 and featherduster).** These are in `_intersectSequences` (`ark/sets/structure/sequence.ts`). The fixed-length variants share the root's Disjoint, so `type(["...", "unknown[]", "'y'"]).and(["1", "...", "unknown[]"])` throws "unsatisfiable". The variadic-disjoint branch maps `lTail` where it means `r`, so `[...string[], "y"] & [...number[], 2]` gives `["y"]` instead of `never`. A variant ignores leftover elements, so `[3, "x" | object] & [...number[], unknown, boolean]` gives `[3, object | "x"]`. With such tuples added, the match fuzz on `fix/match-order` misroutes 114 of 3938 matchers, and 0 without them. Found while fixing [#1445](https://github.com/arktypeio/arktype/issues/1445).
- **A union discriminated on a tuple element skips non-array objects with that index (2.2.8 and featherduster).** `type(["string"]).or(["number"]).or(type.instanceOf(Uint8Array)).allows(new Uint8Array([1]))` is false. The same goes for String objects and class instances. The case node at an index requires an Array proto, and "object but not Array" can't be expressed. A construction-time fix would add every non-Array proto the union references to the node at a numeric key, at no validation cost. Found while fixing [#1445](https://github.com/arktypeio/arktype/issues/1445).
- **Discrimination compares paths as strings (2.2.8 and featherduster).** `pruneDiscriminant` treats a node as on the discriminant path when its prop string starts with the path's, so key `a` counts as on path `ab` and loses its object check: `type({ ab: "'1'", a: { x: "string" } }).or({ ab: "'2'" }).allows({ ab: "1", a: 5 })` throws `Cannot use 'in' operator to search for 'x' in 5`. Comparing the path arrays fixes it. Found while reviewing the fix for [#1445](https://github.com/arktypeio/arktype/issues/1445).
- **A pruned branch can be `null` in `resolveCase` (2.2.8 and featherduster).** `type("number").or({ "length?": "3" }).or(["number", "number", "number"]).or([[], "|", "string"])` throws `null is not a valid type schema`, because an optional key whose only constraint is the discriminated unit prunes to nothing. Found by the [#1445](https://github.com/arktypeio/arktype/issues/1445) fuzz in 8 of 20010 seeds.
- **A predicate is called on a pruned primitive (2.2.8 and featherduster).** `match.case(type("string").narrow(s => s.length > 1), ...).case("number", ...).case("null | 'x'", ...)` throws `Cannot read properties of null` at definition, since a predicate implies no basis and pruning drops the `string` check beside it. The same case with `"string > 1"` is fixed in featherduster (6060504dc).
- **Inference around `unknown.any` and `object` (2.2.8 and featherduster).** `type({ a: ["unknown.any", "=>", s => 5] }).inferIn` is `{ a?: any }`, because `unwrapInput` tests the morph for `any` rather than its input. `["unknown.any", "=", 5]` infers a union, because `withDefault` distributes over `any`. An `object` input distills to `{}`. Found while fixing [#1023](https://github.com/arktypeio/arktype/issues/1023).
- **`attest trace` crashes when stdout isn't a TTY (2.2.8 and featherduster).** Piped or in CI, it throws `process.stdout.clearLine is not a function` from `ark/attest/cli/trace.ts`. Found while checking [#1306](https://github.com/arktypeio/arktype/issues/1306).
- **`ark/repo/__tests__/benchScenarios.test.ts` "accepts alike" is intermittent on featherduster.** It failed in two full runs and passed in a third, and it passes alone.

### Fixed in featherduster without an issue

- **The playground's `type.d.ts` had a stray `Required$1` (TS2749).** Fixed with [#1529](https://github.com/arktypeio/arktype/issues/1529) (49fea0d79).
- **A scope alias that failed to parse reported a false cycle on later references.** With `scope({ a: { b: "b" }, b: { a: "a", c: "bad" } })`, `$.type("a")` threw "'bad' is unresolvable", but a following `$.type("a | string")` threw a shallow cycle error. On 2.2.8, JIT validation of the result crashed. Fixed in f8f2d92e4.
- **An intersection's expression dropped its proto and refinements when it had props.** `type("Date > 0").and({ foo: "string" }).expression` was `{ foo: string }`. It was the same early return as [#1430](https://github.com/arktypeio/arktype/issues/1430), and that fix (8c66cc7c1) fixed it too.
- **Errors merged from a nested morph lost part of their path (featherduster regression).** `toJSON().path` and the message of an error from a morph inside a morph dropped the middle keys. Fixed in c03af9670.
- **Error wording.** With an empty `actual`, `ark/schema/roots/intersection.ts:246` still writes the `(${ctx.actual}) ` prefix ([#1538](https://github.com/arktypeio/arktype/issues/1538)). On featherduster, the JSON scope's error for `{ a: [1, { b: undefined }] }` repeats itself: `... must be an array (was object) or must be an array (was object)` ([#1026](https://github.com/arktypeio/arktype/issues/1026)). The summary for an optional `never` key is just `never` ([#930](https://github.com/arktypeio/arktype/issues/930)).

### Issue draft: arkregex infers types that reject strings the pattern matches

Every string a pattern matches should be assignable to the type arkregex infers for it, through `regex()` and through `type("/.../").infer`, which shares the inference. `ark/docs/content/docs/regex/inference.mdx` says inferred types are "at worst imprecise and never incorrect". That doesn't hold on 2.2.8 or featherduster. A probe of 2,841 patterns against every short string they match finds 310,500 rejected matches in 1,293 patterns. Most come from `\d` inferring `` `${number}` `` around text it can't contain: `regex("\\d+")` infers `` `${number}` `` but matches `"x1y"`.

Two TypeScript rules cause most of it. When TS matches a string against a template literal type:

1. a placeholder directly followed by another placeholder matches exactly one character
2. a placeholder followed by a literal ends at the literal's first occurrence, and TS never backtracks

arkregex uses `` `${string}` `` for `.`, `.*`, `.+`, `x+` and the text a missing anchor allows, and `` `${number}` `` for `\d`, so both rules come up whenever one sits next to another or next to a literal it can also match.

**Status: open.** A precise redesign was built on `fix/regex-redesign` (68b17f351) and not landed. It tracks, while parsing, what each placeholder can match and decides merging and widening from that. On the 2,842-pattern corpus it rejects no matched string and widens 17 of the 1,549 types that were already sound, but it grows arkregex's source from 1,494 to 4,287 lines. Two large patterns that compiled now fail with TS2589, one crashes TS 6, and small patterns cost about 30% more instantiations.

**An earlier attempt wasn't landed either.** `fix/regex` (56d4f948a) stops merging `\d` into `` `${number}` ``, merges adjacent `` `${string}` ``s and absorbs repetitions. It cuts the rejected matches from 310,500 to 25,662, but three review rounds each found new ones. In the last round:

- 1,604 matches in 62 patterns are rejected that featherduster accepted. Merging a `` `${string}` `` shifts which characters TS gives every later placeholder, so `^..\d$` rejects `"ab1"`, `^a..\d$` rejects `"abc1"` and `^(?:\d.*)+\d$` rejects `"11"`.
- Some types widen with no soundness need. `^a..c$` becomes `` `a${string}c` `` and `^\d..` loses two required characters, because two raw `.` atoms are merged although the parser can tell them from `.*`.
- `^[\d.]{7,16}$` compiles on featherduster and fails with TS2590 on the branch, and `^[\d.]{7,15}$` goes from 82k to 2.18M instantiations, because a digit class mixed with a literal is no longer collapsed before a bounded quantifier enumerates it.

**What the fix leaves**, on the worker's 1,930-pattern probe:

| class                                             | example  | inferred                             | rejects        | matches | patterns |
| ------------------------------------------------- | -------- | ------------------------------------ | -------------- | ------- | -------- |
| a `` `${string}` `` directly before a placeholder | `^.*\d$` | `` `${string}${number}` ``           | `"0"`, `"0a0"` | 4,296   | 36       |
| a placeholder before a literal it can contain     | `a\d`    | `` `${string}a${number}${string}` `` | `"aa1"`        | 857     | 43       |
| `\s` covers only space, tab and newline           | `^\s$`   | `" " \| "\t" \| "\n"`                | `"\r"`         | 60      | 15       |

The `\s` class is unrelated to template literals: `WhitespaceChar` in `@ark/util` is shared with the arktype parser, so arkregex needs its own type for `\s`.

**Directions**, none implemented:

- Merge `` `${string}` `` runs once, after anchors are applied, and only where no placeholder follows, rather than in `appendNonRedundant`, `prependNonRedundant` and `appendRepetition`.
- Don't merge raw `.` atoms. A prototype of this alone (`review-precision/variant-dot.patch`) removed every new rejection among the 100 patterns whose types it changed and restored 25 precise featherduster types.
- Past a small repetition bound, widen a quantified union containing `` `${number}` `` instead of enumerating it.
- Track during parsing whether each placeholder can match zero or several characters, and merge or absorb from that rather than from the finished type. This is a design change to `state.ts`, and it is what `fix/regex-redesign` does.

The probes, their corpora and results, the per-pattern type changes and both reviews' evidence are in `.frizz/threads/567f8946-44d1-4e2c-9cfc-5152f7109381/regex-probe/` in the main checkout: `results-final.md`, `remaining-final.md` and `type-changes-final.md` for the worker's probe, and `review-sound/` and `review-precision/` for the reviewers'.

## Notes by issue

These 129 notes were drafted as issue comments and then kept here for review instead. Each states what was verified on 2.2.8 and the featherduster branch, a root cause, a workaround, or a related issue, and every code sample in them was run. They refer to the branch as `featherduster` ([#1685](https://github.com/arktypeio/arktype/pull/1685)).

### <a id="note-462"></a>[#462](https://github.com/arktypeio/arktype/issues/462) arktype dedicated Promise handling

Current behavior on arktype 2.2.8: an async morph's output is a pending Promise. Validation, including `~standard.validate`, returns synchronously as a success, and a `ctx.error` after an `await` only resolves inside that Promise instead of failing validation:

```ts
const T = type({
	img: type("string").pipe(async (s, ctx) => {
		await Promise.resolve()
		return s.length < 3 ? ctx.error("at least 3 characters") : s.length
	})
})

const r = T["~standard"].validate({ img: "ab" }) as any
console.log(r)
// { value: { img: Promise { <pending> } } }
console.log(String(await r.value.img))
// img must be at least 3 characters (was Promise)
```

### <a id="note-485"></a>[#485](https://github.com/arktypeio/arktype/issues/485) Allow relative references for constraints (e.g. "string==./repeatPassword")

Until there's dedicated syntax, cross-field checks work with `.narrow` and a `path` on the rejection, as documented under [Narrow](https://arktype.io/docs/expressions#narrow). On arktype 2.2.8:

```ts
const Signup = type({ password: "string", repeatPassword: "string" }).narrow(
	(d, ctx) =>
		d.password === d.repeatPassword ||
		ctx.reject({
			expected: "identical to password",
			actual: "",
			path: ["repeatPassword"]
		})
)

Signup({ password: "a", repeatPassword: "b" }).toString()
// repeatPassword must be identical to password
```

### <a id="note-491"></a>[#491](https://github.com/arktypeio/arktype/issues/491) Template literal

There's no template literal syntax on arktype 2.2.8 (``type("`a${string}z`[]")`` throws ``'`a${string}z`' is unresolvable``), but an `arkregex` pattern already infers the equivalent template literal type:

```ts
import { regex } from "arkregex"

const T = type(regex("^a.*z$")).array()
// T.infer: `a${string}z`[]
T(["b"]).toString()
// value at [0] must be matched by ^a.*z$ (was "b")
```

Composing other aliases inside the template, as in the address example above, still needs dedicated syntax.

### <a id="note-577"></a>[#577](https://github.com/arktypeio/arktype/issues/577) Fix scope tuple expression functional inference

Still reproduces on arktype 2.2.8, and not only in scopes. With an object-literal input, the output infers `never` whenever the morph's parameter is unannotated, even if the return doesn't use it; the `okType` example above now hits it too. In a scope, one such entry also turns an unrelated sibling morph into `never`.

```ts
const t = type({ a: [{ a: "1" }, "=>", d => "x" as const] })
// typeof t.infer: { a: never }
const ok = type({ a: [{ a: "1" }, "=>", (d: unknown) => "x" as const] })
// typeof ok.infer: { a: "x" }

const s = scope({
	len: ["string", "=>", s => s.length],
	obj: [{ a: "1" }, "=>", d => d.a]
}).export()
// typeof s.len.infer: never (correct without obj)
// typeof s.obj.infer: never
```

#1624 reports the same problem.

### <a id="note-579"></a>[#579](https://github.com/arktypeio/arktype/issues/579) Reintegrate static shallow cycle check

Implemented on the `featherduster` branch (#1685) in 74a4df18b. Both examples are now type errors and throw at runtime:

```ts
scope({ a: "a" }).export()
// Alias 'a' has a shallow resolution cycle: a->a
scope({ a: "b", b: "a|undefined" }).export()
// Alias 'a' has a shallow resolution cycle: a->b->a
```

### <a id="note-584"></a>[#584](https://github.com/arktypeio/arktype/issues/584) Mapped types

On arktype 2.2.8 a finite index signature expands into named props, but a value can't depend on its key in a definition. `.map()` does it at runtime, though the inferred type widens to `{ a: "a" | "b"; b: "a" | "b" }`:

```ts
const $ = scope({ index: "'a' | 'b'", rec: { "[index]": "index" } }).export()
$.rec.expression // { a: "a" | "b", b: "a" | "b" }

const M = type({ "['a' | 'b']": "unknown" }).map(p => ({
	key: p.key,
	value: type.unit(p.key)
}))
M.expression // { a: "a", b: "b" }
M({ a: "a", b: "a" }).toString() // b must be "b" (was "a")
```

`type.Record` with a finite key union still throws; that is #952.

### <a id="note-585"></a>[#585](https://github.com/arktypeio/arktype/issues/585) Unify AST processing between functional expressions, tuple expression, strings, standardize runtime semantic validation

No source references to this issue remain on arktype 2.2.8. Defaults (`{ a: "number = 5" }`, `["number", "=", 5]`) and `.merge()`/`"..."` have shipped. Of the leftovers, a flat tuple expression is a type error, but at runtime the extra operands are silently dropped, and `string&number` is still only a runtime error:

```ts
type(["string", "|", "boolean", "|", "number"] as any).expression
// string | false | true
type("string&number") // no type error
// throws: Intersection of string and number results in an unsatisfiable type
```

### <a id="note-588"></a>[#588](https://github.com/arktypeio/arktype/issues/588) Allow arbitrary types to be compared using a length prop

Workaround on arktype 2.2.8: intersect with a `length` prop.

```ts
const T = type("Function").and({ length: "number > 1" })
T((a: 1) => 0) // length must be more than 1 (was 1)
T({ length: 2 }) // must be a function (was object)
```

### <a id="note-593"></a>[#593](https://github.com/arktypeio/arktype/issues/593) Allow discrimination between non-empty arrays

Still not discriminated on arktype 2.2.8. There, intersecting the two branches doesn't produce a disjoint at all: it reduces to a non-empty `unknown[]` that accepts `["a"]`. On the `featherduster` branch (#1685) that intersection is correctly unsatisfiable, but only as a length disjoint (`== 0` vs `>= 1`), so there is still no `[0]` discriminant.

```ts
const u = type(["string", "...", "string[]"]).or(["number", "...", "number[]"])
u.internal.discriminantJson // null

const i = type("string[] > 0").and("number[] > 0")
i.expression // unknown[]
i(["a"]) instanceof type.errors // false
```

### <a id="note-611"></a>[#611](https://github.com/arktypeio/arktype/issues/611) Catch transformations (morphs for problem results)

The `.or(fallback(0))` helper above throws at definition time on arktype 2.2.8, because `unknown` overlaps the base type's input. A pipe from `unknown` that calls the base type works and infers the output as `number`:

```ts
type("string").or(type("unknown").pipe(() => 0))
// ParseError: An unordered union of a type including a morph and a type with overlapping input is indeterminate

const Page = type("string.integer.parse")
const PageOrOne = type("unknown").pipe(v => {
	const out = Page(v)
	return out instanceof type.errors ? 1 : out
})
PageOrOne("5") // 5
PageOrOne("x") // 1
```

### <a id="note-648"></a>[#648](https://github.com/arktypeio/arktype/issues/648) Integrate custom parsedDate formats

`parsedDate` no longer exists in arktype 2.2.8. It was replaced by `string.date.parse`, `string.date.iso.parse` and `string.date.epoch.parse`. Date-only and other specific formats are requested in #1307.

### <a id="note-751"></a>[#751](https://github.com/arktypeio/arktype/issues/751) Collapse common parts of union

Still not reduced on arktype 2.2.8, so set-equal types compare as different, and the merged form isn't recognized as a subtype of the union:

```ts
const t = type({ a: "string" }, "|", { a: "number" })
const u = type({ a: "string|number" })
t.expression // { a: number } | { a: string }
t.equals(u) // false
u.extends(t) // false

const r = type("1<number<10|10<=number<100")
r.expression // number < 100 & >= 10 | number < 10 & > 1
r.equals("1<number<100") // false
```

### <a id="note-769"></a>[#769](https://github.com/arktypeio/arktype/issues/769) Support arktype to zod function

The motivating gap is covered in arktype 2.2.8: types emit JSON Schema directly, which any JSON-Schema-based converter can consume.

```ts
const User = type({ name: "string", age: "number.integer >= 0" })
User.toJsonSchema()
// { $schema: "https://json-schema.org/draft/2020-12/schema", type: "object", properties: { age: { type: "integer", minimum: 0 }, name: { type: "string" } }, required: ["age", "name"] }
```

A direct ArkType-to-Zod converter would live outside the core package.

### <a id="note-787"></a>[#787](https://github.com/arktypeio/arktype/issues/787) Investigate inference for inlined type definitions

No measurable difference on arktype 2.2.8. With TypeScript 6 `--extendedDiagnostics`, the inlined version below costs 415,883 instantiations, vs 415,875 when the same three types are defined first and referenced (`type({ a: s, b: n, c })`). TypeScript 7 shows the same 8-instantiation gap (604,795 vs 604,787), and the gap doesn't grow with the size of the inner definitions.

```ts
export const a = type({
	a: type("string"),
	b: type({ x: "string > 5", y: "number % 2", z: "(string | boolean)[]" }),
	c: type({
		d: "boolean",
		e: "string.email",
		f: { g: "Date", h: "1 < number < 5" }
	})
})
```

### <a id="note-789"></a>[#789](https://github.com/arktypeio/arktype/issues/789) Investigate using ArkType for types in JS

`type.fn` (arktype 2.2) covers typed function signatures in plain JS, with no JSDoc needed:

```js
const len = type.fn("string | unknown[]", ":", "number")(s => s.length)
len("foo") // 3
len.expression // "(string | Array) => number"
len(5) // with checkJs: Argument of type 'number' is not assignable to parameter of type 'string | unknown[]'.
```

### <a id="note-806"></a>[#806](https://github.com/arktypeio/arktype/issues/806) Morph intersection in chained object inferred as never

Still reproduces on arktype 2.2.8 with TypeScript 6 and 7. It isn't specific to `.and`, and doesn't depend on the morph using its parameter. An un-annotated morph parameter at a key whose input is an array or object literal infers `never` for that key:

```ts
const T = type({ c: ["string[]", "=>", s => 5] })
const v: typeof T.infer = { c: 5 }
// error TS2322: Type 'number' is not assignable to type 'never'.
```

`["string", "=>", s => 5]` and `["Date", "=>", s => 5]` at the same key infer correctly. Annotating the parameter (`(s: string[]) => 5`), dropping it (`() => 5`) or using `type("string[]").pipe(s => 5)` avoids it. Same symptom as #1624.

### <a id="note-813"></a>[#813](https://github.com/arktypeio/arktype/issues/813) Fix circular inference on cyclic thunk reference

On arktype 2.2.8 the original scope also fails at runtime: `$.export()` throws `RangeError: Maximum call stack size exceeded`. That runtime overflow doesn't reproduce on the `featherduster` branch (#1685), but the TS7023/TS2615 errors remain on both.

The case from the comment above doesn't need a cycle. A string alias that references a thunk alias is enough to trigger TS7022/TS2615 on arktype 2.2.8 (without `any`, `remote` infers correctly):

```ts
const $ = scope({
	base: { key: "string" },
	remote: () => $.type("base").and({ q: "string" }),
	any: "remote"
})
```

Workaround: replace the `.and` thunks with tuple expressions, e.g. `filterConfigRemoteBase: ["filterConfigBase", "&", { query: "Function" }]`. With the union alias renamed to `filterConfig` (which `configs: "filterConfig[]"` references), the full scope typechecks and validates on arktype 2.2.8.

### <a id="note-817"></a>[#817](https://github.com/arktypeio/arktype/issues/817) Morph keys

On arktype 2.2.8 a morph used as an index signature key is rejected by the types (`Indexed key definition 'string.trim' must be a string or symbol`) but accepted at runtime, where the morph is silently ignored:

```ts
const T = type({ "[string.trim]": "string" } as any)
T.expression // { [(In: string) => Out</^\S.*\S$|^\S?$/>]: string }
T({ " a ": "x" }) // { ' a ': 'x' } (key not trimmed)
```

The scope in the issue behaves the same way: it builds, and `o({ a: "x" })` returns `{ a: 'x' }`. The signature parser is in `ark/schema/structure/index.ts`.

### <a id="note-831"></a>[#831](https://github.com/arktypeio/arktype/issues/831) Index access expressions

String-syntax index access isn't supported on arktype 2.2.8 (`"base['foo']"` throws `ParseError: Missing expected ']'`). The fluent `.get()` method does the same thing and works inside a scope via a thunk:

```ts
const $ = scope({
	base: { foo: "true", bar: "false" },
	foo: () => $.type("base").get("foo")
})
const types = $.export()
types.foo.expression // true
types.foo(false).toString() // must be true (was false)
```

`types.foo.infer` is `true`.

### <a id="note-839"></a>[#839](https://github.com/arktypeio/arktype/issues/839) Require Regular Expressions without `^$` to have `g` flag

Unanchored patterns are already visible in the inferred type. On arktype 2.2.8, `type("/ab/")` infers `` `${string}ab${string}` `` and `type("/^ab$/")` infers `"ab"`.

One exception: unanchored digit patterns lose the `${string}` padding, so the inferred type is narrower than what validates:

```ts
const Digits = type("/\\d+/")
Digits("x1y") // "x1y" (valid)
const d: typeof Digits.infer = "x1y"
// error TS2322: Type '"x1y"' is not assignable to type '`${number}`'.
```

The cause is `appendNonRedundant`/`prependNonRedundant` in `ark/regex/state.ts`. They merge `${number}` with `string` because `` `${number}` extends string `` is true.

### <a id="note-867"></a>[#867](https://github.com/arktypeio/arktype/issues/867) Add runtime depth-limit for validation

No hang on arktype 2.2.8. Validation throws a stack overflow almost immediately:

```ts
const $ = scope({ node: { "next?": "node" } }).export()
const make = (): any => ({
	get next() {
		return make()
	}
})
$.node(make())
// RangeError: Maximum call stack size exceeded (after ~12ms)
$.node.allows(make())
// RangeError: Maximum call stack size exceeded
```

The open part is whether this should produce an `ArkErrors` result instead of throwing.

### <a id="note-896"></a>[#896](https://github.com/arktypeio/arktype/issues/896) docs: Add comparison page

Related: #1301 (migrating-from-Zod section). A stub exists at `ark/docs/content/docs/(arktype)/comparisons.mdx` with only its frontmatter (`title: Comparisons`); it's not in the sidebar but renders as an empty page at https://arktype.io/docs/comparisons. The docs overhaul deletes it and redirects the URL to the [FAQ](https://arktype.io/docs/faq).

### <a id="note-908"></a>[#908](https://github.com/arktypeio/arktype/issues/908) [Request] Utility for creating unions from object keys

`type.enumerated` covers this. It infers the key union (verified on arktype 2.2.8):

```ts
const options = {
	drivers: "Driver's License",
	cna: "CNA Certification",
	custom: "Custom"
} as const

const Qualification = type.enumerated(
	...(Object.keys(options) as (keyof typeof options)[])
)

Qualification.expression // '"cna" | "custom" | "drivers"'
Qualification("rn").toString() // 'must be "cna", "custom" or "drivers" (was "rn")'
// typeof Qualification.infer: "drivers" | "cna" | "custom"
```

### <a id="note-924"></a>[#924](https://github.com/arktypeio/arktype/issues/924) Use the result with the shortest path when finalizing errors for a cyclic value

Still reproduces on arktype 2.2.8. The scopes docs example (`packageData.dependencies[0].dependencies = [packageData]`) reports the error at both paths:

```
contributors[0].email must be an email address (was "david@sharktypeio")
dependencies[0].dependencies[0].contributors[0].email must be an email address (was "david@sharktypeio")
```

When the object is reached first at a longer path, only that path is reported: `scope({ N: { "kids?": "N[]", "x?": "number", "other?": "N" } })` with `inner = { x: "bad", kids: [s] }`, `s.kids = [inner]`, `s.other = inner` gives `kids[0].x must be a number (was a string)`.

On the `featherduster` branch each invalid object is reported once, at the first path a depth-first traversal reaches it by. The docs example reports only `contributors[0].email`, but the second example still reports `kids[0].x`. Commits 62dc7f1ce and 009f43a74 reported it at `other.x`, the shortest path, and were removed to cut the code.

### <a id="note-928"></a>[#928](https://github.com/arktypeio/arktype/issues/928) Reduce equivalent cyclic types

On arktype 2.2.8 the example in the issue already holds (`admin` references `user[]`, so both resolve to the same node), but a renamed self-reference isn't recognized as equivalent:

```ts
const types = scope({
	user: { friends: "user[]", name: "string" },
	admin2: { friends: "admin2[]", name: "string" }
}).export()
types.user.equals(types.admin2) // false
types.user.or(types.admin2).expression
// { friends: $admin2[], name: string } | { friends: $user[], name: string }
```

On the `featherduster` branch (#1685, commits 8d423cdbe and 8325a9794), `equals` is true and the union reduces to a single branch.

### <a id="note-930"></a>[#930](https://github.com/arktypeio/arktype/issues/930) Ensure cyclic aliases are serialized with a scope reference

Still reproduces on arktype 2.2.8, with wrong validation results:

```ts
const s1 = scope({
	a: { "next?": "a", v: "string" },
	box: { "inner?": "a" }
}).export()
const s2 = scope({
	a: { "next?": "a", v: "number" },
	box: { "inner?": "a" }
}).export()

s1.box.equals(s2.box) // true
s2.box({ inner: { v: "x" } }) // inner.v must be a number (was a string)
s1.box.and(s2.box)({ inner: { v: "x" } }) // accepted
```

Doesn't reproduce on the `featherduster` branch (#1685, commit 2be0c8ea3): an alias serializes with its definition's unique id (e.g. `$ark.a1`), `equals` is false and the intersection rejects the data.

### <a id="note-932"></a>[#932](https://github.com/arktypeio/arktype/issues/932) Identify disjoints between sequences, props, and indices

On the `featherduster` branch (#1685), props vs. index signatures are identified: `type("Record<string, number>").and({ a: "string" })` throws `Intersection at a of string and number results in an unsatisfiable type` (arktype 2.2.8 returns `{ [string]: number, a: string }`). Sequence vs. props still isn't on either: `type(["string"]).and({ "0": "number" })` is `{ 0: number } & [string]`, and `[string] & { length: 2 }` stays unreduced.

### <a id="note-944"></a>[#944](https://github.com/arktypeio/arktype/issues/944) Create a robust lazy resolution system, integrate with transforms

Still reproduces on arktype 2.2.8: `.in`/`.out` don't cross a cyclic alias.

```ts
const { node } = scope({
	node: { n: "string.numeric.parse", "next?": "node" }
}).export()
node.out.expression // { n: number, next?: $node }
node.out({ n: 1, next: { n: 2 } }) // next.n must be a string (was a number)
node.in({ n: "1", next: { n: "2" } }) // { n: "1", next: { n: 2 } }
```

`.onDeepUndeclaredKey("reject")` also stops at the alias. Doesn't reproduce on the `featherduster` branch (#1685, commit 5fb19e554): `.out.expression` is `{ n: number, next?: Out<$node> }` and accepts the data, `.in` returns it unchanged, and the nested undeclared key is rejected.

### <a id="note-949"></a>[#949](https://github.com/arktypeio/arktype/issues/949) Check snaps across tsVersions in attest

The `tsVersions` option was removed in @ark/attest 0.57.0 (#1680). Attest now analyzes with whichever `typescript` it resolves and writes a single `.attest/assertions.json`; testing multiple TypeScript versions means running the suite once per version (e.g. a CI matrix), where each run checks snapshots against that version.

### <a id="note-950"></a>[#950](https://github.com/arktypeio/arktype/issues/950) Default value inference incorrectly displays `| undefined` in parameter type

No longer reproduces on arktype 2.2.8. Defaults aren't represented as `(In?: t) => Default<v>` any more, so there's no optional parameter for TS to add `| undefined` to:

```ts
const o = type({ bar: ["number", "=", 5] })
// typeof o.t: { bar: Default<number, 5>; }
// typeof o.inferIn: { bar?: number; }
```

### <a id="note-951"></a>[#951](https://github.com/arktypeio/arktype/issues/951) Default values for tuple elements

Tuple defaults shipped in #1228 (#1139 added default value functions). On arktype 2.2.8 the example from the issue works as specified (`inferIn` is `[string, number?]`, `infer` is `[string, number]`):

```ts
const t = type(["string", ["number", "=", 5]])
console.log(t.expression, t(["a"]))
// [string, number = 5] [ 'a', 5 ]
```

Documented under https://arktype.io/docs/objects#tuples-defaultable.

### <a id="note-961"></a>[#961](https://github.com/arktypeio/arktype/issues/961) Traverse discriminant at runtime in jitless environments

Still reproduces on arktype 2.2.8 with `jitless: true`:

```ts
const T = type({ kind: "'a'", a: "string" }).or({ kind: "'b'", b: "number" })
T({ kind: "a", a: 1 }).toString()
// jitless: a must be a string (was a number) or b must be a number (was missing)
// compiled: a must be a string (was a number)
```

Doesn't reproduce on the `featherduster` branch (#1685), where interpreted unions dispatch on their discriminant (97059c4fe), so jitless and compiled errors match.

### <a id="note-963"></a>[#963](https://github.com/arktypeio/arktype/issues/963) Custom error message for discriminated union

Still reproduces on arktype 2.2.8. When a union is discriminated, its missing-case error ignores descriptions on the union and on its branches, even though `.description` reflects them:

```ts
const T = type("string<2").describe("foo").or(type("number").describe("baz"))
T.description // baz or foo
T({}).toString() // must be a number or a string (was an object)
type("string | number").describe("a primitive")({}).toString()
// must be a number or a string (was an object)
type("string < 2 | string > 5").describe("short or long")("abc").toString()
// must be short or long (was 3)
```

The discriminated path passes an explicit `expected` built from the case keys (`ark/schema/roots/union.ts`), and `ArkError.expected` (`ark/schema/shared/errors.ts`) prefers it over `meta`.

### <a id="note-970"></a>[#970](https://github.com/arktypeio/arktype/issues/970) Narrowing a morph within a single type preserves the type-level morph representation

No longer reproduces on arktype 2.2.8:

```ts
const T = type("string")
	.pipe(s => `${s}!`)
	.narrow((s): s is "foo!" => s === "foo!")
// typeof T.t: (In: string) => Out<"foo!">
```

The test from the issue is enabled at `ark/type/__tests__/narrow.test.ts:144` with that snapshot.

### <a id="note-982"></a>[#982](https://github.com/arktypeio/arktype/issues/982) ArkType Drizzle Validators

Drizzle now maintains an official integration: `drizzle-arktype` on npm, also available as `drizzle-orm/arktype` in drizzle-orm 1.0 (currently `drizzle-orm@rc`). It generates ArkType schemas from Drizzle tables via `createSelectSchema`, `createInsertSchema` and `createUpdateSchema`. Docs: https://orm.drizzle.team/docs/arktype

### <a id="note-989"></a>[#989](https://github.com/arktypeio/arktype/issues/989) ArkDark Neovim Plugin

JetBrains IDEs are covered by the [ArkType plugin](https://plugins.jetbrains.com/plugin/27099-arktype), listed in the [editor docs](https://arktype.io/docs/editor#jetbrains-ides). Zed is tracked separately in #1599.

### <a id="note-1014"></a>[#1014](https://github.com/arktypeio/arktype/issues/1014) Add custom Date keywords like `now`

A bound like `Date < ${Date.now()}` is fixed when the type is defined. For a bound checked at validation time, a narrow works on arktype 2.2.8:

```ts
const InThePast = type("Date").narrow(
	(d, ctx) => d.getTime() < Date.now() || ctx.mustBe("in the past")
)
InThePast(new Date(Date.now() + 60_000)).toString()
// "must be in the past (was 8:09:52.883 PM, October 7, 2026)"
```

### <a id="note-1026"></a>[#1026](https://github.com/arktypeio/arktype/issues/1026) Only allow AliasNode as a structural reference

Done on the `featherduster` branch (#1685) in f57ad99cb ("fix(schema): allow an alias only as a structural value"). With

```ts
const $ = scope({
	Field: { type: "'field'", value: "string >= 1" },
	Group: { type: "'group'", parts: "Part[]" },
	Part: "Field | Group"
}).export()
$.Part({ type: "field", value: "" }).toString()
```

arktype 2.2.8 builds `Part` as `$Group | { type: "field", value: string >= 1 }` (alias as a union branch, not discriminated) and reports "parts must be an array (was missing) or value must be non-empty". On that branch `Part` is discriminated on `type` and reports "value must be non-empty".

### <a id="note-1067"></a>[#1067](https://github.com/arktypeio/arktype/issues/1067) Allow any `@ark/schema` Root as input for a union branch or morph endpoint

Union half works on arktype 2.2.8: `branches` flattens nested union nodes and `{ branches }` schemas. A morph whose `in` is a morph node still stays nested instead of being normalized into one morph, though it transforms correctly:

```ts
const m = rootSchema({ in: "string", morphs: [(s: string) => s.length] })
const mm = rootSchema({ in: m as any, morphs: [(n: number) => n + 1] }) as any
mm.inner.in.kind // "morph"
mm("abc") // 4
```

### <a id="note-1069"></a>[#1069](https://github.com/arktypeio/arktype/issues/1069) Thunk generics in-scope not inferred

No longer reproduces on arktype 2.2.8. This typechecks with no errors under TypeScript 6.0.3 and 7, and `bit.json` equals `expected.json`:

```ts
const $ = scope({ one: "1", orOne: () => $.type("<t>", "t|one") })
const bit = $.export().orOne("0")
const expected = type("0|1")
type Equals<a, b> =
	(<x>() => x extends a ? 1 : 2) extends <x>() => x extends b ? 1 : 2 ? true
	:	false
const eq: Equals<typeof bit.t, typeof expected.t> = true
bit.expression // "0 | 1"
```

### <a id="note-1072"></a>[#1072](https://github.com/arktypeio/arktype/issues/1072) TS crash on some cyclic thunks

Still reproduces on arktype 2.2.8 with the snippet from the issue: TypeScript 6.0.3 `tsc` crashes with `RangeError: Maximum call stack size exceeded`, and TypeScript 7 reports TS7023/TS2615 circularity errors on `children`. Runtime validation is correct.

Writing the predicate as a tuple expression instead of `.narrow` typechecks on both, with `v` inferred:

```ts
children: [
	"root[]",
	":",
	(v, ctx) =>
		new Set(v.map(f => f.name)).size === v.length ||
		ctx.mustBe("names must be unique in a directory")
]
```

### <a id="note-1082"></a>[#1082](https://github.com/arktypeio/arktype/issues/1082) Support recursive generics in `2.0` release candidate

Still reproduces on arktype 2.2.8, but not on the `featherduster` branch (#1685).

```ts
const types = scope({
	"tree<t>": { value: "t", "children?": "tree<t>[]" },
	numTree: "tree<number>"
}).export()
types.numTree({ value: 1, children: [{ value: "x" }] }).toString()
// arktype 2.2.8: RangeError: Maximum call stack size exceeded (on export)
// featherduster: children[0].value must be a number (was a string)
```

The `alternate<a, b>` test from the issue also exports, validates and passes its type assertions on the branch.

### <a id="note-1085"></a>[#1085](https://github.com/arktypeio/arktype/issues/1085) Arkdark breaks syntax highlighting when jsx/tsx templates contain functions ending with `type`

No longer reproduces with the current ArkDark grammar. The definition matcher now requires a word boundary before the function name (`\b(type|generic|scope|...)(\()`, added in #1126), so `fn_name_ends_with_type()` is no longer treated as a `type(` call. Tokenizing the component from the issue with Shiki: with the grammar from before #1126, `type` in `fn_name_ends_with_type()` gets `entity.name.function.ts` and the closing `</button>` is no longer parsed as a JSX tag. With the current grammar, every token's scopes are identical to plain TSX highlighting.

### <a id="note-1088"></a>[#1088](https://github.com/arktypeio/arktype/issues/1088) Make `@ark/schema` more resilient to duplicate installations or initializations

Closing: running more than one copy of arktype isn't supported. The visible failure is that a morph returning another copy's `ArkErrors` is treated as a successful output, since morph results are checked with `instanceof`. Types from another copy already work inside definitions and intersections.

Recognizing another copy's errors by their `" arkKind"` brand was implemented on the `featherduster` branch (#1685) and then reverted. Every object a morph returns had to be checked, which made those morphs about 5–10% slower when one call site sees many output shapes, and up to about 25% slower for trivial morphs.

To resolve a single copy, run `npm ls arktype @ark/schema @ark/util` (or `pnpm why`) to find the duplicates, then `npm dedupe` / `pnpm dedupe`, or pin one version with `overrides` (npm, pnpm) or `resolutions` (yarn).

If two copies can't be avoided, convert in the morph:

```ts
import { type } from "arktype"
import { type as otherType } from "other-copy-of-arktype"

const OtherNumber = otherType("number")
const T = type("string").pipe((s, ctx) => {
	const out = OtherNumber(s)
	return out instanceof otherType.errors ?
			ctx.error({ message: out.summary })
		:	out
})

String(T("x")) // "must be a number (was a string)"
```

### <a id="note-1128"></a>[#1128](https://github.com/arktypeio/arktype/issues/1128) Attest Bun support

`@prettier/sync` 0.6.1 (pinned by @ark/attest 0.57.0) formats correctly under Bun 1.2.10. With TypeScript 7 installed, writing snapshots still fails under Bun: attest uses TypeScript 7's API client, which reads `child.stdout._handle.fd` (`typescript/dist/api/syncChannel.js`), and Bun doesn't expose `_handle`.

```ts
import { attest, setup, teardown } from "@ark/attest"
setup({ skipTypes: true })
attest({ a: 1, b: "x" }).snap()
teardown()
// TypeError: undefined is not an object (evaluating 'stdout._handle.fd')
```

### <a id="note-1166"></a>[#1166](https://github.com/arktypeio/arktype/issues/1166) Size constraint on File

Open PR #1637 implements `File` size bounds. On arktype 2.2.8 `type("File < 5")` throws `ParseError: Bounded expression File must be exactly one of number, string, Array, or Date`. A narrow works in the meantime:

```ts
const T = type("File").narrow(f => f.size <= 5_000_000)
```

### <a id="note-1191"></a>[#1191](https://github.com/arktypeio/arktype/issues/1191) Add an option to allow `undefined` for optional properties

Available since arktype 2.1.12 as the `exactOptionalPropertyTypes` config (https://arktype.io/docs/configuration#exactoptionalpropertytypes). On arktype 2.2.8:

```ts
// config.ts, imported before arktype
import { configure } from "arktype/config"
configure({ exactOptionalPropertyTypes: false })

// app.ts
const arkUser = type({ phoneNumber: "string?" })
arkUser({ phoneNumber: undefined }) // { phoneNumber: undefined }
```

Treating `null` as absent is tracked in #1283.

### <a id="note-1204"></a>[#1204](https://github.com/arktypeio/arktype/issues/1204) Propagate captured RegExp groups to the output value

Supported since arktype 2.2.0 via an `x`-prefixed regex literal, which validates the pattern and outputs the `RegExpExecArray` with typed captures. On arktype 2.2.8:

```ts
const Address = type(
	"x/^(\\d{1,3}[A-Z])? ([A-Za-z ']+), ([A-Za-z -]+), (?<post>[A-Z]{2}\\d{1,2} \\d{1,2}[A-Z]{2})$/"
)
const out = Address.assert("221B Baker Street, London, NW1 6XE")
const [address, houseNumber, road, city, postCode] = out
// ["221B Baker Street, London, NW1 6XE", "221B", "Baker Street", "London", "NW1 6XE"]
out.groups.post // "NW1 6XE"
```

### <a id="note-1213"></a>[#1213](https://github.com/arktypeio/arktype/issues/1213) Improve autocomplete + error messages for comparator expressions

Still reproduces on arktype 2.2.8:

```ts
for (const def of ["number >=", "Date >", "string.email <", "5 <"]) {
	try {
		type(def as any)
	} catch (e) {
		console.log(def, "=>", String(e))
	}
}
// number >= => ParseError: Expected an expression
// Date > => ParseError: '>' is not allowed here
// string.email < => ParseError: Expected an expression
// 5 < => ParseError: Token '>' requires a right operand
```

The last message names the wrong token: `previousOperator()` in `ark/type/parser/reduce/dynamic.ts` returns the left bound's stored comparator, which is already inverted. At the type level, `"number >="` errors with a union of `Comparator >= must be followed by a corresponding literal (was number >=ArrayBuffer)`-style messages built from keyword completions.

### <a id="note-1237"></a>[#1237](https://github.com/arktypeio/arktype/issues/1237) Intersect with discriminated type

Still reproduces on arktype 2.2.8 (`ParseError: T must be assignable to object (was $AEditing&intersection227 | ...)`).

Doesn't reproduce on the `featherduster` branch (#1685). The scope from the report parses and validates as expected, e.g.:

```ts
$.Node({
	type: "b",
	editableA: 12,
	nodes: [{ type: "b", editableA: 2, nodes: [{ type: "a" }] }]
})
// edits must be an object (was missing), nodes[0].edits must be an object (was missing) or nodes[0].nodes[0].editableA must be a number (was missing)
```

### <a id="note-1287"></a>[#1287](https://github.com/arktypeio/arktype/issues/1287) attest: replace references to Node's builtin assertions

Still reproduces with @ark/attest 0.57.0, arktype 2.2.8 and Node 25.2.1 when a Type is nested in the compared values. A top-level Type is compared by reference and fails cleanly.

```ts
// throws: Assertion including at least one function or object was not between reference equal items
attest(type.string).equals(type.boolean)
// process is killed (out of memory)
attest({ a: type.string }).equals({ a: type.boolean })
// false, ~1ms
isDeepStrictEqual({ a: type.string }, { a: type.boolean }) // node:util
```

The comparison itself is cheap. The hang is node:assert building its diff: `new AssertionError({ actual, expected, operator: "deepStrictEqual" })` never finishes, even with a custom `message`, but returns immediately if `operator` is left out.

### <a id="note-1288"></a>[#1288](https://github.com/arktypeio/arktype/issues/1288) Non keywords not inferred in some chained `at` cases

Still reproduces on arktype 2.2.8 (TS 6 and tsgo), but only when the cases passed as `.at`'s second argument have no `default`:

```ts
// error TS7006: Parameter 'o' implicitly has an 'any' type.
match.in<{ id: 0 | 1 | 2 }>().at("id", {
	"0": o => o.id,
	number: o => o.id
})

// compiles, o is { id: 0 }
match.in<{ id: 0 | 1 | 2 }>().at("id", {
	"0": o => {
		const id: 0 = o.id
		return id
	},
	number: o => o.id,
	default: "assert"
})
```

### <a id="note-1291"></a>[#1291](https://github.com/arktypeio/arktype/issues/1291) Docs search does not include keywords from table

The search index is built in `ark/docs/app/api/search/route.ts` from each page's MDX `structuredData` only, so rows rendered by `<AllKeywordTables />` (and `<StringKeywordTable />`, `<NumberKeywordTable />`, `<GenericKeywordTable />` on the primitives and generics pages) never reach it. The live index at `https://arktype.io/api/search` currently contains no occurrence of `Uint16` or `creditCard`. The table titles are rendered in `ark/docs/components/KeywordTable.tsx` as plain `<h2>{name}</h2>` with no `id`, so they can't be linked either. Appending entries for each alias in `ark.internal.resolutions` to those pages' `structuredData` in the route is an alternative to a crawler-based search.

### <a id="note-1300"></a>[#1300](https://github.com/arktypeio/arktype/issues/1300) Improve keywords docs

Descriptions that currently render poorly on arktype 2.2.8, from `ark.internal.resolutions`:

```
object.json.root        "{ [string]: $jsonObject, a number, a string, false, null or true }"
object.json.stringify   "a morph from { [string]: $jsonObject, a number, a string, false, null or true } to a string"
string.creditCard       "a credit card number and a credit card number"
string.date.root        "a string and a parsable date"
string.url.root         "a string and a URL string"
string.regex            "a string and a regex pattern"
string.capitalize.root  "a morph from a string to capitalized"
string.trim.root        "a morph from a string to trimmed"
number.safe             "at least -9007199254740991 and at most 9007199254740991"
Array.index             "matched by ^(?:0|[1-9]\d*)$"
Array.liftFrom          "a generic type for Function"
unknown.any             "unknown"
```

### <a id="note-1307"></a>[#1307](https://github.com/arktypeio/arktype/issues/1307) Allow more specific "date" keywords

`string.date.iso` accepts any ISO 8601 form, including `2017-07-21`, `2017-07-21T17:32:28Z`, but also `2017`, `20170721` and `2017-07-21T17`. The RFC 3339 `date` and `date-time` formats can be required with a regex intersection. On arktype 2.2.8:

```ts
const DateOnly = type("string.date.iso & /^\\d{4}-\\d{2}-\\d{2}$/")
const DateTime = type(
	"string.date.iso & /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?(Z|[+-]\\d{2}:\\d{2})$/"
)

DateOnly.allows("2017-07-21") // true
DateOnly.allows("2017-07-21T17:32:28Z") // false
DateTime.allows("2017-07-21T17:32:28Z") // true
DateTime.allows("2017-07-21T17:32") // false
```

The check is pattern-only, so calendar-invalid dates like `2017-02-30` still pass.

### <a id="note-1310"></a>[#1310](https://github.com/arktypeio/arktype/issues/1310) type reference inferred without ` | undefined` without `exactOptionalPropertyTypes`

Still reproduces on arktype 2.2.8 with `exactOptionalPropertyTypes: false`, with both TypeScript 6 and 7:

```ts
const age = type("number | undefined")
const User = type({ age })
const a: (typeof User.infer)["age"] = undefined
// error TS2322: Type 'undefined' is not assignable to type 'number'.
```

Cause: `inferDefinition` (ark/type/parser/definition.ts:143) infers a referenced Type's output via `def extends type.cast<infer t>`. `type.cast` declares the inferred key as optional (`[inferred]?: to`, ark/type/keywords/keywords.ts:109). With `exactOptionalPropertyTypes` off, inferring from that optional property strips `undefined`. Matching the required `[inferred]: t` key that `Type` declares keeps `number | undefined`.

### <a id="note-1337"></a>[#1337](https://github.com/arktypeio/arktype/issues/1337) check prototype when checking `object.js`on

Still reproduces on arktype 2.2.8, including nested values and functions:

```ts
const T = type("object.json")
for (const v of [
	new Map([["a", 1]]),
	new Set([1]),
	new Date(0),
	/x/,
	{ a: new Map() },
	[new Map()],
	() => {}
])
	console.log(
		Object.prototype.toString.call(v),
		T(v) instanceof type.errors ? "rejected" : "accepted"
	)
// all accepted
```

`jsonObject` in ark/schema/intrinsic.ts only checks `domain: "object"` plus a string index signature over `$jsonData`. Anything with no enumerable string keys passes, and so do functions, since the `object` domain includes them.

### <a id="note-1338"></a>[#1338](https://github.com/arktypeio/arktype/issues/1338) add `json` and `json.stringify` keywords

For reference, some of this already exists in arktype 2.2.8: `object.json.stringify` covers objects only, and the `jsonData` intrinsic in ark/schema/intrinsic.ts already unions JSON primitives and objects.

```ts
const S = type("object.json.stringify")
S({ a: [1, null] }) // '{"a":[1,null]}'
S("foo").toString() // 'must be an object (was a string)'
```

`jsonData`'s object branch is the same `jsonObject` that `object.json` uses, so it currently also allows `new Map()` and functions (#1337).

### <a id="note-1343"></a>[#1343](https://github.com/arktypeio/arktype/issues/1343) Missing type error on invalid HKT definition return type

Two separate things here, both still on arktype 2.2.8.

A scope key that declares params (`"ButWithADollarOnIt<s extends string>"`) expects a plain definition as its value. Passing a `generic(...)` there isn't rejected. Instead it throws `'generic' is unresolvable` at runtime and fails with TS2589 (TypeScript 6) or TS5114 (TypeScript 7). A non-HKT `generic(["s", "string"])({ box: "s" })` fails the same way.

With a bare key it type-checks and infers `"$a"`, but the first callback's return isn't checked against the HKT body. `${args.s}` stringifies the Type, so runtime validation differs:

```ts
const myScope = scope({
	ButWithADollarOnIt: generic(["s", "string"])(
		args => `'$${args.s}'`,
		class __Sym extends Hkt<[string]> {
			declare body: `$${this[0]}`
		}
	)
})
const p = myScope.type("ButWithADollarOnIt<'a'>") // inferred as "$a"
p.expression // '"$Type<\"a\">"'
p.assert("$a") // throws: must be "$Type<\"a\">" (was "$a")
```

### <a id="note-1361"></a>[#1361](https://github.com/arktypeio/arktype/issues/1361) Scope Without Primitive Types

Built-in keywords can't be excluded from a scope. Aliases always resolve against them, though a scope alias with the same name shadows one (e.g. `bigint: "never"`).

On arktype 2.2.8, `.toJsonSchema()` throws a `ToJsonSchemaError` for anything with no JSON Schema representation. Calling it where each tool schema is defined surfaces unsupported constructs at startup:

```ts
type({ a: "Date" }).toJsonSchema() // throws ToJsonSchemaError
type({ a: "bigint" }).toJsonSchema() // throws ToJsonSchemaError
```

### <a id="note-1370"></a>[#1370](https://github.com/arktypeio/arktype/issues/1370) TypeScript issues with large recursive schema

Still reproduces on arktype 2.2.8 with TS 6 and 7. The depth error comes from the number of branches in one string union, not the cycle. A non-cyclic module with a 26-alias union fails too, and so does a plain `type()` union of 25 quoted string literals (24 type-checks).

Splitting the union across private aliases makes the original module type-check, with `componentModule.component.infer` usable:

```ts
"#componentA": "string | accordion | alert | button | card | container | conversation | converter | dropdownMenu | each | editableText | fileInput | flexbox",
"#componentB": "icon | input | jsonata | micSelector | pill | responseViewer | select | separator | state | tabs | text | textarea | tooltip",
"#singleComponent": "componentA | componentB",
```

With `declaration` enabled, exporting anything typed from the module still needs an explicit annotation (TS7056).

### <a id="note-1375"></a>[#1375](https://github.com/arktypeio/arktype/issues/1375) Allow liftArray or direct chaining to work with certain nested morphs

Still reproduces on arktype 2.2.8. `type.keywords.Array.liftFrom(myData)` throws the same ParseError even on its own, outside an object. The same-morph workaround from #1374 (`type(myData, "=>", toArray).or([type(myData.array()), "=>", toArray])`) also throws.

A workaround that runs: normalize first, then validate:

```ts
const T = type({
	"props?": "string",
	"objectArray?": type("object").pipe(toArray).to(myData.array())
})
T({ objectArray: { bool: "true" } }) // { objectArray: [{ bool: true }] }
T({ objectArray: [{ bool: 1 }] }).toString() // objectArray[0].bool must be a string (was a number)
```

### <a id="note-1380"></a>[#1380](https://github.com/arktypeio/arktype/issues/1380) Context-free traversal for determinstic morph at path

Doesn't reproduce on the `featherduster` branch (#1685). Since 333fea95f ("transform valid data in a compiled copy-on-write pass"), `tDelete.internal.rootApplyStrategy` is `"transform"` rather than the `"contextual"` it is on arktype 2.2.8, so it no longer needs traversal context. Rough local timing of `tDelete` on the issue's types, with an undeclared key at both levels: ~27µs on arktype 2.2.8, ~170ns on the branch.

### <a id="note-1403"></a>[#1403](https://github.com/arktypeio/arktype/issues/1403) Add dedicated error code for undeclared key

Still a `predicate` error on arktype 2.2.8 (`code: "predicate"`, `expected: "removed"`). Until it has its own code, a global `predicate` message can single it out:

```ts
configure({
	predicate: {
		message: ctx =>
			ctx.expected === "removed" ? `unknown key ${ctx.propString}` : ctx.problem
	}
})

type({ "+": "reject", a: "string" })({ a: "x", b: 1 }) // summary: "unknown key b"
```

### <a id="note-1412"></a>[#1412](https://github.com/arktypeio/arktype/issues/1412) Unable to directly configure top-level intersection error message

Still reproduces on arktype 2.2.8, and the scope-level `intersection.message` workaround above still works there. With `"@"` instead of `message`, the description is applied to each constituent, so the bullets repeat:

```ts
const T = type("string.email > 0", "@", "Email is not valid")
const out = T("")
console.log(out instanceof type.errors ? out.summary : out)
// ("") must be...
//   ◦ Email is not valid
//   ◦ Email is not valid
```

The merged error is created in `ArkErrors.add` (ark/schema/shared/errors.ts) without any meta.

### <a id="note-1415"></a>[#1415](https://github.com/arktypeio/arktype/issues/1415) React Native: TypeError: \_result.isRoot is not a function (it is undefined)

The root cause is the one patched in the last comment: `Disjoint.withPrefixKey` returned a plain array on Hermes, so `.isRoot()` was called on it. The same guard landed in #1674 (from #1645) and was released in arktype 2.2.7.

Simulating Hermes on arktype 2.2.8 with `Object.defineProperty(Disjoint, Symbol.species, { get: () => Array })`, the `type(NovelItem).or(MangaItem).or(AnimeItem)` union from this issue and the `type.match` cases above both work, while the previous `withPrefixKey` under the same simulation throws `TypeError: result.isRoot is not a function`.

The iOS `Cannot convert undefined value to object` error may have a different cause and would need its own repro.

### <a id="note-1418"></a>[#1418](https://github.com/arktypeio/arktype/issues/1418) Alias for object property names to be shown in error messages

Same request as #1431. Until there's a label option, mapping `issues` through a label table works on arktype 2.2.8, including for missing keys:

```ts
const labels: Record<string, string> = { dob: "Date of Birth" }
const User = type({ dob: "string.date", name: "string" })
const out = User({ name: 5 })
if (out instanceof type.errors)
	console.log(
		out.issues.map(e => `${labels[e.propString] ?? e.propString} ${e.problem}`)
	)
// [ 'Date of Birth must be a string (was missing)', 'name must be a string (was a number)' ]
```

A per-key `.configure({ message: ctx => `Date of Birth ${ctx.problem}` })` also works, but a missing `dob` still reports `dob must be a string (was missing)`.

### <a id="note-1420"></a>[#1420](https://github.com/arktypeio/arktype/issues/1420) Light Mode Docs

Pointers for anyone picking this up: the light theme is now `arkthemes/arklight.json` (ark/themes/arklight.json). Dark mode is forced in two places: ark/docs/app/layout.tsx hard-codes the `dark` class on `<html>` and passes `theme: { enabled: false }` to `RootProvider`, and `shikiConfig` in ark/docs/lib/shiki.ts maps both `dark` and `light` to `arkDarkTheme`.

### <a id="note-1431"></a>[#1431](https://github.com/arktypeio/arktype/issues/1431) Error-specific property aliases

Duplicate of #1418. A partial workaround on arktype 2.2.8 is to configure `message` on the value. It doesn't cover missing keys, because the parent object reports those:

```ts
const User = type({
	dob: type("string.date.iso").configure({
		message: ctx => `Date of birth ${ctx.problem}`
	})
})
User({ dob: "nope" }).toString()
// Date of birth must be an ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ) date (was "nope")
User({}).toString()
// dob must be a string (was missing)
```

### <a id="note-1434"></a>[#1434](https://github.com/arktypeio/arktype/issues/1434) fn docs

`type.fn` is documented in the `fn` section of the Expressions page (https://arktype.io/docs/expressions#fn) and in the 2.2 release post, both added in 2.2.0 (#1594).

### <a id="note-1435"></a>[#1435](https://github.com/arktypeio/arktype/issues/1435) Improve partially discriminated error context

Still reproduces on arktype 2.2.8, including when the discriminant is present but invalid:

```ts
Thing({ type: "e" }).toString()
// type must be "c" or "d" (was "e")
// val3 must be a number (was missing)
```

In `discriminate` (ark/schema/roots/union.ts), only disjoints of kind `"domain"` or `"unit"` become switch cases. `"a"` vs `"c" | "d"` is a `"union"` disjoint, so the third branch becomes the `default` case and its own errors are reported. With `type: "'c'"` instead, the output is `type must be "a", "b" or "c" (was "e")`. #1491 has the same cause.

### <a id="note-1437"></a>[#1437](https://github.com/arktypeio/arktype/issues/1437) Deeply nested scopes breaks type inference of generics mixed with private alias

Still reproduces on arktype 2.2.8 (runtime is correct; only the inferred type of `Thing3` is `never`). Cause: `instantiateExport` in `ark/type/module.ts` matches `GenericAst<infer params, infer body, infer body$>`, and since `GenericAst`'s `arg$` parameter defaults to `$`, `body$` is inferred from both positions; after the second export the inferred scope no longer includes the private alias. Doesn't reproduce on the `featherduster` branch (#1685), which infers it from `$` only (`GenericAst<infer params, infer body, infer body$, any>`).

### <a id="note-1446"></a>[#1446](https://github.com/arktypeio/arktype/issues/1446) How to properly set up a discriminated union?

ArkType discriminates every union automatically, so no key needs to be specified. On arktype 2.2.8 the schema in the issue already switches on `type`:

```ts
const Union = UnionTypeOne.or(UnionTypeTwo).or(UnionTypeThree)
const ResponseSchema = type({ union: Union })

ResponseSchema({ union: { type: "4" } }).toString()
// union.type must be "2", "3" or "1" (was "4")
ResponseSchema({ union: { type: "2", bar: "x" } }).toString()
// union.bar must be a number (was a string)

// static check that every branch has `type`
type assertDiscriminated<t extends { type: string }> = t
type _ok = assertDiscriminated<typeof Union.infer>
// fails to typecheck if a branch like type({ qux: "string" }) is added
```

### <a id="note-1447"></a>[#1447](https://github.com/arktypeio/arktype/issues/1447) Question: Can I detect when a field in an object is from another defined type?

Inferred types are structural, so a property can't be identified as "from another Type" after the fact. Making the reference shape a generic parameter gives both variants from one definition (verified on arktype 2.2.8):

```ts
const X = type({ name: "string", address: "string" })
const Y = generic("ref")({
	name: "string",
	anotherObject: { prop1: "string", prop2: "number < 10" },
	x: "ref[]"
})
const FlatY = Y(type(/^@X\//))
const FullY = Y(X)

const data = { name: "y", anotherObject: { prop1: "a", prop2: 1 } }
FlatY({ ...data, x: ["@X/1"] }) // ok
FlatY({ ...data, x: [{ name: "X", address: "a" }] }).toString()
// x[0] must be a string (was an object)
```

`typeof FlatY.infer` and `typeof FullY.infer` are the two shapes. Pass `X.or(Ref)` to accept either. In a scope, `"Z<ref>": { name: "string", y: { "[string]": "Y<ref>" } }` threads the same parameter through nested models.

### <a id="note-1448"></a>[#1448](https://github.com/arktypeio/arktype/issues/1448) Possibly a bug with `string.numeric`

`string.numeric` only matches decimal notation (`numericStringMatcher` in `ark/util/numbers.ts`), so on arktype 2.2.8 `"0.00000000057153"` and `".5"` pass while `"5.7153e-10"` and `"1e3"` don't. A regex that also allows an exponent works as a drop-in:

```ts
const Scientific = type(/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i).pipe(s =>
	Number(s)
)
Scientific("5.7153e-10") // 5.7153e-10
Scientific("1E3") // 1000
```

### <a id="note-1450"></a>[#1450](https://github.com/arktypeio/arktype/issues/1450) When using enum type, it's not possible to specify both default value and description simultaneously.

`@` is only valid in tuple, args or fluent form, not inside a string definition, and a default can't be nested inside an `@` tuple since it's only valid as the property's own definition. Put the described tuple on the left side of the default tuple instead (arktype 2.2.8):

```ts
const T = type({
	audioLanguage: [
		["'auto' | 'en' | 'zh'", "@", "Language of the audio"],
		"=",
		"auto"
	]
})
T({}) // { audioLanguage: "auto" }
T.toJsonSchema().properties.audioLanguage
// { anyOf: [...], description: "Language of the audio", default: "auto" }
```

`type("'auto' | 'en' | 'zh'").describe("...").default("auto")` produces the same result. The description repeated on each `anyOf` branch is tracked in #1470.

### <a id="note-1454"></a>[#1454](https://github.com/arktypeio/arktype/issues/1454) can we choose fields for .partial() and .required()?

`partial` and `required` don't accept keys, but the same result works with `omit`/`pick`/`merge` or `map` on arktype 2.2.8:

```ts
const User = type({ _id: "string", email: "string", whatsapp: "string" })
const CartUser = User.partial()

const OrderUser = CartUser.required()
	.omit("whatsapp")
	.merge(CartUser.pick("whatsapp"))
// { _id: string, email: string, whatsapp?: string }

const OrderUser2 = CartUser.map(prop =>
	prop.key === "whatsapp" ?
		prop
	:	{ kind: "required", key: prop.key, value: prop.value }
)
// { _id: string, email: string, whatsapp?: string }
```

### <a id="note-1456"></a>[#1456](https://github.com/arktypeio/arktype/issues/1456) enumerated with single entry gets converted to const in Json Schema

`type.enumerated("foo")` is the same Type as `type("'foo'")`, so a single-value enum isn't distinguishable after parsing, and `{ const: "foo" }` accepts exactly the values `{ enum: ["foo"] }` does. On arktype 2.2.8:

```ts
type.enumerated("foo").equals(type("'foo'")) // true
type.enumerated("foo").toJsonSchema() // { $schema: ..., const: "foo" }
type.enumerated("foo", "bar").toJsonSchema() // { $schema: ..., enum: ["bar", "foo"] }
```

A consumer that requires `enum` can rewrite `const: x` to `enum: [x]` after generation. #1571 tracks a `jsonSchema` meta property for overriding a type's generated schema.

### <a id="note-1457"></a>[#1457](https://github.com/arktypeio/arktype/issues/1457) `never` property type when using generic types

Still reproduces on arktype 2.2.8 with a smaller case: a generic from a nested submodule, given an alias of the referencing scope, infers that alias's own references as `never`. Validation at runtime is correct.

```ts
const utils = scope({
	Id: "string",
	Mod: scope({
		"#extract": type("unknown").pipe(v => v),
		"refs<t>": "extract |> t[]"
	}).export()
})
const $ = scope({
	...utils.export(),
	A: { refs: "Mod.refs<B>" },
	B: { id: "Id" }
}).export()

type A = typeof $.A.infer // { refs: { id: never }[] }
```

Doesn't reproduce on the `featherduster` branch (#1685), where it infers `{ refs: { id: string }[] }`. Possibly related: #1437.

### <a id="note-1459"></a>[#1459](https://github.com/arktypeio/arktype/issues/1459) Allow to use `$ref` for json schema generation

arktype 2.2.8 has a `useRefs` option that moves shared object types into `$defs` and references them:

```ts
const Inner = type({ name: "string" }).configure({ title: "Inner" })
const Outer = type({ a: Inner, b: Inner }).configure({ title: "Outer" })
Outer.toJsonSchema({ useRefs: true, dialect: null })
// { $ref: "#/$defs/intersection224", $defs: {
//   intersection224: { ..., properties: { a: { $ref: "#/$defs/intersection218" }, b: { $ref: "#/$defs/intersection218" } } },
//   intersection218: { type: "object", title: "Inner", ... } } }
```

The `$defs` keys are internal node ids, a titled `string` is still inlined, and there's no way to point at a path outside the generated document. #1467 proposes a `defId` meta key for naming definitions, and #1571 tracks a `jsonSchema` meta property for overriding a type's generated schema.

### <a id="note-1461"></a>[#1461](https://github.com/arktypeio/arktype/issues/1461) Allow array of readonly arrays for ArkError

`path` matches Standard Schema's issue `path`, a flat list of keys, so each error describes one location. A failure involving several values can be reported as one error per path with `relativePath` (arktype 2.2.8):

```ts
const Range = type({ min: "number", max: "number" }).narrow((data, ctx) => {
	if (data.min <= data.max) return true
	const message = "min must not exceed max"
	ctx.reject({ message, relativePath: ["min"] })
	return ctx.reject({ message, relativePath: ["max"] })
})

Range({ min: 2, max: 1 }) // ArkErrors with two errors at paths ["min"] and ["max"]
```

### <a id="note-1462"></a>[#1462](https://github.com/arktypeio/arktype/issues/1462) toJsonSchema() fails when a field is `string | undefined`

This is the documented `unit` fallback code: `undefined` has no JSON Schema equivalent, so `toJsonSchema()` throws by default (see https://arktype.io/docs/configuration#fallback-codes). It can be handled per code. Output on arktype 2.2.8:

```ts
type({ maybe: "string | undefined" }).toJsonSchema({
	fallback: { unit: ctx => (ctx.unit === undefined ? { not: {} } : ctx.base) }
})
// properties.maybe: { anyOf: [{ type: "string" }, { not: {} }] }
```

If the key can be absent, `"maybe?": "string"` emits `{ type: "string" }` with no fallback needed.

The `type.enumerated` case in the comment comes from passing an array. `enumerated` is variadic: `type.enumerated("first", "sec")` emits `{ enum: ["first", "sec"] }`.

### <a id="note-1463"></a>[#1463](https://github.com/arktypeio/arktype/issues/1463) Allow merging of ArkErrors with additional ArkError in pipe

A root `.pipe` or `.narrow` gets the validated input type, so it only runs once the whole object is valid. A check that depends on a single field can live on that key, where it runs regardless of failures at sibling keys and all errors are reported together (arktype 2.2.8):

```ts
const T = type({
	foo: type("string").narrow((s, ctx) => s !== "Foo" || ctx.reject("not Foo")),
	bar: "number"
})
T({ foo: "Foo" }).toString()
// bar must be a number (was missing)
// foo must be not Foo (was "Foo")
```

### <a id="note-1465"></a>[#1465](https://github.com/arktypeio/arktype/issues/1465) Producing JsonSchema with discriminator field

`configure` applies meta to every branch of a union by default. Passing `"self"` as the second argument attaches it only to the union itself, and custom keys can be typed via `ArkEnv.meta()`. On arktype 2.2.8 the object is emitted as-is rather than as `"$ark.object189"`:

```ts
declare global {
	interface ArkEnv {
		meta(): {
			name?: string
			discriminator?: { propertyName: string; mapping?: Record<string, string> }
		}
	}
}
const Customer = Person.or(Company).configure(
	{
		discriminator: {
			propertyName: "type",
			mapping: {
				person: "#/components/schemas/Person",
				company: "#/components/schemas/Company"
			}
		}
	},
	"self"
)
Customer.toJsonSchema({ dialect: null })
// { anyOf: [{ ...Company }, { ...Person }], discriminator: { propertyName: "type", mapping: { ... } } }
```

For separate component schemas, call `Person.toJsonSchema({ dialect: null })` and `Company.toJsonSchema({ dialect: null })` and build the `oneOf` with your own `$ref`s. Generating named `$ref`s automatically is tracked in #1459.

### <a id="note-1468"></a>[#1468](https://github.com/arktypeio/arktype/issues/1468) Narrow expressions not executed when type is spread

This is documented behavior: spread/`merge` build a new object from the properties only, so a root narrow isn't carried over (see https://arktype.io/docs/objects#properties-structural). An intersection keeps it. In the scope from the issue, on arktype 2.2.8:

```ts
fullSchema: () =>
	registrationScope.type([
		"passwordWithConfirmation",
		"&",
		{ email: "string", firstName: "string", lastName: "string" }
	])
// with the data from the issue:
// confirmPassword must be identical to password
```

Outside a scope, `PasswordWithConfirmation.and({ ... })` does the same.

### <a id="note-1469"></a>[#1469](https://github.com/arktypeio/arktype/issues/1469) pattern in configure is not typed

Custom meta keys are typed by extending `ArkEnv.meta()` (https://arktype.io/docs/configuration#metadata). Unknown keys are passed through to `toJsonSchema()`. On arktype 2.2.8:

```ts
declare global {
	interface ArkEnv {
		meta(): { pattern?: string; multipleOf?: number }
	}
}
const Name = type("string").configure({ pattern: "^[a-z]+$" })
const Num = type("number").configure({ multipleOf: 0.1 })
type({ name: Name, n: Num }).toJsonSchema()
// properties: { n: { type: "number", multipleOf: 0.1 }, name: { type: "string", pattern: "^[a-z]+$" } }
Name("ABC") // "ABC"
```

Meta isn't validated (`"ABC"` passes). For `pattern`, `type({ name: /^[a-z]+$/ })` validates and emits the same `pattern`. A dedicated `jsonSchema` meta property is tracked in #1571.

### <a id="note-1475"></a>[#1475](https://github.com/arktypeio/arktype/issues/1475) `toJsonSchema()` fails when a field is `string.url`

Still reproduces on arktype 2.2.8. `string.url` validates with a predicate (`URL.canParse`), and predicates throw by default in `toJsonSchema`. The keyword already carries `format: "uri"`, so ignoring the predicate gives the expected output:

```ts
type({ url: "string.url" }).toJsonSchema({
	fallback: { predicate: ctx => ctx.base }
})
// { $schema: "...", type: "object", properties: { url: { type: "string", format: "uri" } }, required: ["url"] }
```

Note that this fallback drops every predicate in the type, not just this one. `string.date` behaves the same way. Related: #1571.

### <a id="note-1476"></a>[#1476](https://github.com/arktypeio/arktype/issues/1476) Recursive conjunction causes OOM

Still reproduces on arktype 2.2.8: exporting the scope from the issue doesn't finish (no result after 60 s, memory past 1.4 GB and growing), and a plain-object version (`T: "Leaf | TT | TF"`, `F: "Leaf | FF | FT"` with overlapping `{ kind: "'and'", left, right }` branches) throws `RangeError: Maximum call stack size exceeded`. Doesn't reproduce on the `featherduster` branch (#1685): the issue's scope exports in about 120 ms and `Truthy`/`Falsy` classify nested `And`/`Or`/`Not` values correctly.

### <a id="note-1479"></a>[#1479](https://github.com/arktypeio/arktype/issues/1479) Custom error messages don't work on morph

Still reproduces on arktype 2.2.8, for number inputs too (`Thing(999999)` shows the default message). Shallow `.configure` reaches the pipe's input but not the validator passed to `.to()`, which isn't a child of the morph node. Configuring the output type directly works:

```ts
const Port = type("0<number<=65535").configure({
	message: () => "custom port error"
})
const Thing = type("string.numeric.parse | number").to(Port)
Thing("999999").toString() // "custom port error"
Thing("abcd").toString() // "must be a well-formed numeric string (was \"abcd\")"
```

To cover both sides, configure the input as well.

### <a id="note-1481"></a>[#1481](https://github.com/arktypeio/arktype/issues/1481) index signature including literals (e.g. string.uuid) treated as having required keys

Still reproduces on arktype 2.2.8. `string.uuid` is `versioned | nil | max`, where nil and max are literals, so they become required keys at runtime. The inferred type is `{ [x: string]: string | number }`, which accepts `{}`:

```ts
const Uuid = type({ "[string.uuid]": "number | string" })
String(Uuid({}))
// value at ["00000000-0000-0000-0000-000000000000"] must be a number or a string (was missing)
// value at ["ffffffff-ffff-ffff-ffff-ffffffffffff"] must be a number or a string (was missing)
const ok: typeof Uuid.infer = {} // no type error
```

### <a id="note-1483"></a>[#1483](https://github.com/arktypeio/arktype/issues/1483) declare dont work with optional()

No longer reproduces on arktype 2.2.8. Optionality from a property value has been accepted by `declare` since 2.1.28. This typechecks with no errors, with `exactOptionalPropertyTypes` on or off, and a mismatched value still errors:

```ts
type User = { name: string; age?: number }

declare<User>().type({
	name: "string",
	age: type("number").optional()
})

declare<User>().type({
	name: "string",
	// @ts-expect-error
	age: type("string").optional()
})
```

### <a id="note-1485"></a>[#1485](https://github.com/arktypeio/arktype/issues/1485) jsonSchemaToType is not allowing $ref

Still unsupported on arktype 2.2.8 with @ark/json-schema 0.0.12, including a plain local ref with no cycle:

```ts
jsonSchemaToType({
	$defs: { s: { type: "string" } },
	type: "object",
	properties: { a: { $ref: "#/$defs/s" } }
})
// ParseError: Provided JSON Schema must have at least one of the keys 'type', 'enum', 'const', 'allOf', 'anyOf', 'oneOf' and 'not' (was {"$ref":"#/$defs/s"})
```

`$ref` is not listed under Limitations in the @ark/json-schema README.

### <a id="note-1486"></a>[#1486](https://github.com/arktypeio/arktype/issues/1486) string.date.parse does not work on cyclic objects

Still reproduces on arktype 2.2.8: `supervisor.lastUpdate` stays `'1'`, and other morphs like `string.trim` are skipped the same way. Because the morph never runs, an unparsable nested date (`supervisor: { lastUpdate: "x" }`) is also accepted. The cause is in ark/schema/roots/union.ts. When a union branch matches, its queued morphs are kept only if `branch.includesTransform` is true, and that is false for the cyclic alias branch `User`. Doesn't reproduce on the `featherduster` branch (#1685), where `supervisor.lastUpdate` is a `Date` and `"x"` fails with `supervisor.lastUpdate must be a parsable date (was "x")`.

### <a id="note-1491"></a>[#1491](https://github.com/arktypeio/arktype/issues/1491) Fully discriminate literal unions nested in properties

Still reproduces on arktype 2.2.8:

```ts
const Thing = type({ tag: '"a"', a: "number" }).or({
	tag: '"b" | "c"',
	bc: "string"
})
Thing({}).toString()
// a must be a number (was missing) or bc must be a string (was missing)
```

Discrimination only builds cases from unit/domain disjoints, so a property whose value is a union of literals is never used as a case. #1435 shows the same root cause with three branches: `a` and `b` become cases, and the `'c' | 'd'` branch becomes the fallback, so its errors show up for any input.

### <a id="note-1492"></a>[#1492](https://github.com/arktypeio/arktype/issues/1492) .partial() is ignoring custom error messages on fields in a type

Still reproduces on arktype 2.2.8. It isn't specific to `.partial()`. Any union that isn't discriminated drops a custom `message` (`.partial()` causes it here by making `type` optional):

```ts
const X = type("string").configure({ message: "custom message" })
type({ a: X, b: "'x'" }).or({ a: X, b: "'y'" })({ a: 1, b: "x" }).toString()
// custom message
type({ "a?": X, "b?": "'x'" })
	.or({ "a?": X, "b?": "'y'" })({ a: 1, b: "x" })
	.toString()
// a must be a string (was a number)
```

The union error's default `expected` (`ark/schema/roots/union.ts`) groups branch errors by path and joins their `expected` values, so each branch's `message` is ignored.

### <a id="note-1510"></a>[#1510](https://github.com/arktypeio/arktype/issues/1510) Unable to set default on referenced `type.string.matching` when defined within scope

Still reproduces on arktype 2.2.8. `.matching()` isn't the trigger: any `.describe()` or `.configure()` call written inline in the `scope()` definition causes it. While the definition is validated, that alias resolves to `never` (a tuple default `["s", "=", () => 5]` reports `Type 'number' is not assignable to type 'never'`), though the final inferred type is `string` and runtime defaults work.

```ts
scope({ s: type.string.describe("x"), payload: { version: "s = 'v0.0.0'" } })
// TS2322: Type '"s = 'v0.0.0'"' is not assignable to type '"Default value 'v0.0.0' must be assignable to s"'
scope({
	s: type.string.matching(/^v.*$/),
	payload: { version: "s = 'v0.0.0'" }
})
// ok
```

### <a id="note-1511"></a>[#1511](https://github.com/arktypeio/arktype/issues/1511) toJsonSchema({ useRefs: true }) fails for partially overlapping discriminated union

Still reproduces on arktype 2.2.8: `Unexpected JSON Schema input for structure: {}`. With `useRefs`, `toJsonSchema` puts every root node in `references` into `$defs` (ark/schema/roots/root.ts:173). That includes the discriminated union's case nodes, which are the branches with their `object` domain pruned (here `{ a: "a" | "b" | "c" }` and `{ a: "a" | "e" | "f" }` with no domain). Serializing a structure with no `type: "object"` throws. #1612 has the same cause (`type({ a: "string" }).or("null").toJsonSchema({ useRefs: true })`). Neither reproduces on the `featherduster` branch (#1685), where `$defs` only holds nodes that a `$ref` reaches.

### <a id="note-1512"></a>[#1512](https://github.com/arktypeio/arktype/issues/1512) string.uuid infer type

`string.uuid` and its `v1`-`v8` subtypes infer `string` in arktype 2.2.8. To type the result as `node:crypto`'s `UUID` without adding a morph, use `.as`:

```ts
import type { UUID } from "node:crypto"
import { type } from "arktype"

const Uuid = type("string.uuid").as<UUID>()
const id: UUID | type.errors = Uuid("00000000-0000-0000-0000-000000000000")
```

### <a id="note-1514"></a>[#1514](https://github.com/arktypeio/arktype/issues/1514) `.onUndeclaredKey('delete')` does not work if added before `.pipe()`, on a `type.or()` schema

No longer reproduces on arktype 2.2.8. The repro from the issue body keeps `_meta` through arktype 2.2.5 and removes it from 2.2.6 on. On 2.2.8 it logs:

```ts
{
  name: 'TypeScript',
  sample: { title: 'OK', description: 'HelloWorld' }
}
```

### <a id="note-1518"></a>[#1518](https://github.com/arktypeio/arktype/issues/1518) How to get correct literals from 'predicate' error ?

`expected` is only a description, so the allowed values have to come from the schema. Get the node at the error's path and select its literals:

```ts
const Schema = type({ path: { to: { key: "'a' | 'b' | 'c'" } } })

const out = Schema({ path: { to: { key: "z" } } })
if (out instanceof type.errors) {
	for (const e of out) {
		const allowed = Schema.internal
			.get(...e.path)
			.select({ kind: "unit" })
			.map(node => node.unit)
		console.log(e.code, allowed) // predicate [ 'a', 'b', 'c' ]
	}
}
```

Verified on arktype 2.2.8. `select` returns every literal under the node, so filter further if the value at that path is an object. For an array element (e.g. path `items[1]`), the result also includes `undefined`.

### <a id="note-1524"></a>[#1524](https://github.com/arktypeio/arktype/issues/1524) `type.map()` collapses discriminated union

Runtime is right in arktype 2.2.8: `.map` runs on each branch, and `T.expression` is `{ name: "number", type: number[] } | { name: "string", type: string[] }`. Only the inferred type merges the branches: the callback's entry is typed from `keyof` of the whole union (`typePropOf` in ark/type/variants/object.ts). With no shared keys the entry is `never`, so `type.or({ a: "string" }, { b: "number" }).map(p => ({ key: p.key, value: p.value.array() }))` fails with `Property 'key' does not exist on type 'never'`. Workaround: map each branch, then union them:

```ts
const NumberField = type({ name: "'number'", type: "number" })
const StringField = type({ name: "'string'", type: "string" })
const T = type.or(
	NumberField.map(p =>
		p.key === "type" ? { ...p, value: p.value.array() } : p
	),
	StringField.map(p =>
		p.key === "type" ? { ...p, value: p.value.array() } : p
	)
)
// Type<{ name: "number"; type: number[] } | { name: "string"; type: string[] }>
```

### <a id="note-1525"></a>[#1525](https://github.com/arktypeio/arktype/issues/1525) Add type error to optional index signature expression like `[sizes]?`

#1580 reports the same thing for a scope key (`'[Locales]?'`). On arktype 2.2.8 the key is still parsed as a literal optional key, but `.expression` prints it like an optional index signature:

```ts
const T = type({ "[string]?": "number" })
T.expression // "{ [string]?: number }"
T({ "[string]": 1 }) // { '[string]': 1 }
// T.infer: { "[string]"?: number }
```

### <a id="note-1532"></a>[#1532](https://github.com/arktypeio/arktype/issues/1532) capture groups inside lookarounds not captured

Still reproduces on arktype 2.2.8 (arkregex 0.0.13). Because dropped groups also shift the indices of later captures, the inferred types can be wrong, not just missing:

```ts
const r = regex("^(?=(a))a(b)$") // inferCaptures: ["b"]
const m = r.exec("ab")!
const second: "b" = m[1] // typechecks, but is "a" at runtime
```

Root cause: `popGroup` in `ark/regex/state.ts` replaces a lookaround group's root with `""`, which throws away its inner AST, including any capture groups in it.

### <a id="note-1533"></a>[#1533](https://github.com/arktypeio/arktype/issues/1533) arkregex: simple regexes' types too deep?

Still reproduces with arkregex 0.0.13 (arktype 2.2.8) on TypeScript 6.0.3 and tsgo 7.1. The limit comes from alternating case-split branches rather than the total number of strings: `regex("relay|relai", "i")`, `regex("abcd|efgh|ijkl", "i")` and `regex("abcdefghij", "i")` all check, while `regex("relay|point|abcde", "i")` hits TS2589. After the error, the inferred type accepts any string.

Workaround that skips type-level parsing (checks and runs on 2.2.8):

```ts
const r = regex.as("relay|relai|point", "i") // Regex<string>
r.test("RELAY") // true
```

### <a id="note-1538"></a>[#1538](https://github.com/arktypeio/arktype/issues/1538) Globally configure format of error messages.

Configuring `actual` for each error kind globally already covers this. One catch: intersection errors are written as `(${actual}) must be...`, so an empty `actual` there leaves `age () must be...` and needs a `problem` override instead. Verified on arktype 2.2.8:

```ts
import { configure } from "arktype/config"

const omitActual = { actual: () => "" }

configure({
	domain: omitActual,
	unit: omitActual,
	proto: omitActual,
	union: omitActual,
	required: omitActual,
	min: omitActual,
	max: omitActual,
	minLength: omitActual,
	maxLength: omitActual,
	exactLength: omitActual,
	pattern: omitActual,
	divisor: omitActual,
	before: omitActual,
	after: omitActual,
	predicate: omitActual,
	intersection: { problem: ctx => `must be...\n${ctx.expected}` }
})
```

`type({ age: "number.integer >= 18" })({ age: 1.5 })` then reports `age must be...` followed by the bulleted list, and a missing key reports `a must be a string`, with no `(was ...)`.

### <a id="note-1543"></a>[#1543](https://github.com/arktypeio/arktype/issues/1543) Discrimination with optional never

On arktype 2.2.8 the snippet above works in a fresh process, but still throws if a simpler union with the same defaulted keys was created first:

```ts
type({ bookingCode: "string", registrationStatus: '"EXPIRED" = "EXPIRED"' }).or(
	{
		"bookingCode?": "never",
		registrationStatus: '"REJECTED" = "REJECTED"'
	}
) // works

const Thing = Expired.or(Rejected)
// ParseError: Invalid intersection of default values "EXPIRED" & "REJECTED"
```

Doesn't reproduce on the `featherduster` branch (#1685): in the same order, `Thing({ bookingCode: "abc", passengers: [...] })` returns the `EXPIRED` branch with the default applied.

### <a id="note-1546"></a>[#1546](https://github.com/arktypeio/arktype/issues/1546) JSON Schema generation fails for discriminated unions in recursive scopes

Still reproduces on arktype 2.2.8: both the scope above and the two-props-per-branch case from the comment throw `Unexpected JSON Schema input for structure: {}`. Cyclic types always generate with refs, and the generated `$defs` include the union's discriminated case nodes with the `kind` key pruned (e.g. `{ value: string }`), which have no `object` domain. A non-recursive discriminated union with `toJsonSchema({ useRefs: true })` throws the same error (#1511, #1612).

Doesn't reproduce on the `featherduster` branch (#1685). There, `s.type("SearchNode").toJsonSchema()` returns a `$ref` to a `Node` def whose `data` refs an `anyOf` of the two branches.

### <a id="note-1568"></a>[#1568](https://github.com/arktypeio/arktype/issues/1568) Arktype doesn't work with @date-fns/utc UTCDate class.

Still reproduces on arktype 2.2.8 with `@date-fns/utc` 2.1.1, and with any `Date` subclass, whenever the type contains a morph:

```ts
type.instanceOf(UTCDate).pipe(d => d.toISOString())(new UTCDate(0))
// TypeError: Method Date.prototype.toISOString called on incompatible receiver [object Object]
```

Before a morph runs, the default `clone` (`ark/util/clone.ts`) copies the input. A subclassed `Date` isn't recognized as `Date`, so it is copied with `Object.create(prototype)`, which drops its internal date value. Workaround, verified on 2.2.8: `configure({ clone: false })` from `arktype/config` before importing `arktype`. Doesn't reproduce on the `featherduster` branch (#1685).

### <a id="note-1570"></a>[#1570](https://github.com/arktypeio/arktype/issues/1570) Jsdoc is lost

This comes from TypeScript's declaration emit, not ArkType: JSDoc is kept when a property is printed from its source node, but dropped when it is printed from an evaluated mapped type, which is what any inferred ArkType object is. Plain TS (TS 6.0 and 7.1 give the same output):

```ts
type show<t> = { [k in keyof t]: t[k] } & unknown
declare const show: <t>(t: t) => show<t>
export const a = show({
	/** doc a */
	x: 1
})
// .d.ts: export declare const a: { x: number; };
```

Keeping JSDoc in the emitted `.d.ts` currently requires an explicitly declared interface.

### <a id="note-1575"></a>[#1575](https://github.com/arktypeio/arktype/issues/1575) Standard JSON Schema Default Values

Reproduces on arktype 2.2.8. `toJsonSchema()` emits `default`, but `~standard.jsonSchema.input()` converts `.in`, which drops defaults (`OptionalNode` in `ark/schema/structure/optional.ts`). Calling `toJsonSchema` directly with a morph fallback gives the input schema with defaults, including for types with morphs:

```ts
const T = type({ name: 'string = "First"', age: "string.numeric.parse" })
T["~standard"].jsonSchema.input({ target: "draft-07" })
// properties.name: { type: "string" }
T.toJsonSchema({ target: "draft-07", fallback: { morph: ctx => ctx.base } })
// properties.name: { type: "string", default: "First" }, required: ["age"]
```

### <a id="note-1576"></a>[#1576](https://github.com/arktypeio/arktype/issues/1576) is ArkRegex a drop-in replacement for `new RegExp` even with dynamic patterns?

This is by design: `regex()` validates its pattern at the type level, so a pattern typed as plain `string` can't be proven valid and is rejected. "Drop-in replacement" refers to runtime parity: `regex(src, flags)` is `new RegExp(src, flags)` and accepts every pattern `new RegExp` does.

For a pattern only known at runtime, use `regex.as`:

```ts
declare const p: string
regex(p) // TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
regex.as(p) // compiles, Regex<string, {}>
regex.as<`${string}@${string}`>(p) // if you know the shape of its matches
```

### <a id="note-1580"></a>[#1580](https://github.com/arktypeio/arktype/issues/1580) Optional object index signatures do not work.

Same request as #1525: `"[Locales]?"` isn't an optional index signature, it's parsed as a literal optional key named `[Locales]` (`Thing.Option.expression` is `{ [Locales]?: string }`). Defining the signature and making it partial works on arktype 2.2.8:

```ts
const Thing = scope({
	Locales: '"en" | "nl" | "de"',
	LocalizedBase: { "[Locales]": "string" },
	Option: "Partial<LocalizedBase>"
}).export()

Thing.Option.expression // { de?: string, en?: string, nl?: string }
String(Thing.Option({ nl: 5 })) // nl must be a string (was a number)
```

The piped key falls under #817 (morph keys): the morph isn't applied to keys and the signature currently matches every string key, e.g. `{ fr: 5 }` fails with `fr must be a string (was a number)`.

### <a id="note-1581"></a>[#1581](https://github.com/arktypeio/arktype/issues/1581) `arktypeio.arkdark` syntax highlighting does not close strings in `type()` calls

Tokenizing this repro with the extension's 6.6.0 injection grammar (`ark/extension/injected.tmLanguage.json`) on the TypeScript and TypeScriptReact grammars shipped with code-oss 1.107.1 (via vscode-textmate) gives the expected scopes in both `source.ts` and `source.tsx`: the JSDoc line is `comment.block.documentation.ts` and the `''` in `Thing.from('')` is a closed `string.quoted.single.ts`. Does it still happen with `arktypeio.arkdark` disabled, and with every other extension disabled? The output of "Developer: Inspect Editor Tokens and Scopes" on a mis-highlighted token in the comment would show which grammar produced the wrong scope.

### <a id="note-1587"></a>[#1587](https://github.com/arktypeio/arktype/issues/1587) Union with common merge child doesn't find error in child

Still reproduces on arktype 2.2.8, and it doesn't need `Merge` or `"+": "reject"`:

```ts
const m = type.module({
	Node: { "category?": "number", "inner?": "Node" },
	A: { "inner?": "Node", "test1?": "string" },
	B: { "inner?": "Node", "test2?": "string" }
})
const data = { inner: { category: "Test" } }
console.log(m.A.allows(data), m.B.allows(data), m.A.or(m.B).allows(data))
// false false true
```

Cause: alias traversal (`ark/schema/roots/alias.ts:161`) records every object it visits in `ctx.seen` and never removes it, so after branch `A` fails on `inner`, branch `B` treats `inner` as an already-visited cycle and accepts it. Doesn't reproduce on the `featherduster` branch (#1685), which reports `inner.category must be a number (was a string)`.

### <a id="note-1591"></a>[#1591](https://github.com/arktypeio/arktype/issues/1591) Infer for modules/scopes

No built-in for this on arktype 2.2.8. A `Scope` exposes `t` (`typeof $.t`), but that's the internal representation, where a morph like `string.date.parse` appears as `(In: string) => To<Date>` rather than `Date`, so for output types the mapped type in the issue is the way to get them all at once.

### <a id="note-1595"></a>[#1595](https://github.com/arktypeio/arktype/issues/1595) jsonSchemaToType: `{ type: "string", enum: [...] }` throws "Intersection of string and object results in an unsatisfiable type"

No longer reproduces with @ark/json-schema 0.0.12 (arktype 2.2.8):

```ts
jsonSchemaToType({ type: "string", enum: ["stable", "latest"] }).expression
// "latest" | "stable"
jsonSchemaToType({
	type: "string",
	enum: ["stable", "latest"],
	default: "latest"
}).expression
// "latest" | "stable"
jsonSchemaToType({
	type: "object",
	properties: { mode: { type: "string", enum: ["append", "replace"] } }
}).expression
// { mode?: "append" | "replace" }
```

The enum array was passed to `type.enumerated` as a single value (an object), hence `string & object`. #1566 fixed it, first released in @ark/json-schema 0.0.5.

### <a id="note-1598"></a>[#1598](https://github.com/arktypeio/arktype/issues/1598) Make "number" reject Infinity, or make it easy to parse only finite numbers

On the `featherduster` branch (#1685), `number` rejects `Infinity` and `-Infinity` by default (`must be a number (was Infinity)`). To allow them again, use `configure({ numberAllowsInfinity: true })` for every type, or the `number.Infinity` and `number.NegativeInfinity` keywords in a single type.

On arktype 2.2.8, a narrow works:

```ts
const Finite = type("number").narrow(
	(n, ctx) => Number.isFinite(n) || ctx.mustBe("finite")
)
Finite(Infinity).toString() // must be finite (was Infinity)
```

### <a id="note-1599"></a>[#1599](https://github.com/arktypeio/arktype/issues/1599) Zed extension

ArkType's completions come from the TypeScript language server, not from ArkDark. The VS Code extension adds syntax highlighting for definition strings, ErrorLens settings for inline errors, and `editor.quickSuggestions.strings` so completions appear inside strings (see `ark/extension/package.json`). A Zed port would mostly be the highlighting, which Zed does with tree-sitter rather than TextMate grammars. Related: #989 (Neovim), #1616 (JetBrains).

### <a id="note-1607"></a>[#1607](https://github.com/arktypeio/arktype/issues/1607) Support for Ordered Unions and/or Matchers as types

The error-path part doesn't reproduce on the `featherduster` branch (#1685): with the `match` workaround from the playground, `Thing({ dbConfig: {} })` reports `dbConfig.url must be a string (was missing) or dbConfig.host must be a string (was missing)`. arktype 2.2.8 drops the `dbConfig.` prefix.

The `.and`/`.merge` snippet from the comments doesn't throw on arktype 2.2.8. The quoted error matches a morph with `unknown` input unioned with `null`:

```ts
type.unknown.pipe(v => v).or("null")
// ParseError: An unordered union of a type including a morph and a type with overlapping input is indeterminate:
// Left: (In: unknown) => Out<unknown>
// Right: null
```

### <a id="note-1612"></a>[#1612](https://github.com/arktypeio/arktype/issues/1612) toJsonSchema throws "Unexpected JSON Schema input for structure: {}" error when useRefs is true when structure is first child of intersection.

Doesn't reproduce on the `featherduster` branch (#1685), where JSON Schema generation was rewritten:

```ts
JSON.stringify(type({ a: "string" }).or("null").toJsonSchema({ useRefs: true }))
// {"$schema":"https://json-schema.org/draft/2020-12/schema","$ref":"#/$defs/union11","$defs":{"union11":{"anyOf":[{"$ref":"#/$defs/intersection22"},{"type":"null"}]},"intersection22":{"type":"object","properties":{"a":{"type":"string"}},"required":["a"]}}}
```

On arktype 2.2.8 it still throws `Unexpected JSON Schema input for structure: {}`, also for `.or("string")` and for the same union nested at a key. Possibly related: #1511, #1546.

### <a id="note-1613"></a>[#1613](https://github.com/arktypeio/arktype/issues/1613) Improve `unordered union` error message

In this repro the error comes from the `.or(...)` call itself, before the union is assigned to `targets`, so no key exists yet to report. On arktype 2.2.8 the last frame of the stack trace is that call:

```
    at IntersectionNode.or (.../roots/root.ts:257:31)
    at file:///.../repro.ts:7:53
```

`Left` and `Right` print identically because the `PlayerId`/`LocationId` brands exist only at the type level. At runtime, both branches are `string[]` inputs with a morph.

### <a id="note-1616"></a>[#1616](https://github.com/arktypeio/arktype/issues/1616) Update Jetbrains Plugin

The JetBrains plugin isn't maintained in this repo. Its source is https://github.com/niklas-wortmann/arktype-idea-plugin, and its latest marketplace release (0.0.5) declares `until` 253._, so the 261._ compatibility bump has to land there. That repo has no open issue for it yet.

### <a id="note-1621"></a>[#1621](https://github.com/arktypeio/arktype/issues/1621) Add string.boolean.parse keyword

The `.pipe(Boolean)` workaround above maps `"false"` to `true`, since every non-empty string is truthy. Output on arktype 2.2.8:

```ts
type('0|1|boolean|null|undefined|"true"|"false"').pipe(Boolean)("false") // true

const BooleanString = type("'true' | 'false'").pipe(s => s === "true")
BooleanString("false") // false
BooleanString("yes").toString() // must be "false" or "true" (was "yes")
```

### <a id="note-1624"></a>[#1624](https://github.com/arktypeio/arktype/issues/1624) Tuple morph with un-annotated parameter infers `.infer` as `never` when the return depends on that parameter

Same root cause as #577: inside `scope()`, a tuple-expression morph with a contextually typed parameter infers its output as `never`. It still reproduces on arktype 2.2.8 under TS 6 and TS 7, and it isn't limited to object inputs. `["string", "=>", s => s.length]` as a scope alias infers `never`, while `type(["string", "=>", s => s.length])` infers `number`.

### <a id="note-1627"></a>[#1627](https://github.com/arktypeio/arktype/issues/1627) [feature request] Validate while ignoring constraints (structure-only comparison)

A workaround that works on arktype 2.2.8 uses the internal node transform to drop refinement nodes. `.internal` is not a stable API:

```ts
const NewBlogPost = type({
	title: "string < 100",
	content: "string < 1000",
	authorId: "number.integer >= 0"
})

const refinements = new Set([
	"min",
	"max",
	"minLength",
	"maxLength",
	"exactLength",
	"divisor",
	"pattern",
	"predicate",
	"before",
	"after"
])

const BlogPost = type.raw(
	NewBlogPost.internal.transform((kind, inner) =>
		refinements.has(kind) ? null : inner
	)
) as typeof NewBlogPost

BlogPost.expression // { authorId: number, content: string, title: string }
BlogPost({ title: "x".repeat(200), content: "", authorId: 1.5 }) // returns the input unchanged
BlogPost({ title: 5, content: "", authorId: 1 }).toString() // title must be a string (was a number)
```

### <a id="note-1630"></a>[#1630](https://github.com/arktypeio/arktype/issues/1630) [bug] inconsistent errors for unions with cycles

On arktype 2.2.8, `Group` is still being parsed when `Part` references it, so `Part` becomes `$Group | Field` (`api.Part.json` starts with `"$Group"`). An alias branch keeps the union from being discriminated on `type` (#1026). Doesn't reproduce on the `featherduster` branch (#1685). On arktype 2.2.8, declaring `Part` before `Field` and `Group` avoids it:

```ts
const api = scope({
	Part: "Field | Group",
	Field: { type: "'field'", value: "string >= 1" },
	Group: { type: "'group'", parts: "Part[]" }
}).export()
const out = type({ parts: api.Part.array() })({
	parts: [{ type: "field", value: "" }]
})
// out.map(e => e.code): ["minLength"], summary: "parts[0].value must be non-empty"
```

### <a id="note-1644"></a>[#1644](https://github.com/arktypeio/arktype/issues/1644) scope.import() causes circular type inference when imported definitions participate in ArkEnv.meta augmentation

Still reproduces on arktype 2.2.8. The trigger is any `Type` value inside the scope, not `.import()` specifically: `scope({ BaseMeta: type({ "description?": "string" }), ... })` fails with the same TS2615/TS2577 errors once `ArkEnv.meta()` returns its inferred type. Validating a `Type` in a scope checks it structurally (`def[k] extends type.Any` in `ark/type/scope.ts`), and `Type`'s members refer to `ArkEnv.meta`, which creates the cycle.

Workaround (type-checks cleanly): share the plain definitions rather than a scope or `Type`:

```ts
export const baseMetaDefs = {
	BaseMeta: { "description?": "string" }
} as const

const binaryMeta = scope({
	...baseMetaDefs,
	Binary: { "...": "BaseMeta", popKind: "'binary'" },
	Bitwise: { "...": "Binary", popKind: "'bitwise'" },
	ArkMeta: "Binary | Bitwise"
}).export()
```

### <a id="note-1652"></a>[#1652](https://github.com/arktypeio/arktype/issues/1652) Out of memory error when inintializing a merged type with a lot of or

Still reproduces on arktype 2.2.8 with the code above. Each `.merge` distributes over both unions, so the chain builds 2^11 = 2048 branches. That count is expected, since TS spreads produce the same union. Building the union is the slow part, and it grows superlinearly. A CPU profile splits the time between `reduceBranches`, which intersects every pair of branches, and `discriminate` (both in `ark/schema/roots/union.ts`). Time and heap per merge step on arktype 2.2.8 (Node default heap):

```
Type8   256 branches   4938ms   464MB
Type9   512 branches  43708ms  1120MB
Type10: FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
```

On the `featherduster` branch (#1685) the chain completes, but the last merge (2048 branches) still takes 137s with a 1.9GB heap.

### <a id="note-1663"></a>[#1663](https://github.com/arktypeio/arktype/issues/1663) Regex `\d+` infers `${number}`, which rejects valid digit strings longer than ~309 digits

Still reproduces on arktype 2.2.8: `type("/^\\d+$/")` returns "1" followed by 309 zeros unchanged, but assigning that string to `typeof Digits.infer` (`` `${number}` ``) is a type error. The collapse of repeated digits to `` `${number}` `` happens in `tryFastPath` (`ark/regex/quantify.ts`) and in `appendNonRedundant`/`prependNonRedundant` (`ark/regex/state.ts`). `` `${bigint}` `` is not a sound drop-in replacement, because TS rejects leading zeros:

```ts
const a: `${bigint}` = "0123" // TS2322
const b: `${bigint}` = "000" // TS2322
```
