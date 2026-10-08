# arktype

## Unreleased

### Write error messages in other languages

Configure a locale to write error messages in another language. ArkType ships two: `en`, the default, and `de`.

```ts title="config.ts"
import { configure } from "arktype/config"
import { de } from "arktype/locales/de"

configure({ locale: de })
```

```ts title="app.ts"
import "./config.ts"
import { type } from "arktype"

// ArkErrors: name muss mindestens 2 Zeichen lang sein, ist aber 1 Zeichen lang
type({ name: "string >= 2" })({ name: "A" })
```

`locale` can also be a function, which is called each time a message is read, e.g. to return the locale of the current request. Messages are written when they are read, so validation does no locale work. `ArkErrors` and `ArkError` gain `toLocaleString(locale)`, which writes the summary or message in the locale it is given.

Any message you configure, through `.describe()`, `.configure()` or errors configured by code, outranks the locale. Every error writer receives the active locale as its last argument, so it can translate its own text:

```ts
const Password = type("string >= 8").configure({
	expected: (ctx, locale) =>
		locale.tag === "de" ? "ein sicheres Passwort" : "a secure password"
})
```

A locale is an object typed by `Locale`, which `arktype` exports, so you can spread one to change part of it or write your own. It writes a whole sentence for each error code and may give a code a fragment, like `eine Zeichenkette`, for unions and intersections to list. `de` cites a string you wrote, like a description, since it may be in any language: `muss ein Wert gemäß der Beschreibung „a secure password“ sein`. A locale's writers can also call an i18n library like i18next or Paraglide. See [the docs](https://arktype.io/docs/i18n).

Errors carry what a locale writes from: a `required` error's `missing` and `valueMeta` describe the missing value, a narrow's error references its `predicate`, and built-in keywords with their own text, like `string.email`, set `meta.keyword` to their name. `arktype/i18n` exports `listPattern`, `isolate` and the other helpers `de` is written with, which come from `@ark/util` and `@ark/schema/i18n`. `@ark/schema` exports `en` and the `Locale` types.

Descriptions, expressions, JSON Schema and `ParseError`s stay in English.

https://github.com/arktypeio/arktype/issues/1498

### Give undeclared keys the `undeclared` code

A key that `"+": "reject"` disallows was a `predicate` error. It now has the code `undeclared`, and its `data` is the key's value rather than the object around it, as every other error's `data` is the value at its path:

```ts
const T = type({ "+": "reject", a: "string" })

const out = T({ a: "x", b: 1 })

if (out instanceof type.errors) {
	// previously "predicate", now "undeclared"
	out.issues[0].code
	// previously { a: "x", b: 1 }, now 1
	out.issues[0].data
}
```

Configure its text with `undeclared` instead of `predicate`, e.g. `configure({ undeclared: { problem: "isn't allowed" } })`. The object is the input at `path.slice(0, -1)`. Rejecting a key now reads its value, so a getter or a `Proxy`'s `get` trap runs for it, as it already did for declared keys.

Its message is unchanged, except that meta configured on the object's structure now reaches it:

```ts
// previously b must be removed, now b must be declared
T.configure({ expected: "declared" }, { kind: "structure" })({ a: "x", b: 1 })
```

In an ordered union, like one `match` checks, whose branches fail at the key with different `actual` text, it prints the key's value rather than the object around it:

```ts
const m = match
	.case({ "+": "reject", a: "string" }, o => o.a)
	.case({ a: "string", b: "number" }, o => o.b)
	.default("reject")

// previously b must be removed or a number (was {"a":"x","b":"y"})
// now b must be removed or a number (was "y")
m({ a: "x", b: "y" })
```

An exhaustive `switch` over `ArkErrorCode` must now handle `undeclared` and `discriminant`.

https://github.com/arktypeio/arktype/issues/1403

### Give misses of `number | null` and discriminated unions the `discriminant` code

A value that matched none of the cases of a union ArkType checks by switching on a domain or a literal value was a `predicate` error with English `expected` and `actual`. That includes most unions, not only objects with a discriminant key: any whose branches have different domains, like `number | null`, `string | undefined` or `string | number`, and any of three or more literal values, like `"a" | "b" | undefined`. It now has the code `discriminant`, so `predicate` config, at a scope or globally, no longer reaches it:

```ts
configure({ predicate: { problem: "is invalid" } })

const out = type("number | null")("x")

if (out instanceof type.errors) {
	// previously "predicate", now "discriminant"
	out.issues[0].code
	// previously is invalid, now must be a number or null (was a string)
	out.summary
}
```

Its `data` is the discriminant's value. It carries `discriminantKind`, `cases` (the case values, or domains like `"string"` when `discriminantKind` is `"domain"`), `onKey` (whether the discriminant is at a key) and `absent` (whether the key was missing):

```ts
const Shape = type({ kind: "'circle'", r: "number" }).or({
	kind: "'square'",
	side: "number"
})

const out = Shape({ kind: "triangle" })

if (out instanceof type.errors) {
	const error = out.issues[0]
	// previously { kind: "triangle" }, now "triangle"
	error.data
	// ["circle", "square"]
	if (error.hasCode("discriminant")) error.cases
}
```

Configure its text with `discriminant` instead of `predicate`. Its message is unchanged, except that `.configure({ expected, actual })` on a union whose discriminant is the value itself now applies, and that inside an outer union, it prints the discriminant's value rather than the object around it:

```ts
// previously must be "a", "b" or "c" (was "d")
// now must be a letter (was "d")
type("'a' | 'b' | 'c'").configure({ expected: "a letter" })("d")

const T = type({ v: Shape }).or({ v: { kind: "string >= 9" } })

// previously (was {"kind":"triangle"})
// now v.kind must be "circle" or "square" or at least length 9 (was "triangle")
T({ v: { kind: "triangle" } })
```

At a key, its `meta` is the union's without `expected` and `actual`, which describe the object around the key rather than its value. Its `toJSON()` also includes `description`, the cases it expected (`"circle" or "square"`).

### Pass error writers the error and the locale

Each error writer receives the active locale as its last argument. An `expected` writer receives the error rather than only its context, so it can read `data` and `path` too, and an `actual` writer receives `(data, error, locale)`.

A writer's `ctx` is typed by its code, and no longer has `toJSON` or the parts of the message that could read the one it writes. Its `toString` and `toLocaleString`, which read the message, can no longer be called. `ctx.meta` may be `undefined` in an `expected` writer, as it already could in the others, since an error raised by `ctx.reject` has no meta:

```ts
import { configure } from "arktype/config"

// previously type-checked and threw for an error from ctx.reject
// now TS18048: 'ctx.meta' is possibly 'undefined'
configure({ predicate: { expected: ctx => ctx.meta.title! } })
```

### Keep supplied text out of an error's own properties

Text supplied when an error is created, as by `ctx.reject({ expected: "positive" })` or `ctx.mustBe("positive")`, was copied onto the error, hiding its `expected`, `actual`, `problem` and `message` getters. It now stays in the error's input, where the getters read it. Reading them and `toJSON()` give what they did, but `Object.keys(error)` and `{ ...error }` no longer include them, and assigning `error.expected` throws. Configure a writer instead of assigning text.

### Reference the morph that threw in `pipe.try` errors

A `pipe.try` error referenced the function that threw as `predicate` and wrote what it threw into its own `actual`. It now references the function as `morph`, with what it threw as `cause`, and writes its `actual` when read. Its message is unchanged, and an `actual` configured for `predicate` now reaches it.

### Raise keyword parse errors as data

The errors that `string.integer.parse`, `string.date.parse`, `string.url.parse`, `string.json`, `string.json.parse` and `string.regex` raise while parsing carried their own English `expected` text, and some their own `problem`. They now carry `meta.keyword`, a `description`, and what was thrown, if anything, as `cause`. Their messages are unchanged, and `predicate` config now reaches the text their own hid.

### Reserve `meta.keyword`

Built-in keywords set `meta.keyword` to their name, so a locale can find their phrase. Configuring a description, e.g. with `.describe()`, removes it, and JSON Schema omits it. Rename meta of your own named `keyword`.

### Fix global config when the first Type is created

Global config is read when the first Type is created rather than when arktype is imported, so importing `arktype` before your config file no longer matters, and `configure` can be imported from `"arktype"` as well as `"arktype/config"`. A `configure` call after a Type has been created throws instead of applying to scopes created later but not to `type` or keywords:

```ts
import { configure, type } from "arktype"

configure({ numberAllowsNaN: true })
// previously false, now true
type.number.allows(Number.NaN)

// previously ignored by type, now throws: configure must be called before any Type is created, e.g. from a module imported first
configure({ onUndeclaredKey: "delete" })
```

### Reject `Infinity` from `number`

`number` rejects `Infinity` and `-Infinity` by default, as it already rejects `NaN`:

```ts
// previously Infinity, now ArkErrors: must be a number (was Infinity)
type.number(Infinity)
```

Allow them everywhere with `configure({ numberAllowsInfinity: true })`, or in one type with the `number.Infinity` and `number.NegativeInfinity` keywords:

```ts
const T = type("number | number.Infinity | number.NegativeInfinity")
```

A type whose range already excluded an infinite value, like `number.safe`, now reports `must be a number (was Infinity)` instead of its range error.

### Remove the `clone` option

Transforming no longer clones the input first, and never writes to it, except to a builtin arktype doesn't copy (e.g. a function, Promise, WeakMap, FormData, Blob or boxed primitive), which is transformed in place as before. A transformed object is a new object sharing every untransformed value with the input, and input that nothing transforms is returned as is:

```ts
const T = type({ a: "string.trim", b: { c: "string" } })
const input = { a: " x ", b: { c: "y" } }

// previously false, now true
T(input).b === input.b
```

A morph receives the validated value itself, so a morph that mutates its argument mutates the caller's data. Remove `clone` from your config.

### Annotate what JSON Schema can't express

Pass `annotatingFallback` as `toJsonSchema()`'s `fallback` to write each constraint JSON Schema can't express as an `x-arktype-*` keyword instead of throwing:

```ts
import { annotatingFallback, type } from "arktype"

// { $schema: "...", "x-arktype-domain": "bigint" }
type("bigint").toJsonSchema({ fallback: annotatingFallback })
```

A function, class or symbol is written as its `$ark` name, as in the type's `.json`. Validators ignore those keywords, so the schema accepts values the type rejects.

A `symbolKey` fallback's result for a symbol-keyed property is now used instead of discarded.

### Reject shallow cycles

An alias that resolved to itself without passing through an object, array or morph accepted every value. It now throws a ParseError:

```ts
// previously accepted every value, now throws: Alias 'a' has a shallow resolution cycle: a->a
scope({ a: "a" }).export()
```

### Describe dates in UTC

Dates in descriptions and error messages are written in UTC instead of local time, except that a date at UTC midnight is written as its calendar date, collapsing to its year on January 1:

```ts
const T = type("Date < d'2000-01-01T12:30:00Z'")

// previously "must be 7:29:59.999 AM, January 1, 2000 or earlier" in New York
// now "must be January 1, 2000, 12:29:59.999 PM UTC or earlier"
T(new Date("2001-06-01"))
```

A Date's `.expression`, the ParseErrors that include it and a date bound's `stringLimit` are written as ISO instants instead of with `Date.prototype.toString` or `toLocaleString`:

```ts
// previously "Date >= Sat Jan 01 2000 00:00:00 GMT+0000 (Coordinated Universal Time)" in UTC
// now "Date >= d'2000-01-01T00:00:00.000Z'"
type("Date >= d'2000-01-01'").expression
```

So the same type describes itself the same way under any time zone or locale.

### Reject dates without a time zone

A date literal, or a string passed as a date limit to `.laterThan`, `.earlierThan`, `.atOrAfter`, `.atOrBefore` or an `after`/`before` schema, must now be the same instant on every machine: an ISO date (UTC), an ISO date-time with `Z` or an offset, or epoch milliseconds. A date-time without an offset or a non-ISO string was parsed in the local time zone, and an impossible date like `2025-02-30` rolled over into March:

```ts
// previously the local time of each machine, now throws ParseError: Date literal '2025-01-01T12:00' must be an ISO date like 2025-01-01, an ISO date-time with Z or an offset like 2025-01-01T12:00Z, or epoch milliseconds
type("Date > d'2025-01-01T12:00'")

// previously local midnight, now throws the same ParseError
type("Date > d'01/02/2025'")
type.Date.laterThan("01/02/2025")

// unchanged
type("Date > d'2025-01-01'")
type("Date > d'2025-01-01T12:00Z'")
type("Date > d'2025-01-01T12:00-05:00'")
```

A numeric string that isn't an ISO year like `2025` is always epoch milliseconds, so `d'12'` is 12ms after the epoch rather than December 1, 2001 in local time.

### Hold `ArkErrors`' errors in `issues` instead of extending `Array`

`ArkErrors` was an `Array` subclass. It is now a plain class whose `issues` is a plain array with one `ArkError` per path, in the order each path first failed. Iterating, `length` and every other `ArkErrors` member work as before. Indexing and array methods move to `issues`:

```ts
const out = T(data)

if (out instanceof type.errors) {
	// previously out.map(e => e.message), now
	out.issues.map(e => e.message)
	// previously out[0], now
	out.issues[0]
	// unchanged
	for (const error of out) console.log(error.message)
}
```

`issues` already returned the errors, so `out.issues.map(...)` works before and after this change. `Array.isArray(out)` is now false, and `arr.concat(out)` nests the errors, so pass `out.issues`. A Standard Schema failure's `issues` is a plain array rather than the `ArkErrors` itself, so read `summary` or `flatProblemsByPath` from the result.

### Throw from `.assert` when a root morph fails

When a type's root was a morph (or a union of morphs) that returned `ArkErrors`, `.assert` returned the errors instead of throwing, and a configured `onFail` was not called. A root morph's errors are now handled like any others, as they already were for a morph at a key:

```ts
const N = type("number")
const T = type("string").pipe(s => N(s))

// previously returned ArkErrors, now throws TraversalError: must be a number (was a string)
T.assert("x")
```

### Return a type's output when it is called with `ctx` in a morph

Calling a type with the morph's `ctx` returned the morph's own input rather than the type's output, and threw if the type transformed its input:

```ts
const T = type("string").pipe((s, ctx) =>
	type({ a: "string.trim" })(JSON.parse(s), ctx)
)

// previously threw a TypeError, now { a: "x" }
T('{"a":" x "}')
```

### Fix errors repeated or added at another path

Errors added more than once at a path other than the current one, as by `ctx.reject({ relativePath })`, were merged into an error without that path, and a morph that returned an error it had already added listed it twice:

```ts
const T = type({ a: "string" }).pipe((o, ctx) => {
	ctx.error({ expected: "p", relativePath: ["a"] })
	return ctx.error({ expected: "q", relativePath: ["a"] })
})

// previously ({"a":"s"}) must be... ◦ p ◦ q ◦ q
// now a ({"a":"s"}) must be... ◦ p ◦ q
T({ a: "s" }).toString()
```

A morph that returned `ctx.errors` listed each of its errors twice, or added errors until it ran out of memory when the morph was at a key:

```ts
const T = type({
	a: type("string").pipe((s, ctx) => (ctx.error("not ok"), ctx.errors))
})

// previously ran out of memory, now a must be not ok (was "x")
T({ a: "x" }).toString()
```

### Configure before importing anything else

`arktype` and `@ark/schema` now each load as a single module, so `configure()` must run before any import of either package, including `./internal/*` deep imports. Only `./config` and `./internal/config.*` load without the rest of the package.

### Add `rejectAllowsSymbolKeys`

Finding undeclared symbol keys for `"+": "reject"` takes a symbol read per object. If you don't need them rejected, you can allow them, which makes validating a small object that rejects undeclared keys about 2.5x faster and one with 40 keys about 1.15x faster:

```ts title="config.ts"
import { configure } from "arktype/config"

configure({ rejectAllowsSymbolKeys: true })
```

```ts title="app.ts"
import "./config.ts"
import { type } from "arktype"

const T = type({ "+": "reject", a: "string" })

// valid, instead of ArkErrors: value at [Symbol(s)] must be removed
T({ a: "x", [Symbol("s")]: 1 })
```

With it, reject types that differ only by a symbol key overlap, so a union of them with a morph is indeterminate:

```ts
const s = Symbol("s")

// throws with rejectAllowsSymbolKeys: An unordered union ... is indeterminate
type({ "+": "reject", a: "string.trim" }).or({
	"+": "reject",
	a: "string",
	[s]: "1"
})
```

### Delete undeclared symbol keys

`"+": "delete"` removes undeclared symbol keys, which it previously kept.

### Return deleting types' keys in the order of their expression

`"+": "delete"` builds its output with required keys, then optional keys, each sorted, followed by keys matching an index signature in input order. It previously deleted from a copy of the input, which kept the input's order:

```ts
const T = type({ "+": "delete", b: "string", a: "string", "c?": "number" })

// previously { a: "1", c: 1, b: "2" }, now { a: "1", b: "2", c: 1 }
T({ a: "1", z: 0, c: 1, b: "2" })
```

### Import internals from `arktype/internal`

`arktype/internal` exports the names of every arktype module, and `@ark/schema`, `@ark/util`, `arkregex` and `arksets` each have an `./internal` entry like it. A deep import like `arktype/internal/parser/string.ts` keeps its module's types and loads that entry at runtime.

### Resolve names that match `Object.prototype` members

Aliases, generic parameters, keyword lookups and `FormData` fields named like an `Object.prototype` member (e.g. `toString`, `constructor`, `valueOf`) no longer resolve to the inherited member:

```ts
// previously threw: #toString duplicates public alias toString
scope({ toString: "string" }).export()

// previously threw an internal TypeError, now 'toString' is unresolvable
type("toString")
```

https://github.com/arktypeio/arktype/issues/1121

### Skip the CSP probe when `jitless` is configured

Configuring `jitless` through `arktype/config` before importing arktype no longer runs the `new Function` check for JIT support, so a page with a strict Content-Security-Policy no longer logs an eval violation.

https://github.com/arktypeio/arktype/issues/1473

### Emit `enum` for a configured union of literals

```ts
// previously { anyOf: [{ const: "a", title: "Letter" }, { const: "b", title: "Letter" }], title: "Letter" }
// now { enum: ["a", "b"], title: "Letter" }
type("'a' | 'b'").configure({ title: "Letter" }).toJsonSchema()
```

https://github.com/arktypeio/arktype/issues/1470

### Import in runtimes without web platform globals

Importing arktype no longer throws in runtimes that lack `Blob`, `URL`, `FormData`, `Headers`, `Request` or `Response`, such as WeChat mini programs, AudioWorklets or an embedded V8 or QuickJS. A keyword whose global is missing throws when used, e.g. `'Blob' is unresolvable`.

https://github.com/arktypeio/arktype/issues/1555

### Infer platform keywords whose globals are declared as classes

With declarations like `@cloudflare/workers-types`, which declare `Blob`, `File`, `Headers` and `URL` as classes, those keywords infer their instance types instead of `never`.

https://github.com/arktypeio/arktype/issues/1548

### Throw a scope alias's parse error on every reference

After an alias failed to parse, later references to it returned a type that crashed when validating, or reported a false cycle. Each reference now throws the original error.

### Export the types that inferred types reference

`arktype` exports `Brand`, `Json`, `GenericAst`, `ArkErrorCode` and `Regex` as types. Under pnpm, exporting a type that references one of them (a brand, `string.json.parse`, a scope with a generic, a `regex()` value or `ArkErrors.byPath`) failed declaration emit with TS2883, since the packages they lived in usually can't be resolved from your project:

```ts
// previously TS2883: The inferred type of 'Gid' cannot be named without a reference to '.pnpm/@ark+util@.../node_modules/@ark/util'
// now emits import("arktype").Brand<string, "GID">
export const Gid = type("string#GID")
```

https://github.com/arktypeio/arktype/issues/1577

### Write length bounds and protos alongside a structure

An expression or description with props or an array element dropped the length bounds and the proto beside it, so distinct types printed the same:

```ts
// previously number[], now number[] >= 2
type("number[] > 1").expression

// previously { foo: string }, now { foo: string } & Date
type("Date").and({ foo: "string" }).expression

// previously string >= 2[], now (string >= 2)[]
type("(string > 1)[]").expression
```

https://github.com/arktypeio/arktype/issues/1430

### Parse an invoked builtin generic in the invoking scope

A type created by calling a builtin generic directly, like `type.Record(...)`, belonged to an internal schema scope, so methods that take a definition (`.to`, `.or`, `.and`, ...) parsed it as a schema:

```ts
// previously threw ParseError: instanceOf operand must be a function (was undefined)
type
	.Record("string", "boolean")
	.pipe(o => Object.keys(o))
	.to("string[]")
```

It now belongs to the scope it was invoked from and follows its config, so `$.type.Record(...)` invoked from a `jitless` scope is no longer compiled, and the scope's `onFail` applies to it.

https://github.com/arktypeio/arktype/issues/1600

### Release functions passed to `narrow`, `pipe`, `match` and defaults

A type built from a new function, such as one created per request, kept that function and everything it captured in memory forever. Such functions are now released along with the type, and so is a `scope()` whose aliases are never resolved:

```ts
const handleRequest = (request: { id: number }) =>
	type({ id: "number" }).narrow(v => v.id === request.id)

// previously each call kept its request in memory, now it can be garbage collected
handleRequest({ id: 1 })
```

The `$ark.x` names that functions get in a type's `json` or `expression` are unique names only and no longer resolve through `$ark`. `ctx.meta` in a compiled union or undeclared-key error is the type's own meta, as in jitless mode, so a value like `NaN` is no longer stringified. In `@ark/schema`, `BaseNode.compiledMeta` is removed, and `BaseScope.resolutions` holds an unresolved alias's parse context instead of its id.

https://github.com/arktypeio/arktype/issues/1676

### Define a matcher whose cases a reordering would separate

A matcher whose cases get grouped out of order, like tuples discriminated by an element, threw at definition even though no input could reach two of the cases:

```ts
const Dir = type({ "[string]": "unknown" })

// previously ParseError: The intersection of distinct morphs at a single path is indeterminate
match
	.case(["string", Dir], () => -1)
	.case([Dir, "string"], () => 1)
	.case(["string", "string"], ([a, b]) => a.localeCompare(b))
	.default(() => 0)
```

https://github.com/arktypeio/arktype/issues/1445

### Check every case that accepts a discriminated tuple element

A case discriminated at a tuple element required every element to match it, so a later case that accepted the input was skipped, and a string, whose characters are read at an index, skipped a branch that accepts strings:

```ts
const m = match
	.case(["unknown", "null"], () => 0)
	.case(["string", "unknown"], () => 1)
	.case(["true", "string | number"], () => 2)
	.default(() => null)

// previously 1, now 0
m(["x", null])

// previously 3, now 2
match
	.case(["'a'"], () => 0)
	.case(["'b'"], () => 1)
	.case("string | null", () => 2)
	.default(() => 3)("a")
```

### Accept `NaN` at a discriminated key where a branch allows it

```ts
// previously false, now true
type({ a: "number.NaN | 'x'" })
	.or({ a: "object" })
	.or({ a: "3" })
	.allows({ a: NaN })
```

### Parse a union whose case relates a literal to a refined or nested check

```ts
// previously TypeError: Cannot use 'in' operator to search for 'c' in 1
type({ a: "string" })
	.or({ a: "1 | object", b: "1" })
	.or({ a: { c: "number" }, b: "2" })

// previously TypeError: Cannot read properties of null (reading 'length'), now 2
match
	.case("string > 1", () => 0)
	.case("number", () => 1)
	.case("null | 'x'", () => 2)
	.default(() => 3)(null)
```

### Infer required keys from `.required()` on defaulted properties

`.required()` and the `Required` generic made a defaulted key required at runtime, but its inferred type kept the default, so `inferIn` still treated the key as optional. This also applied to defaulted morphs and tuple elements:

```ts
const T = type({ foo: "string = 'bar'" }).required()

// previously { foo?: string }, now { foo: string }
type In = typeof T.inferIn
```

https://github.com/arktypeio/arktype/issues/1160

### Infer the output of morphs that return `any`

A morph whose output was `any`, or a function returning `any`, was left in the inferred type as the morph itself:

```ts
const T = type({ a: ["string", "=>", s => JSON.parse(s)] })

// previously { a: (In: string) => Out<any> }, now { a: any }
type Out = typeof T.infer
```

Inferred types that contain no morphs, defaults or brands still keep their names, like interfaces passed to `.as`.

https://github.com/arktypeio/arktype/issues/1023

### Name the narrow in an unsatisfiable intersection error

When a narrow rejected every branch of a union it was intersected with, the error described the narrow by its expression, which omits predicates:

```ts
const isC = (s: string) => s === "c"

// previously ParseError: Intersection of "a" | "b" and unknown results in an unsatisfiable type
// now ParseError: Intersection of "a" | "b" and $ark.isC results in an unsatisfiable type
type("'a' | 'b'").narrow(isC)
```

### Check declared keys against a string index signature in JSON Schema

An index signature applies to every key, declared or not, but `toJsonSchema()` wrote a string index beside declared keys as `additionalProperties`, which JSON Schema doesn't apply to them. It now writes `patternProperties` with a pattern every key matches:

```ts
const T = type({ a: "unknown", "[string]": "string" })

// previously { ..., additionalProperties: { type: "string" } }
// now { ..., patternProperties: { "": { type: "string" } } }
T.toJsonSchema()
```

A string index on an object with no other keys is still written as `additionalProperties`.

### List optional keys by name

An object's expression and JSON list its optional keys by name. A key with a default used to come before those without one:

```ts
const T = type({ "bar?": "number", foo: "string = 'foo'" })

// previously '{ foo: string = "foo", bar?: number }'
T.expression // '{ bar?: number, foo: string = "foo" }'
```

Symbol keys follow string keys.

### Read only string elements as tuple operators

A tuple definition's first two elements were converted to property keys to check for an operator, calling an object's `toString` or `Symbol.toPrimitive` at definition, and a name inherited from `Object.prototype` was mistaken for one:

```ts
// previously threw an internal TypeError, now 'toString' is unresolvable
type(["string", "toString"])
```

### Name JSON Schema `$defs` independently of other types

`$defs` keys and `$ref`s were node ids, whose numbers depend on every type defined before, so the same type's JSON Schema changed with unrelated code. Each def is now named by its alias or kind, numbered within the schema in reference order:

```ts
const { user } = scope({
	user: { name: "string", "friends?": "user[]" }
}).export()

// previously e.g. { $ref: "#/$defs/user3", ... "#/$defs/intersection41" ... }
// now { $ref: "#/$defs/user1", ... "#/$defs/intersection1" ... }
user.toJsonSchema()
```

### Recognize errors from another copy of arktype with `instanceof`

`instanceof` with `type.errors` (`ArkErrors`), `ArkError` or `TraversalError` checks arktype's `" arkKind"` brand instead of the prototype chain, so it holds for errors created by a duplicate installation of `arktype`:

```ts
const out = UserFromOtherCopy(data)

// previously false, now true when out is the other copy's ArkErrors
out instanceof type.errors
```

## 2.2.8

### Add `string.base58`

Validates base58-encoded strings, which use the Bitcoin alphabet (no `0`, `O`, `I` or `l`):

```ts
const Base58 = type("string.base58")

// valid
Base58("3mJr7AoUXx2Wqd")
// ArkErrors: must be base58-encoded (was "0OIl")
Base58("0OIl")
```

Thanks to @WolfieLeader.

### Return empty `props` for `object`

`type("object").props` threw instead of returning the empty list of properties, like `type({}).props` does (#1682, fixes #1177).

Thanks to @SunilRathod27.

### Keep object values from meta in JSON Schema

Meta values that aren't primitives, like an object or array `default` or a custom key like `x-unit`, were emitted as internal `$ark` references instead of their JSON values (#1677). Defaults that aren't valid JSON, including functions, now go through the `defaultValue` fallback.

Thanks to @lprnmns.

### Report invalid generic definitions on TypeScript 7

TypeScript 7 only reports the error of the last overload that fails, which for an invalid generic definition was the tuple expression signature rather than ArkType's own message (#1681):

```ts
// TypeScript 7 previously: Argument of type '"<n extends nummer>"' is not assignable to parameter of type '"Array" | ...
// now: 'nummer' is unresolvable
type("<n extends nummer>", "n > 0")
```

The generic and tuple expression signatures of `type` are now a single signature, so TypeScript 6 and 7 report the same errors directly, and errors in a generic's body point at the invalid property.

## 2.2.7

### Fix `this[]` in self-referential object types

Referencing an array of the enclosing type threw a spurious shallow resolution cycle error:

```ts
// previously threw, now parses
const Node = type({
	name: "string",
	"children?": "this[]"
})
```

Thanks to @yharaskrik.

### Parse `string.date.epoch.parse` input as milliseconds

The validated integer string was passed directly to `new Date()`, which runs the date string parser rather than reading it as a timestamp:

```ts
const parseEpoch = type("string.date.epoch.parse")

// previously 2000-01-01 local time, now 1970-01-01T00:00:00.000Z
parseEpoch("0")
// previously Invalid Date, now 2023-11-14T22:13:20.000Z
parseEpoch("1700000000000")
```

Thanks to @breken-ai.

### Keep uppercase UUIDs valid in `string.uuid` JSON Schema

`string.uuid` accepted uppercase hex digits via the `i` flag, which JSON Schema `pattern` cannot carry, so the exported schema rejected uppercase UUIDs the runtime check accepted. The patterns now list both cases explicitly. Thanks to @breken-ai.

### Render nested bigints correctly in error messages

Bigints inside arrays or objects were printed as quoted strings, e.g. `(was ["1n","0n","1n"])`. They now print as `(was [1n,0n,1n])`. Thanks to @chatman-media.

### Release unused ids from the global registry

Repeatedly creating an equivalent type (e.g. `type("string")` or `T.pick("a")` in a loop) registered a new id for each parse that nothing could reference, so memory grew without limit. Unused ids are now removed. Thanks to @isaacwasserman.

### Fix crashes on Hermes and Turbopack

- Unions of objects disjoint at a key no longer throw `undefined is not a function` on Hermes (Expo, React Native), which doesn't preserve `Array` subclasses through `map`.
- `scope.module` no longer references `this` from a static arrow function, which Turbopack could compile to `undefined`.

## 2.2.6

### Add `ArkErrors.message`

`ArkErrors` now has a `message` getter returning the same human-readable string as `summary`, so code that handles a failed result like an `Error` gets a useful message instead of `undefined`:

```ts
const out = T(data)
if (out instanceof type.errors) console.error(out.message)
```

### Fix a crash when `ctx.reject` without `expected` fails in a union

Rejecting from a narrow without an `expected` value could throw a `TypeError` instead of returning errors when the failure occurred in a union that could not be discriminated:

```ts
const T = type("string[] | Function").narrow(
	(v, ctx) => Array.isArray(v) || ctx.reject({ problem: "custom" })
)

// previously threw "Cannot read properties of undefined (reading 'name')"
T(() => {})
```

Predicate errors now have an explicit `expected` default that does not depend on the predicate being present in the error context.

### Preserve narrows on piped union branches through an intersection

Intersecting a union containing a piped and narrowed branch with another morph could drop that branch's narrow:

```ts
const T = type({
	kind: "'a'",
	value: type("string.numeric.parse").narrow(
		(n, ctx) => n > 0 || ctx.mustBe("positive")
	)
})
	.or({ kind: "'b'" })
	.and(type("object").pipe(o => o))

// previously passed, now fails with "value must be positive (was -1)"
T({ kind: "a", value: "-1" })
```

Thanks to @ShuviSchwarze.

### Format times in `Date` error messages independent of locale

Times in `Date` descriptions (e.g. `must be after 2:30 PM, January 15, 2023`) are now consistently formatted in 12-hour time rather than depending on the runtime's default locale, which previously produced output like `14:30, January 15, 2023` in 24-hour locales. Thanks to @WolfieLeader.

## 2.2.5

### Preserve escaped backslashes in regex literals

Within a regex literal, `\\` is now kept verbatim as an escaped backslash rather than collapsed to a single `\`, which silently changed the meaning of the pattern:

```ts
// previously parsed as /\d/, matching a digit
// now matches a literal backslash followed by "d"
const T = type("/\\\\d/")
```

String literals are unaffected. If a definition relied on the old behavior, write the intended escape directly (e.g. `"/\\d/"` for a digit). Thanks to @spokodev.

### Fix recursive discriminated unions referenced from a `Record`

A cyclic alias referenced through `Record<string, ...>` could cause valid values to be rejected, e.g. an array branch failing with `must be an array (was object)`. Bootstrapping alias references no longer overwrites references that were already resolved. This was a regression introduced in 2.2.2. Thanks to @xianjianlf2.

### Prevent a crash validating unions of object arrays

Inside a union branch, array validation now stops at the first failing element instead of continuing to traverse elements whose basis has already failed, which could throw rather than return an error. Thanks to @xianjianlf2.

### Merge index-derived props with a declared key of the same name

Intersecting a structure with an index signature and one that rejects undeclared keys could produce a node with a duplicate key:

```ts
// previously { a: number, a: number, b: number, + (undeclared): reject }
type({ a: "number", "[string]": "number" }).and({
	a: "number",
	b: "number",
	"+": "reject"
})
```

Props derived from the index signature are now intersected with any declared prop of the same key, and the result is the same in either operand order.

### Preserve parameter labels when a `type.fn` implementation annotates an optional parameter

Annotating an optional parameter, as in `type.fn("number?")((n?: number) => n)`, previously dropped every parameter label from the inferred signature. It now infers `(n?: number | undefined) => number | undefined`. Thanks to @aswinsvijay.

## 2.2.4

### Default a property to an empty array or object in string syntax

`= []` and `= {}` are now valid string-embedded defaults, so an empty collection no longer requires the tuple-with-thunk form:

```ts
// previously ["string[]", "=", () => []]
const T = type({
	values: "string[] = []",
	meta: "object = {}"
})
```

Like the tuple form they replace, each traversal that falls back to the default gets a fresh reference rather than a shared one, so mutating the defaulted value cannot leak into the next traversal. Thanks to @SynthLuvr.

### Apply `required` and `partial` to array and tuple elements

Like the mapped types they're named for, `required` and `partial` are homomorphic: they now transform the elements of an array or tuple and preserve its base, where previously they reduced it to a plain object.

```ts
const T = type(["string", "number?"]).required() // [string, number]
```

`partial` preserves defaultable elements rather than flattening them, which would otherwise lose their position relative to the prefix. When the transformation is a no-op — an array with no fixed elements, an empty tuple — the original branch is preserved rather than rebuilt. Thanks to @lprnmns.

### Document what structural methods discard

`pick`, `omit`, `merge`, `required`, and `partial` return a new object built from the properties they extract, so a root `narrow`, `filter`, or metadata on the original `Type` is not carried over. This has always been the behavior; it is now called out in each method's JSDoc and in the [objects docs](https://arktype.io/docs/objects#properties-structural).

### Allow multiple scopes to share a name

Registering a scope with a name another scope already used no longer throws `A Scope already named ... already exists`. The parse cache is keyed by scope identity rather than by name, so two scopes sharing a name no longer collide in it. Thanks to @yamcodes.

### Require an integer portion in well-formed number strings

`isWellFormedNumber("")` and `isWellFormedNumber("-")` incorrectly returned `true`, because the integer-and-decimal body of the matcher was wrapped in a trailing `?` that made the whole pattern optional. Thanks to @zigzagdev.

### Return an empty string from `capitalize`/`uncapitalize` on empty input

Both threw on `""`, since indexing the first character gave `undefined`. They now return `""` unchanged. Thanks to @zigzagdev.

## 2.2.3

### Fix `type.fn.raw` throwing at runtime

`type.fn.raw` is documented as an untyped alias of `type.fn`, but was `undefined` at runtime and threw `type.fn.raw is not a function` when called. It now references the underlying parser directly, so it parses, runs, and validates like `type.fn` without type-level inference. Thanks to @aarsh767.

### Anchor versioned UUID validation

`string.uuid` no longer accepts strings that merely contain a UUID. The internal `#versioned` pattern is now anchored like the individual version keywords, so leading or trailing content is rejected. Thanks to @WolfieLeader.

### Fix inferred output of `declare`d morphs

The output side of a `declare`d definition now wraps its preinferred value in `Out<...>`, matching the inference of the equivalent definition without `declare`. Thanks to @eralmansouri.

### Allow `Object.prototype` method names as keys

Keys like `constructor`, `toString`, and `hasOwnProperty` are no longer incorrectly reported as duplicate keys, since duplicate detection now uses a prototype-free record. Thanks to @kaigritun.

## 2.2.2

### Fix precompilation of private aliases

A private alias referenced only within its own scope is no longer skipped during JIT precompilation, so its optimized traversal is bound correctly instead of falling back to the unbound reference.

### Harden `ArkErrors` JSON serialization

`ArkErrors` doubles as a Standard Schema `issues` array, so `JSON.stringify` no longer assumes every indexed entry is an `ArkError` with a `toJSON` method (e.g. plain issue-shaped entries from other validators). Inherited array methods (`map`, `filter`, `slice`, …) now return a plain `Array` via `Symbol.species`, preventing callbacks that return primitives from producing a malformed `ArkErrors`.

## 2.2.1

### Improve regex inference for zero-min quantifiers on numeric patterns

```ts
// was: Regex<`${number}`>
// now: Regex<"" | `${number}`>
regex("^\\d*$")
```

See arkregex CHANGELOG for full notes.

## 2.2.0

Full announcement: https://arktype.io/docs/blog/2.2

### `type.fn` - Validated functions

Define functions with runtime-validated parameters and return types. Supports defaults, optionals, and variadics.

```ts
const len = type.fn("string | unknown[]", ":", "number")(s => s.length)

len("foo") // 3
len([1, 2]) // 2
```

### Type-safe regex via arkregex

Regex literals in definitions now carry full type inference. `x`-prefix parses capture groups at runtime.

```ts
const T = type({
	birthday: "x/^(?<month>\\d{2})-(?<day>\\d{2})-(?<year>\\d{4})$/"
})

T.assert({ birthday: "05-21-1993" }).birthday.groups.month // "05"
```

### `@ark/json-schema` - Bidirectional JSON Schema

Parse JSON Schema into ArkType Types with the new `@ark/json-schema` package, complementing `toJsonSchema()`. Thanks to @TizzySaurus.

### Configurable `toJsonSchema`

Handle incompatibilities between ArkType and JSON Schema with granular fallback codes. Supports `draft-07`/`draft-2020-12` targets and cyclic types.

### Standard Schema as definitions

Any Standard Schema compliant validator (Zod, Valibot, etc.) can be embedded directly in ArkType definitions.

### `select` - Deep reference introspection

Query the internal structure of a type by node kind and predicate. Use selectors to configure specific references.

### Improved `type.declare`

Now supports morph-aware declarations via a `side` context, and optionality via property values.

### N-ary operators

`type.or`, `type.and`, `type.merge`, and `type.pipe` accept variadic definitions.

### Additional highlights

- `|>` string-embeddable pipe operator
- `type.valueOf` for TS enums
- `string.hex` + `string.regex` keywords
- Serializable `ArkErrors` (`flatByPath`, `flatProblemsByPath`, `toJSON`)
- `TraversalError` replaces `AggregateError`
- `exactOptionalPropertyTypes` config
- ES2020 + Hermes compatibility
- In-docs playground
- Better JSDoc + go-to-definition
- Cyclic unions can now discriminate on nested paths

## 2.1.29

### Improve regex inference for certain numeric expressions

```ts
// was: Regex<`${bigint}${bigint}`>
// now: Regex<`${number}`>
regex("^\\d{2}$")
```

See arkregex CHANGELOG for full notes.

## 2.1.28

### JSON Schema improvements

- Adds support for the new Standard JSON Schema interface (see standardschema.dev)
- Now accepts a `target` option and can generate draft-07 in addition to draft-2020-12

### Standard Schema is now a valid definition

Any Standard Schema compliant validator can now be passed directly to `type`, either directly or nested in a structural ArkType definition, and will be fully inferred and validated.

```ts
import { type } from "arktype"
import * as v from "valibot"
import z from "zod"

const ZodAddress = z.object({
	street: z.string(),
	city: z.string()
})

const User = type({
	name: "string",
	age: v.number(),
	address: ZodAddress
})
```

### e(x)ec mode for regex types

```ts
const User = type({
	// x-prefix a regex literal to parse its type-safe capture groups
	birthday: "x/^(?<month>\\d{2})-(?<day>\\d{2})-(?<year>\\d{4})$/"
})

const data = User.assert({ birthday: "05-21-1993" })

// fully type-safe via arkregex
console.log(data.birthday.groups) // { month: "05", day: "21", year: "1993" }
```

### more flexible `type.declare`

Optionality can now be expressed via a property value in addition to its key:

```ts
type Expected = { f?: string }

const T = type.declare<Expected>().type({
	// previously failed with `"f?" is missing`
	f: "string?"
})
```

### fixed a bug causing predicate errors after the first to not be reported

```ts
import { type } from "arktype"

const Dates = type({
	date1: "string.date",
	date2: "string.date",
	date3: "string.date"
})

// now correctly reports the errors on `date2` and `date3` in addition to `date1`
Dates.assert({
	date1: "",
	date2: "",
	date3: ""
})
```

See https://github.com/arktypeio/arktype/issues/1557

## 2.1.27

### fix assignability for certain objects like `Module`

The following assignment will now correctly fail (thanks @LukeAbby)🔒

```ts
import { type } from "arktype"

const types: Module<{ foo: string }> = type.module({ foo: "unknown" })
```

### bump regex inference to arkregex 0.0.3

## 2.1.26

### es2020 compatibility

Remove usages of newer prototypes methods like `.at()` to better support legacy browsers

### improve external generic inference

Some inference scenarios like the following involving default values are now more cooperative (thanks @Andarist) 🎉

```ts
function someFunction<TSchema extends Record<string, any>>(
	schema: Type<TSchema, {}>
): (typeof schema)["infer"] {
	const someData = { hello: "world" }
	return schema.assert(someData)
}

const schema = type({
	hello: type("string").pipe(s => s === "world"),
	goodbye: "string='blah'"
})

someFunction(schema)
```

## 2.1.25

### bump regex inference to arkregex 0.0.2

## 2.1.24

### bump regex inference to arkregex 0.0.1

### duplicate key errors

Definitions like the following now throw a descriptive error:

```ts
const T = type({
	foo: "string",
	foo?: "string"
})
```

## 2.1.23

### regex literals are now inferred (will be announced and documented as part of 2.2)

### fix an issue with some discriminated morphs (thanks @JeremyMoeglich)

See https://github.com/arktypeio/arktype/pull/1464

## 2.1.22

### fix an issue with some recursive transforms

See https://github.com/arktypeio/arktype/issues/1496

## 2.1.21

### ~standard `toJSONSchema` support

Adds support for the upcoming StandardJSONSchemaSourceV1 spec (standardschema.dev)

## 2.1.20

### `toJsonSchema` config

Some ArkType features don't have JSON Schema equivalents. By default, `toJsonSchema()` will throw in these cases.

This behavior can be configured granularly to match your needs.

```ts
const T = type({
	"[symbol]": "string",
	birthday: "Date"
})

const schema = T.toJsonSchema({
	fallback: {
		// ✅ the "default" key is a fallback for any non-explicitly handled code
		// ✅ ctx includes "base" (represents the schema being generated) and other code-specific props
		// ✅ returning `ctx.base` will effectively ignore the incompatible constraint
		default: ctx => ctx.base,
		// handle specific incompatibilities granularly
		date: ctx => ({
			...ctx.base,
			type: "string",
			format: "date-time",
			description: ctx.after ? `after ${ctx.after}` : "anytime"
		})
	}
})

const result = {
	$schema: "https://json-schema.org/draft/2020-12/schema",
	type: "object",
	properties: {
		// Date instance is now a date-time string as specified by the `date` handler
		birthday: { type: "string", format: "date-time", description: "anytime" }
	},
	required: ["birthday"]
	// symbolic index signature ignored as specified by the `default` handler
}
```

a `default` handler can also be specified at the root of a `fallback` config:

```ts
const T = type({
	"[symbol]": "string",
	birthday: "Date"
})

//--- cut ---

const schema = T.toJsonSchema({
	// "just make it work"
	fallback: ctx => ctx.base
})
```

These options can also be set at a [global or scope-level](/docs/configuration#levels).

### Fallback Codes

This is the full list of configurable reasons `toJsonSchema()` can fail.

| Code                  | Description                                                 |
| --------------------- | ----------------------------------------------------------- |
| `arrayObject`         | arrays with object properties                               |
| `arrayPostfix`        | arrays with postfix elements                                |
| `defaultValue`        | non-serializable default value                              |
| `domain`              | non-serializable type keyword (always `bigint` or `symbol`) |
| `morph`               | transformation                                              |
| `patternIntersection` | multiple regex constraints                                  |
| `predicate`           | custom narrow function                                      |
| `proto`               | non-serializable `instanceof`                               |
| `symbolKey`           | symbolic key on an object                                   |
| `unit`                | non-serializable `===` reference (e.g. `undefined`)         |
| `date`                | a Date instance (supersedes `proto` for Dates)              |

### cyclic types can now be converted to JSON Schema

```ts
// previously this threw
const schema = type("object.json").toJsonSchema()

// now generates the following schema
const result = {
	$ref: "#/$defs/intersection11",
	$defs: {
		intersection11: {
			type: "object",
			additionalProperties: { $ref: "#/$defs/jsonData1" }
		},
		jsonData1: {
			anyOf: [
				{ $ref: "#/$defs/intersection11" },
				{ type: "number" },
				{ type: "string" },
				{ type: "boolean" },
				{ type: "null" }
			]
		}
	}
}
```

### temporarily disable discrimination for cyclic unions

This [addresses](https://github.com/arktypeio/arktype/issues/1188) [multiple](https://github.com/arktypeio/arktype/issues/1209) [issues](https://github.com/arktypeio/arktype/issues/1284) while we work on a permanent solution for accurately discriminating cyclic unions, tracked [here](https://github.com/arktypeio/arktype/issues/1026).

### addresses inference issues on some n-ary APIs like `type.or` outside the default scope (see [the PR](https://github.com/arktypeio/arktype/pull/1423)- thanks @simonwkla) 🎊

## 2.1.19

##### [Multiple](https://github.com/arktypeio/arktype/issues/1328) [improvements](https://github.com/arktypeio/arktype/issues/1279) to `toJsonSchema()` output, aligning it more closely with Open API standards.

##### Faster completion triggers for shallow string definitions

```ts
// old: ~1s delay after typing this before completions
// new: completions are almost instant
type("")
```

This isn't actually an overall perf improvement, but just a language server optimization to trigger autocomplete sooner.

Counterintuitively, in previous 2.x versions, strings that are part of an object definition trigger completions much faster than shallow strings.

## 2.1.18

Fix [an issue](https://github.com/arktypeio/arktype/issues/1407) causing metatypes like `Default` and `Out` to not be extracted from some recursive definitions:

```ts
const T = type({
	defaulted: "number = 0",
	"nested?": "this"
})

const t = T.assert({})

// old: Default<number, 0> | undefined
// new: number | undefined
t.nested?.defaulted
```

## 2.1.17

Unsatisfiable types for index signature intersections will now result in a `ParseError` thanks to the work of @TizzySaurus on the upcoming `@ark/json-schema` package 🎉

## 2.1.16

##### Fix [an issue](https://github.com/arktypeio/arktype/issues/1400) causing non-serializable error config to lead to incorrect error messages in some JIT-mode cases:

```ts
const MyUnion = type('"abc" | "cde"').configure({
	message: () => "fail"
})

// old: "$ark.message"
// new: "fail"
MyUnion.assert("efg")
```

##### Added a workaround for environments where global prototypes like `FormData` have degenerate resolutions like `{}` (currently the case in `@types/bun`, see https://github.com/oven-sh/bun/issues/18689)

```ts
const T = type("string.numeric.parse")

// previously, if a global prototype like FormData resolved to {}, it prevented
// ArkType from extracting the input/output of morphs, leading to inference like the following:

// old (with @bun/types): (In: string) => To<number>
// new (with @bun/types): number
type Parsed = typeof T.inferOut
```

## 2.1.15

### `.configure({}, selector)` fixes

```ts
const User = type({
	name: "string",
	platform: "'android' | 'ios'",
	"version?": "number | string"
})

// prior to 2.1.15, the selector was not applied
// when configuring references
const ConfiguredUser = User.configure(
	{ description: "A STRING" },
	{
		kind: "domain",
		where: d => d.domain === "string"
	}
)

// old: A STRING
// new: A STRING
ConfiguredUser.get("name").description

// old: A STRING
// new: "android" | "ios"
ConfiguredUser.get("platform").description

// old: A STRING or undefined
// new: a number, A STRING or undefined
ConfiguredUser.get("version").description
```

With the much more powerful `.configure` + selector API now available, the internal `.withMeta` method was removed as it can be trivially achieved via a self-selector:

```ts
// < 2.1.15
myType.withMeta("some shallow description")

// >= 2.1.15
myType.configure("some shallow description", "self")
```

## 2.1.14

### improve .expression for regex constraints

```ts
const T = type(/^a.*z$/)

// old: string /^a.*z$/
// new: /^a.*z$/
console.log(T.expression)
```

## 2.1.13

### Add standalone functions for n-ary operators

```ts
//  accept ...definitions
const union = type.or(type.string, "number", { key: "unknown" })

const Base = type({
	foo: "string"
})

// accepts ...definitions
const intersection = type.and(
	Base,
	{
		bar: "number"
	},
	{
		baz: "string"
	}
)

const zildjian = Symbol()

const Base = type({
	"[string]": "number",
	foo: "0",
	[zildjian]: "true"
})

// accepts ...objectDefinitions
const merged = type.merge(
	Base,
	{
		"[string]": "bigint",
		"foo?": "1n"
	},
	{
		includeThisPropAlso: "true"
	}
)

// accepts ...morphsOrTypes
const trimStartToNonEmpty = type.pipe(
	type.string,
	s => s.trimStart(),
	type.string.atLeastLength(1)
)
```

## 2.1.12

### `exactOptionalPropertyTypes`

By default, ArkType validates optional keys as if [TypeScript's `exactOptionalPropertyTypes` is set to `true`](https://www.typescriptlang.org/tsconfig/#exactOptionalPropertyTypes).

```ts
const MyObj = type({
	"key?": "number"
})

// valid data
const validResult = MyObj({})

// Error: key must be a number (was undefined)
const errorResult = MyObj({ key: undefined })
```

This approach allows the most granular control over optionality, as `| undefined` can be added to properties that should accept it.

However, if you have not enabled TypeScript's `exactOptionalPropertyTypes` setting, you may globally configure ArkType's `exactOptionalPropertyTypes` to `false` to match TypeScript's behavior. If you do this, we'd recommend making a plan to enable `exactOptionalPropertyTypes` in the future.

```ts title="config.ts"
import { configure } from "arktype/config"

// since the default in ArkType is `true`, this will only have an effect if set to `false`
configure({ exactOptionalPropertyTypes: false })
```

```ts title="app.ts"
import "./config.ts"
// import your config file before arktype
import { type } from "arktype"

const MyObj = type({
	"key?": "number"
})

// valid data
const validResult = MyObj({})

// now also valid data (would be an error by default)
const secondResult = MyObj({ key: undefined })
```

**WARNING: exactOptionalPropertyTypes does not yet affect default values!**

```ts
const MyObj = type({
	key: "number = 5"
})

// { key: 5 }
const omittedResult = MyObj({})

// { key: undefined }
const undefinedResult = MyObj({ key: undefined })
```

Support for this is tracked as part of [this broader configurable defaultability issue](https://github.com/arktypeio/arktype/issues/1390).

## 2.1.11

- Expose `select` method directly on `Type` (previously was only available on `.internal`)
- Improve missing property error messages

## 2.1.10

### Added a new `select` method for introspecting references of a node:

NOTE: `@ark/schema`'s API is not semver stable, so this API may change slightly over time (though we will try to ensure it doesn't).

```ts
// extract deep references to exclusive `min` nodes
const result = myType.select({
	kind: "min",
	where: node => node.exclusive
})
```

These selectors can also be used to select references for configuration:

```ts
// configure string node references
const result = myType.configure(
	{ description: "a referenced string" },
	{
		kind: "domain",
		where: node => node.domain === "string"
	}
)
```

### `ArkErrors` are now JSON stringifiable and have two new props: `flatByPath` and `flatProblemsByPath`.

```ts
const NEvenAtLeast2 = type({
	n: "number % 2 >= 2"
})

const out = NEvenAtLeast2({ n: 1 })

if (out instanceof type.errors) {
	console.log(out.flatByPath)
	const output = {
		n: [
			{
				data: 1,
				path: ["n"],
				code: "divisor",
				description: "even",
				meta: {},
				rule: 2,
				expected: "even",
				actual: "1",
				problem: "must be even (was 1)",
				message: "n must be even (was 1)"
			},
			{
				data: 1,
				path: ["n"],
				code: "min",
				description: "at least 2",
				meta: {},
				rule: 2,
				expected: "at least 2",
				actual: "1",
				problem: "must be at least 2 (was 1)",
				message: "n must be at least 2 (was 1)"
			}
		]
	}

	console.log(out.flatProblemsByPath)
	const output2 = {
		n: ["must be even (was 1)", "must be at least 2 (was 1)"]
	}
}
```

## 2.1.9

The `|>` operator pipes output to another Type parsed from a definition.

It is now string-embeddable:

```ts
const TrimToNonEmpty = type("string.trim |> string > 0")

const Equivalent = type("string.trim").to("string > 0")
```

## 2.1.8

- improve 3+ arg generic invocations
- add `string.hex` (thanks @HoaX7 - #1351)
- switch from AggregateError to TraversalError for better crash formatting (thanks @LukeAbby - #1349)

## 2.1.7

Address a rare crash on an invalid ctx reference in some jitless cases

Closes #1346

## 2.1.6

Improve some type-level parse errors on expressions with invalid finalizers

## 2.1.5

#### Fix JSDoc and go-to definition for unparsed keys

Addresses #1294

```ts
const T = type({
	/** FOO */
	foo: "string",
	/** BAR */
	bar: "number?"
})

const out = T.assert({ foo: "foo" })

// go-to definition will now navigate to the foo prop from the type call
// hovering foo now displays "FOO"
console.log(out.foo)

// go-to definition will now navigate to the bar prop from the type call
// hovering bar now displays "BAR"
// (the ? must be in the value for this to work)
console.log(out.bar)
```

## 2.1.4

Static hermes compatibility (#1027)

## 2.1.3

Fix a jitless-mode bug causing default + `onUndeclaredKey` transformations to not apply (#1335)

## 2.1.2

Allow non-zero-prefixed decimals in string.numeric ([#1333](https://github.com/arktypeio/arktype/pull/1333))

## 2.1.1

Fix a crash on attempting to apply the default `clone` to an object with a getter or setter as one of its non-prototype properties.

## 2.1.0

### `match`

The `match` function provides a powerful way to handle different types of input and return corresponding outputs based on the input type, like a type-safe `switch` statement.

#### Case Record API

The simplest way to define a matcher is with ArkType definition strings as keys with corresponding handlers as values:

```ts
import { match } from "arktype"

const sizeOf = match({
	"string | Array": v => v.length,
	number: v => v,
	bigint: v => v,
	default: "assert"
})

// a match definition is complete once a `default` has been specified,
// either as a case or via the .default() method

sizeOf("abc") // 3
sizeOf([1, 2, 3, 4]) // 4
sizeOf(5n) // 5n
// ArkErrors: must be an object, a string, a number or a bigint (was boolean)
sizeOf(true)
```

In this example, `sizeOf` is a matcher that takes a string, array, number, or bigint as input. It returns the length of strings and arrays, and the value of numbers and bigints.

`default` accepts one of 4 values:

- `"assert"`: accept `unknown`, throw if none of the cases match
- `"never"`: accept an input based on inferred cases, throw if none match
- `"reject"`: accept `unknown`, return `ArkErrors` if none of the cases match
- `(data: In) => unknown`: handle data not matching other cases directly

Cases will be checked in the order they are specified, either as object literal keys or via chained methods.

#### Fluent API

The `match` function also provides a fluent API. This can be convenient for non-string-embeddable definitions:

```ts
// the Case Record and Fluent APIs can be easily combined
const sizeOf = match({
	string: v => v.length,
	number: v => v,
	bigint: v => v
})
	// match any object with a numeric length property and extract it
	.case({ length: "number" }, o => o.length)
	// return 0 for all other data
	.default(() => 0)

sizeOf("abc") // 3
sizeOf({ name: "David", length: 5 }) // 5
sizeOf(null) // 0
```

#### Narrowing input with `in`, property matching with `at`

```ts
type Data =
	| {
			id: 1
			oneValue: number
	  }
	| {
			id: 2
			twoValue: string
	  }

const discriminateValue = match
	// .in allows you to specify the input TypeScript allows for your matcher
	.in<Data>()
	// .at allows you to specify a key at which your input will be matched
	.at("id")
	.match({
		1: o => `${o.oneValue}!`,
		2: o => o.twoValue.length,
		default: "assert"
	})

discriminateValue({ id: 1, oneValue: 1 }) // "1!"
discriminateValue({ id: 2, twoValue: "two" }) // 3
discriminateValue({ oneValue: 3 })
```

Special thanks to @thetayloredman who did a mind-blowingly good job helping us iterate toward the current type-level pattern-matching implementation🙇

### Built-in keywords can now be globally configured

This can be very helpful for customizing error messages without needing to create your own aliases or wrappers.

```ts title="config.ts"
import { configure } from "arktype/config"

configure({
	keywords: {
		string: "shorthand description",
		"string.email": {
			actual: () => "definitely fake"
		}
	}
})
```

```ts title="app.ts"
import "./config.ts"
import { type } from "arktype"

const User = type({
	name: "string",
	email: "string.email"
})

const out = User({
	// ArkErrors: name must be shorthand description (was a number)
	name: 5,
	// ArkErrors: email must be an email address (was definitely fake)
	email: "449 Canal St"
})
```

The options you can provide here are identical to those used to [configure a Type directly](https://arktype.io/docs/expressions#meta), and can also be [extended at a type-level to include custom metadata](https://arktype.io/docs/configuration#metadata).

### Tuple and args expressions for `.to`

If a morph returns an `ArkErrors` instance, validation will fail with that result instead of it being treated as a value. This is especially useful for using other Types as morphs to validate output or chain transformations.

To make this easier, there's a special `to` operator that can pipe to a parsed definition without having to wrap it in `type` to make it a function.

This was added before 2.0, but now it comes with a corresponding operator (`|>`) so that it can be expressed via a tuple or args like most other expressions:

```ts
const FluentStillWorks = type("string.numeric.parse").to("number % 2")

const NowSoDoesTuple = type({
	someKey: ["string.numeric.parse", "|>", "number % 2"]
})

const AndSpreadArgs = type("string.numeric.parse", "|>", "number % 2")
```

### Error configurations now accept a string directly

```ts
const CustomOne = type("1", "@", {
	// previously only a function returning a string was allowed here
	message: "Yikes."
})

// ArkErrors: Yikes.
CustomOne(2)
```

Keep in mind, [as mentioned in the docs](https://arktype.io/docs/configuration#errors), error configs like `message` can clobber more granular config options like `expected` and `actual` and cannot be included in composite errors e.g. for a union.

Though generally, returning a string based on context is the best option, in situations where you always want the same static message, it's now easier to get that!

### Type.toString() now wraps its syntactic representation in `Type<..>`

Previously, `Type.toString()` just returned `Type.expression`. However, in contexts where the source of a message isn't always a `Type`, it could be confusing:

```ts
// < 2.1.0:  "(was string)"
// >= 2.1.0: "(was Type<string>)"
console.log(`(was ${type.string})`)
```

Hopefully if you interpolate a Type, you'll be less confused by the result from now on!

### Improve how Type instances are inferred when wrapped in external generics

Previously, we used `NoInfer` in some Type method returns. After migrating those to inlined conditionals, we get the same benefit and external inference for cases like this is more reliable:

```ts
function fn<
	T extends {
		schema: StandardSchemaV1
	}
>(_: T) {
	return {} as StandardSchemaV1.InferOutput<T["schema"]>
}

// was inferred as unknown (now correctly { name: string })
const arkRes = fn({
	schema: type({
		name: "string"
	})
})
```

### Fix an issue causing some discriminated unions to incorrectly reject default cases

```ts
const Discriminated = type({
	id: "0",
	k1: "number"
})
	.or({ id: "1", k1: "number" })
	.or({
		name: "string"
	})

// previously, this was rejected as requiring a "k1" key

// will now hit the case discriminated for id: 1,
// but still correctly be allowed via the { name: string } branch
Discriminated({ name: "foo", id: 1 })
```

## 2.0.4

### Fix an issue causing global configs to be overwritten when the primary `"arktype"` entry point is imported:

`config.ts`

```ts
import { configure } from "arktype/config"

configure({ numberAllowsNaN: true })
```

`main.ts`

```ts
import "./config.ts"
import { type } from "arktype"
// now correctly allows NaN
type.number.allows(Number.NaN)
```

Previous versions of the docs mistakenly suggested this was possible in a single file. This is not the case in ESM due to hoisting. See the updated global configuration docs [here](https://arktype.io/docs/expressions#brand).

### Better `ParseError` when attempting to constraint a morph

Previously, attempting to directly constrain a transformed type was not a type error but gave a confusing error at runtime:

```ts
// ParseError: MinLength operand must be a string or an array (was never)
type("string.trim > 2")
```

We've added a type error and improved the runtime error:

```ts
// TypeScript: To constrain the output of string.trim, pipe like myMorph.to('number > 0')
// ParseError: MinLength operand must be a string or an array (was a morph)
type("string.trim > 2")
```

### Fix an issue causing certain complex morph types to not infer output correctly, e.g.:

```ts
const types = type.module({
	From: { a: ["1", "=>", () => 2] },
	Morph: ["From", "=>", e => e],
	To: { a: "2" }
})
const U = types.Morph.pipe(e => e, types.To)

// was:
//    (In: never) => To<{ a: 2 }>
// now fixed to:
//    { a: 2 }
const out = U.assert({ a: 1 })
```

## 2.0.3

- Fix an issue causing some unions with `onUndeclaredKey: "reject"` to reject valid data ([#1266](https://github.com/arktypeio/arktype/issues/1266))

- Fix an issue where Types containing arrays were incorrectly treated as including morphs, leading to some unnecessary validation overhead ([#1268](https://github.com/arktypeio/arktype/issues/1268#issuecomment-2613551907))

- Fix an issue causing objects containing functions like `() => never` that are subtypes of `InferredMorph` to be incorrectly treated as morphs ([#1264](https://github.com/arktypeio/arktype/issues/1264))

- Fail early with a `ParseError` if `instanceOf` operand is not actually a function at runtime ([#1262](https://github.com/arktypeio/arktype/issues/1262))

## 2.0.2

- Fix an issue where type-altering (currently config options `numberAllowsNan`, `dateAllowsInvalid` and `onUndeclaredKey`) could be specified at a scope-level, leading to unintuitive cache results ([#1255](https://github.com/arktypeio/arktype/issues/1255))

## 2.0.1

- Fix `@ark/util` version specifier

## 2.0.0

- Initial stable release 🎉
