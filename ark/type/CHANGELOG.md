# arktype

## Unreleased

### Precompile to ship less

`arktype` bundles larger than 2.2.9. The growth is spread across the changes below, mostly copy-on-write transforms, tracking cyclic data, errors and their English text, and the set algebra intersections and unions are reduced with. To ship less, precompile with `@ark/aot`, which replaces each Type with a validator on `arktype/runtime`. The [size benchmarks](https://arktype.io/docs/precompile#speed-and-size) compare both builds.

### Return only the first error, or one saying data is invalid, with `errors`

`errors: "first"` stops each validation at the first error it finds and returns it alone, with no promise of which of the data's errors that is. `errors: "none"` returns one root error, `is invalid`, found by checking the data alone, so nothing a Type holds runs again. Either can be configured globally or for a Scope:

```ts
import { configure } from "arktype/config"
import "arktype/errors"

configure({ errors: "none" })

// ArkErrors: is invalid
type({ name: "string" })({ name: 5 })
```

`import "arktype/errors"` installs both modes, so a program choosing neither ships neither, and creating a Type configured with either throws without it.

The error `"none"` returns holds the code `"predicate"`, an empty path and the data, and once read, every field an error has, as an error rejecting data with `ctx.reject({ expected: "valid", problem: "is invalid" })` would. It's an instance of `type.errors`, so `.assert()` throws a `TraversalError` saying `is invalid`, and a default the Type rejects fails its definition with `Default for name is invalid`. Its message isn't written in a configured locale.

A Type another Scope references validates as that Scope is configured, so `type({ x: X })` reports `X`'s errors in full even where `X`'s own Scope configures `errors: "none"`.

### Read only the first error with `firstIssue`

`firstIssue(out)` returns the first error in an `ArkErrors`' `issues`. The errors of a Type that calls no narrow or morph, like a precompiled validator's, find their issues once read, and until then `firstIssue` finds only that one, reading the data until it fails, so showing one error doesn't pay for finding the rest:

```ts
import { firstIssue, type } from "arktype"

const out = User(data)
if (out instanceof type.errors) console.error(firstIssue(out).message)
```

Unlike `errors: "first"`, it's the error a full validation finds first, and `issues` still holds every error once read.

### Transform a valid input in place with `mutatesInput`

By default, a transform copies each object it changes other than a builtin like a `Date`, so the input is otherwise never written. `mutatesInput` writes what a Type transforms, its defaults and its morphed values, into the input, which it returns. It can be configured globally or for a Scope:

```ts
import { configure } from "arktype/config"
import "arktype/mutatesInput"

configure({ mutatesInput: true })

const User = type({ name: "string.trim", role: "string = 'member'" })

const input = { name: " Ada " }

// true, and input is now { name: "Ada", role: "member" }
Object.is(User(input), input)
```

- `true` writes in place only where no place the Type checks can read what another wrote, so it returns what copying would, and otherwise copies, as for `{ a: { n: "string.numeric.parse" }, b: { n: "string" } }`, whose `a` and `b` could be one object.
- `"always"` always writes in place, so the input must hold no object at two places a transform reaches, and a function a Type holds must reach the input's objects only through the value it's passed, not `ctx.root`.
- The result is the input, so it keeps its key order, accessors and inherited keys, and an undeclared key holds what another place wrote where the input holds one object at both. Writing an input that can't be written, like a frozen object, throws a TypeError. An object stripped of undeclared keys, and a key two constraints transform, are still copied.

A validation that fails can leave writes in the objects of its input it found valid, which their transforms wrote as it checked the rest.

`import "arktype/mutatesInput"` installs both modes, so a program choosing neither ships neither, and creating a Type configured with either throws without it, naming the import.

### Exclude a value with `!=`

`!=` constrains what `==` does, a number, a string or array's length or a `Date`, to anything but its limit (#925):

```ts
const NonZero = type("number != 0")

// ArkErrors: must be other than 0 (was 0)
NonZero(0)
```

It reduces like the other comparators: `number < 0 | number > 0` is `number != 0`, `number >= 0 & number != 0` is `number > 0`, and `string != 0` is `string >= 1`. Its JSON Schema is `not`, like `{ type: "number", not: { const: 0 } }`.

Its errors have the codes `notEqual`, whose `rule` is a number or a `Date`, and `notEqualLength`. A lone `!` still doesn't end a name, so an alias or brand like `a!b` parses as before.

A second right bound throws `Expression number must have at most one right bound`, as its type already failed, so `number != 3 == 4` and `number < 5 < 6` no longer parse. The latter was `number < 5` in 2.2.9. Intersect a second comparator to use both, as in `0 < number < 10 & number != 5`.

Thanks to @jkugsiya for #1692.

### Write an `expression` that parses back

A Type a string definition can write has an `expression` that parses back to it:

- A `!=` past an operand's first comparator is an operand of its own, as in `number > -1 & number != 0` and `0 < number < 10 & number != 5`, which were `number > -1 != 0`, which throws, and `0 < (number != 5) < 10`, which fails its type.
- A number `String` writes with an exponent, below `1e-6` or from `1e21`, is written in decimal, as `1000000000000000000000` or `number > 0.0000001`, where `1e+21` and `1e-7` didn't parse. Its type, like any number TypeScript writes with an exponent, still fails, so such a definition needs `type.raw`.
- An array of `never` is `never[]`, where it was `(never)[]`.
- `[]` parses as the empty tuple, as TypeScript writes it, so the expression of `type([])` or of `string[] & number[]`, which is `[]`, parses back, and `[][]` is an array of empty tuples.
- `NaN`, `Infinity` and `-Infinity` parse as the units they name, as `number.NaN`, `number.Infinity` and `number.NegativeInfinity` write them, and are inferred as `number`, as those are. They aren't limits, so `number > Infinity` throws as it did.
- `Int8Array` and each other typed array constructor is a keyword, as `TypedArray.Int8` and the others write them. `TypedArray.Int8` and `Int8Array` are equal.
- A string literal reads the escapes JSON writes for a control character, `\n`, `\t`, `\r`, `\b`, `\f` and `\u0000` through `\u001f`, as that character, so `type('"a\\nb"')` is the unit `"a\nb"`, where it was `"a\\nb"`, and the expression of a literal holding one, which escapes it as JSON does, parses back. Any other escape is read as written, as before.
- A predicate is written, where it was left out, so an expression no longer claims the whole of what a narrow rejects some of. A keyword's is written as its keyword, so `string.date` and `string.creditCard` are their own expressions, where they were `string` and the credit card pattern, and parse back. A narrow of your own follows what it narrows by its name, as `string & isLong` for `type("string").narrow(isLong)`, or `fn` for a function without one. Where an intersection with one is unsatisfiable, the error says the same, where it listed the predicate separately.
- A pattern is written as its source with each `/` escaped, where it was its RegExp's `toString()`, which leaves a `/` in a class unescaped and writes an empty pattern `(?:)`. So `type("/[\\/]/").expression` and `string.base64`'s are `/[\/]/` and `/^(?:[\d+\/A-Za-z]{4})*...$/`, where the first `/` in the class ended the literal they printed, and `type("//").expression` is `//`.

### Leave out a number or Date option config already sets

A `domain` schema's `numberAllowsNaN` or `numberAllowsInfinity`, or a `Date` `proto`'s `dateAllowsInvalid`, set to `false` where config leaves it `false` is left out, as it is when unset, so the two are equal. `number.safe`, which set `numberAllowsNaN: false`, now equals `-9007199254740991 <= number <= 9007199254740991`, and its `json` no longer lists the option.

### Merge unions of connected ranges

Branches alike but for their range are one range when the ranges overlap or meet, as #751 asked: `1 < number < 10 | 10 <= number < 100` is `1 < number < 100`, `2 <= string <= 4 | 5 <= string <= 8` is `2 <= string <= 8`, and a unit at a bound joins it, so `number < 5 | number == 5` is `number <= 5`. Bounds covering every value are the basis alone: `number > 0 | number < 5` is `number` and `string >= 3 | string <= 2` is `string`. Ranges one value apart are their union excluding it, like `0 < number < 5 | 5 < number < 10`, which is `0 < number < 10 & number != 5`, and wider gaps stay a union, as do branches with different descriptions or messages. A basis allowing `NaN` or invalid Dates, which every bound rejects, keeps the union.

Ranges covering their whole basis reduce to the basis itself, so `number > 0 | number < 5` equals `type.number`, where it was an intersection holding only `number`, which `.json` and `.expression` matched but `.equals()` didn't.

### Merge unions of objects alike but for one key

Objects with the same keys, alike but for one key's value, are one object whose value is the union of theirs, as #751 asked: `type({ a: "string" }).or({ a: "number" })` is `{ a: number | string }`, and `{ kind: "a", x: string } | { kind: "b", x: string }` is `{ kind: "a" | "b", x: string }`. The key is optional if it's optional in either, and the merged values reduce like any union, so nested objects merge as well. Objects differing in their undeclared key handling, index signatures, descriptions or messages stay a union, as do ordered unions and a key with a default, whose default applies only to its own branch.

A merged `kind: "a" | "b"` still discriminates, since each value of a literal union is now a case of its own.

Data invalid for a merged object is reported as for any other object rather than by the union: `{ x: 5 }` is `kind must be "a" or "b" (was missing)` and `x must be a string (was a number)`, where it was `kind must be "a" or "b" (was undefined)`. A message configured on the union now replaces only an error at the object itself, like `must be an object`, so it no longer replaces the error on `kind`.

### Reduce wide unions of objects faster

A union is reduced by checking each pair of its branches, which intersected both objects in full. Objects requiring a key whose values are disjoint are now known to be disjoint from that key alone, and only branches alike enough to merge are tried for a merge. Merging eleven two-branch unions into 2048 branches (#1652) took about 90 seconds and now takes about 5.

### Export `Default` and `To` as types

`arktype` exports the `Default` and `To` types an inferred Type holds, so a declaration can name them as `import("arktype").Default`, like `Out` and `Brand`.

### Describe an object with its `"@"` key

An object definition's `"@"` key holds the object's own metadata, as `"@"` does in a tuple expression (#1554):

```ts
const User = type({
	"@": "a user",
	name: "string"
})

// ArkErrors: must be a user (was a number)
User(5)
```

Its value is a description or a meta object. Escape a key named `@` as `"\\@"`, as with `+` and `...`. In 2.2.9, `"@"` was an ordinary key.

`.merge()` takes `"@"` from the object it merges in, as it takes `"+"` and as a spread does, so `A.merge({ "@": "a B", b: "number" })` is described as `a B`. The merged-in object's meta replaces the base's, which is dropped either way.

`type.declare` takes the same escapes for a declared key named `@`, `+` or `...`, and accepts `"@"` and `"+"` on any declared object:

```ts
const User = type.declare<{ "@": string; name: string }>().type({
	"@": "a user",
	"\\@": "string",
	name: "string"
})
```

### Write a Type's JSON Schema with `jsonSchema` meta

`jsonSchema` meta replaces the JSON Schema a Type's constraints imply, so `toJsonSchema()` writes it rather than throwing for a narrow (#1571):

```ts
const Even = type("number")
	.narrow(n => n % 2 === 0)
	.configure({ jsonSchema: { type: "integer", multipleOf: 2 } })

// { $schema: "...", type: "integer", multipleOf: 2 }
Even.toJsonSchema()
```

The Type's other meta, like a description, is still written beside it. Unlike other meta, `jsonSchema` is configured on the Type alone, not on the Types it references. In 2.2.9, `toJsonSchema()` wrote `meta.jsonSchema` as an ordinary key.

### Write string keywords' formats in JSON Schema

`toJsonSchema()` threw a `predicate` error for `string.url`, `string.regex`, `string.json` and `string.date` (#1475). Each string keyword a standard annotation names is now written with it, whether or not arktype's check matches the standard's definition exactly:

| keyword                                    | JSON Schema                                                             |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| `string.date`                              | `format: "date-time"`                                                   |
| `string.date.iso`                          | `pattern`, `format: "date-time"`                                        |
| `string.url`, `string.regex`               | `format: "uri"`, `format: "regex"`                                      |
| `string.json`                              | `contentMediaType: "application/json"`                                  |
| `string.base64`, `string.base64.url`       | `pattern`, `contentEncoding: "base64"`, `"base64url"`                   |
| `string.email`, `string.uuid`, `string.ip` | `pattern`, `format: "email"`, `"uuid"`, `"ipv4"`, `"ipv6"`, as in 2.2.9 |

They're written wherever the keyword is constrained further, as in `"string.url < 100"`. In 2.2.9, `"string.email < 255"` dropped its `format`.

```ts
// { $schema: "...", type: "string", maxLength: 99, format: "uri" }
type("string.url < 100").toJsonSchema()
```

JSON Schema reads `format`, `contentEncoding` and `contentMediaType` as annotations, which a validator checks only if it's configured to. A keyword checked by a regex is written with that `pattern` too, so a validator still checks what arktype does. One checked by a function is written as its format alone, so its schema accepts strings the Type rejects. A validator that asserts formats, like Ajv with `ajv-formats`, can also reject strings arktype accepts: `date-time` requires a time that `string.date` and `string.date.iso` don't, and `uri` rejects a space in a path that `string.url` accepts. `string.date.epoch` and `string.creditCard`, which no format names, still throw. `contentEncoding` is configurable meta, like `format`.

### Write OpenAPI 3.0 schemas with `target: "openapi-3.0"`

`toJsonSchema()` and `~standard.jsonSchema` write an OpenAPI 3.0 Schema Object for `target: "openapi-3.0"` (#1707). In 2.2.9, `~standard.jsonSchema` threw for it, and `toJsonSchema()` wrote draft 2020-12 without `$schema`, as it did for any target it didn't know. Now any other target throws for both.

```ts
// { type: "string", nullable: true }
type("string | null").toJsonSchema({ target: "openapi-3.0" })

// { type: "number", maximum: 10, exclusiveMaximum: true, minimum: 0, exclusiveMinimum: true }
type("0 < number < 10").toJsonSchema({ target: "openapi-3.0" })
```

A literal is a one-value `enum` with its `type`, `null` beside a `type` is `nullable: true`, `examples` is its first `example`, and `string.base64` is `format: "byte"`. What OpenAPI 3.0 can't express throws, through a fallback that can write it instead: a tuple's elements go to the new `arrayPrefix`, `patternProperties` and `propertyNames` to `indexKey`, and the definitions a cyclic Type's `$ref`s point to in `#/components/schemas` to the new `defs`, to place in your document. `~standard.jsonSchema` writes a tuple as an array of its length, and the definitions as `definitions`.

Thanks to @MichaelDeBoey for #1707.

### Import subpaths like `arktype/config` with `moduleResolution: "node"`

TypeScript's `node10` resolution, which ignores `exports`, now finds the types of `arktype`'s subpaths like `arktype/config`, as well as those of `@ark/schema` and `@ark/aot`.

### Pass `toJsonSchema()`'s result where JSON Schema is expected

`JsonSchema`, which `toJsonSchema()` returns, can now be passed without a cast where a library expects `JSONSchema7` from `@types/json-schema` (e.g. the AI SDK's `jsonSchema()`) or `Record<string, unknown>` (e.g. OpenAI's function `parameters`), and any keyword can be read from it:

```ts
const schema = type({ name: "string" }).toJsonSchema()

// previously a type error, now unknown
schema.properties
```

Each branch allows any other keyword, as JSON Schema does, so an extension like `x-internal` or OpenAPI's `nullable` type-checks. Its arrays are mutable, and a `const`, `enum`, `default` or example is `Json`. `exclusiveMinimum` and `exclusiveMaximum` are no longer declared, since `target: "openapi-3.0"` writes `true` for them, so they read as `unknown`. Inferring from a `JsonSchema` branch with `@ark/json-schema` now includes `null`, since it may be `nullable`.

### Infer `.map()` on a union per branch

`.map()` already mapped each branch of a union at runtime, but its inferred type merged the branches, and its callback's argument held only the keys every branch shares (#1524). The argument now holds each branch's props, and the result is a union of the branches it builds:

```ts
const T = type({ kind: "'a'", a: "string" })
	.or({ kind: "'b'", b: "number" })
	.map(prop => prop)

// was: Type<{ kind: "a" | "b" }>
// now: Type<{ kind: "a"; a: string } | { kind: "b"; b: number }>
```

A prop the callback returns unchanged stays in its own branch, and any other goes to each branch with its key, or to every branch if no branch has its key. A changed value can't be traced to the branch it came from, so it's merged across them:

```ts
const T = type({ name: "'number'", type: "number" })
	.or({ name: "'string'", type: "string" })
	.map(prop =>
		prop.key === "type" ? { ...prop, value: prop.value.array() } : prop
	)

// Type<
// 	| { name: "number"; type: number[] | string[] }
// 	| { name: "string"; type: number[] | string[] }
// >
```

### Return errors as plain objects

The errors in an `ArkErrors`' `issues` are plain objects without getters or methods. Each has the keys its JSON had, in the same order, with `propString` before `expected`:

```ts
const out = type({ n: "number % 2" })({ n: 1 })

if (out instanceof type.errors) {
	// { data: 1, path: ["n"], code: "divisor", description: "even", meta: {}, rule: 2, propString: "n",
	//   expected: "even", actual: "1", problem: "must be even (was 1)", message: "n must be even (was 1)" }
	out.issues[0]
}
```

`ArkErrors` was an `Array` subclass. It is now a plain class whose `issues` is a plain array with one error per path, in the order each path first failed. Indexing, iteration, `length` and array methods move to `issues`:

```ts
if (out instanceof type.errors) {
	// previously out.map(e => e.message), now
	out.issues.map(e => e.message)
	// previously out[0], now
	out.issues[0]
	// previously for (const error of out), now
	for (const error of out.issues) console.log(error.message)
	// previously out.length, now
	out.issues.length
}
```

`issues` already returned the errors, so `out.issues.map(...)` works before and after this change. `Array.isArray(out)` is now false, and `arr.concat(out)` nests the errors, so pass `out.issues`. A Standard Schema failure's `issues` is a plain array rather than the `ArkErrors` itself, so read `summary` from the `ArkErrors`, or pass it to `flatProblemsByPath`.

An error's prototype is `Object.prototype`, so `error instanceof ArkError` is false and `` `${error}` `` is `[object Object]`. `arktype` exports `ArkError` only as a type, which comparing `code` narrows as `hasCode` did. `hasCode`, `transform`, `flat`, `throw`, `toString`, `toJSON` and `toLocaleString` are gone from errors, and `messageIn` writes one in a locale:

```ts
import { messageIn } from "arktype"
import { de } from "arktype/locales/de"

for (const error of out.issues) {
	// previously error.hasCode("divisor"), now
	if (error.code === "divisor") console.log(error.rule)
	// previously error.toLocaleString(de), now
	messageIn(error, de)
}
```

`messageIn` reads what the error was created with from the error validation returned, so a spread, `structuredClone` or Proxy of it throws.

`path` is a plain array rather than a `ReadonlyPath`. A `propString` passed to `ctx.reject` or `ctx.error` is ignored, since it's written from the path.

`ArkErrors` keeps `issues`, `count`, `summary`, `throw()`, `toJSON()`, `toString()` and `toLocaleString(locale)`. `byPath`, `flatByPath`, `flatProblemsByPath` and `byAncestorPath` are functions of an `ArkErrors`, exported by `arktype` and `@ark/schema`:

```ts
import { flatProblemsByPath } from "arktype"

// previously out.flatProblemsByPath, now
flatProblemsByPath(out)
```

An error at a `__proto__` path is an own key of the plain objects `flatByPath` and `flatProblemsByPath` return, where previously it set their prototype.

`ArkErrors.message`, added in 2.2.6, is gone: read `summary`. `toTraversalError` is gone too: call `throw()`. So are `add`, `addAncestorPaths`, `affectsPath`, `merge`, `transform`, `ctx` and `mutable`. `console.log` prints an `ArkErrors` as its issues. A callback adds an error with `ctx.error` or `ctx.reject` rather than `ctx.errors.add`, and a morph returning another validation's `ArkErrors` adds them at its path. A morph fails by returning an `ArkErrors` or an error `ctx.error` returned during its own call. Any other error it returns, like one an earlier morph added or another validation's, is its output, where it failed the morph before. `@ark/schema`'s `ArkErrorResult` type is gone, since a morph's failure is always an `ArkErrors`.

- Errors' text is written when they are first read, through `issues`, `summary`, `toString()`, `toJSON()`, `throw()` or Standard Schema's `issues`, so a configured writer is called once per error, where it was called at each read. A union or intersection whose locale has no `expected` for it is described in en, which writes its errors' `expected`, and a union's errors' `actual`, in en too. A locale function is called once per `ArkErrors`, at that read, where each read called it, so errors read after the language changed were written in the new one.
- An error has no `toJSON()`, so `JSON.stringify(error)`, or of an `ArkErrors`' or Standard Schema's `issues`, serializes its own keys: a symbol key in its path is `null`, a bigint, like one in a discriminant's `cases`, throws, and `cases`, `cause`, `missing` and `valueMeta`, which `toJSON()` leaves out, are included (`predicate` and `morph` are functions, which `JSON.stringify` drops either way). `out.toJSON()` is the JSON it was, plus each error's `propString`, and its paths are plain arrays holding a symbol key as the string `Symbol(name)`, as a `ReadonlyPath` serialized it.

### Find errors' issues when they're first read

A Type or standalone validator that calls no narrow or morph may find its errors' issues only when they're first read, so rejecting data costs little more than the check that rejected it. The issues describe the data as it is at that read: a write to it in between can change them, and data that no longer fails holds one root issue, `is invalid`. A getter or `Proxy` trap the check reads runs again at that read, and what it throws is thrown there. The errors hold the data until they're collected.

Read `summary` or `issues` before the data you validated can change, as it can when it's reactive form state or an Immer draft, or when an `await` comes before you report the errors:

```ts
const out = User(form)
// read now, while they describe the form that was validated
const summary = out instanceof type.errors ? out.summary : ""
```

### Print a nested Type longer than 1000 characters as `...`

A Type reusing another at several keys was written out in full at each, so its `expression` and `description` doubled with each level, and past about 20 levels defining it threw `RangeError: Invalid string length`. A nested value whose own string would be longer than 1000 characters is now printed as `...`, as `list<...>` already was:

```ts
// a Type reusing the one below at a, b, c and d, 13 levels deep
T.expression // { a: ...[], b: ...[], c: ...[], d: ...[], id: string }
```

### Print objects in error messages by their kind

An error's `actual` prints an object as `an object`, an array as `an array` and a function as `a function`, where it printed an object or array as compact JSON, a Date as its date, a function as `Function(name)` and another instance by its class's name. A message no longer grows with the data, and nothing an object holds reaches a log through it. Primitives print as before, and `before`, `after`, `!=` and a Date literal, like `d'2020-01-01'` or one of `type.enumerated`'s Dates, still print the Date they rejected:

```ts
// previously must be "a" or "b" (was {"x":1}), now (was an object)
type("'a' | 'b'")({ x: 1 })

// previously must be valid according to an anonymous predicate (was [1,2]), now (was an array)
type("number[]").narrow(() => false)([1, 2])
```

A `===` unit no longer says an object it rejected serializes like its own:

```ts
// previously must be reference equal to {} (serialized to the same value)
// now must be {} (was an object)
type("===", {})({})
```

`de` prints them as `ein Objekt`, `ein Array` and `eine Funktion`.

### Say a length is a length when a description replaces its bound

A length bound's `actual` is the bare length, which its own text explains (`must be at least length 8 (was 1)`). Where a description or configured `expected` replaces that text, the length is now named:

```ts
// previously must be a strong password (was 1), now (was length 1)
type("string >= 8").describe("a strong password")("x")
```

### Accept only plain objects and arrays in `object.json`

`object.json` accepted any object, so a `Map`, `Set`, `Date`, function or class instance passed though `JSON.stringify` doesn't write it as itself. It now accepts only arrays and objects whose prototype is `Object.prototype` or `null`, at every depth (#1337):

```ts
// was: { at: Date }
// now: ArkErrors: at must be a plain object or array (was an object)
type("object.json")({ at: new Date() })
```

JSON Schema can't require a plain object, so `toJsonSchema()` now throws for `object.json`, and for Types that include it like `string.json.parse`'s output, with the `predicate` code. Return `ctx.base` from that fallback to write the schema it wrote before:

```ts
type("object.json").toJsonSchema({ fallback: { predicate: ctx => ctx.base } })
```

`~standard.jsonSchema` leaves the check out, as it does every predicate.

Its values are its `jsonData` alias, so its `description` is `{ [string]: $jsonData }` and its `expression` `{ [string]: $jsonData } & isPlainObjectOrArray`, where they listed the alias's branches, and a value JSON can't hold is reported against each of them:

```ts
// was: ArkErrors: a must be an object (was a bigint)
// now: ArkErrors: a must be a number, a string, an object, boolean or null (was a bigint)
type("object.json")({ a: 1n })
```

### Throw for an optional index signature

A key like `"[k]?"` parsed as the literal key `"[k]"`, made optional, which is rarely what it means, as in a generic like `type("<k extends string>", { "[k]?": "number" })`. It now throws a `ParseError` and is a type error (#1525):

```ts
// was: Type<{ "[k]"?: string }>
// now: ParseError: Index signature [k] can't be optional. Escape its '[' with a backslash for an optional key named '[k]'
type({ "[k]?": "string" })
```

To keep the literal key, escape its `[`, which now works for an optional key as it already did for a required one:

```ts
// was: Type<{ "\\[k]"?: string }>
// now: Type<{ "[k]"?: string }>
type({ "\\[k]?": "string" })
```

### Accept exponents in `string.numeric`

`string.numeric` and `string.numeric.parse` accept an exponent like `"5.7e-10"` or `"1E+21"`, as `Number()` does, so a number `String()` writes with one, like `1e21`, now encodes through `string.numeric.parse` (#1448):

```ts
// was: ArkErrors: must be a well-formed numeric string (was "5.7e-10")
// now: 5.7e-10
type("string.numeric.parse")("5.7e-10")
```

Their JSON Schema `pattern` accepts an exponent too. `string.integer` still doesn't, since `string.integer.parse` reads only digits.

### Discriminate by each value of a literal union

A union of objects discriminated by a key checked only branches whose value there was a single literal. A branch whose value was a union of literals became the default, so data matching no branch was reported as failing that one (#1435, #1491):

```ts
const T = type.or(
	{ type: "'a'", val1: "number" },
	{ type: "'b'", val2: "number" },
	{ type: "'c' | 'd'", val3: "number" }
)

// was: ArkErrors: type must be "c" or "d" (was "e")
//      val3 must be a number (was missing)
// now: ArkErrors: type must be "c", "d", "a" or "b" (was "e")
T({ type: "e" })
```

Each of those literals is now a case of its own, so such data fails at the key with every value it allows, and data matching one of them is checked only against the branches that allow it.

### Report each branch when a union's discriminant identifies none

A discriminated union reported only what its discriminant reached. Data that couldn't hold the discriminant was told about a key it didn't have, and data matching none of the discriminant's values was reported as failing only the branches without the key, as if it had been meant for them (#1435):

```ts
const Shape = type({ kind: "'circle'", r: "number" }).or({
	kind: "'square'",
	side: "number"
})

// was: ArkErrors: kind must be "circle" or "square" (was missing)
// now: ArkErrors: must be an object (was a number)
Shape(5)

const Event = type({ id: "0", k1: "number" })
	.or({ id: "1", k2: "number" })
	.or({ name: "string" })

// was: ArkErrors: name must be a string (was missing)
// now: ArkErrors: id must be 0 or 1 (was 5) or name must be a string (was missing)
Event({ id: 5 })

// was: ArkErrors: must be a Date (was an object)
// now: ArkErrors: a must be 1 or 2 (was missing) or must be a Date (was an object)
type("Date").or({ a: "1" }).or({ a: "2" })({})
```

Each now reads as the same union would if it weren't discriminated. Where a parent of the discriminant isn't an object, or isn't an array where the discriminant is an element, each branch's error is listed. Where data matches none of the discriminant's values, its miss is listed beside the errors of the branches that don't have its key. Both are `union` errors.

A miss listed beside other branches at its path names each of its cases as they would be, as in a `match` with a default case:

```ts
const sizeOf = match({
	"string|Array": v => v.length,
	number: v => v,
	bigint: v => v,
	default: "assert"
})

// was: TraversalError: must be a string or an array (was boolean)
// now: TraversalError: must be a number, a bigint, a string or an array (was boolean)
sizeOf(true)
```

Data whose discriminant matches a value is still reported only against the branches that allow it, and a miss of a key the data could hold is still one `discriminant` error, like `kind must be "circle" or "square" (was "triangle")`.

Given `{ foo: null }`, `{ foo: string } | { foo: number } | { foo: Function }` says `foo must be a number, a string or an object (was null)`, where it said `foo must be an object, a number or a string (was null)`.

### Write each path a union lists as its own error would be

A union failing at several paths prefixed only the first with `value at` when it began with a bracket. Each path now reads as its own error would:

```ts
// was: ArkErrors: value at [0] must be a number (was a string) or [1] must be a string (was a number)
// now: ArkErrors: value at [0] must be a number (was a string) or value at [1] must be a string (was a number)
type("number[] | string[]")(["a", 1])
```

Each value a path allows is listed once, though a missing key's value is itself a union:

```ts
const T = type({ a: "1 | 2", b: "string" }).or({ a: "2 | 3", c: "number" })

// was: ArkErrors: a must be 1 or 2 or 2 or 3 (was missing)
// now: ArkErrors: a must be 1, 2 or 3 (was missing)
T({})
```

In `de`, a key a union lists as missing reads as a missing key's own error does: `a fehlt (muss eine Zeichenkette sein) oder b fehlt (muss eine Zahl sein)`, where it was `a muss eine Zeichenkette sein (ist nicht vorhanden) oder …`.

### Apply a pipe's configured `message` to its output's errors

`.configure({ message })` on a pipe set the message of errors its input raised, but not of those raised validating its output (#1479):

```ts
const Port = type("string.numeric.parse | number")
	.to("0 < number <= 65535")
	.configure({ message: "Enter a port number." })

// was: ArkErrors: must be at most 65535 (was 99999)
// now: ArkErrors: Enter a port number.
Port("99999")
```

The output's own Type, `Port.out`, keeps its errors, description and JSON Schema.

### Surface a message every failing branch or constraint was configured with

A union or intersection error was written from what its errors expected, even when each was configured with the same `message`. It now surfaces that message (#1492, #1412):

```ts
const Email = type("string.email > 0").configure({
	message: "Email is not valid"
})

// was: ArkErrors: ("") must be...
//        ◦ an email address
//        ◦ non-empty
// now: ArkErrors: Email is not valid
Email("")
```

Errors whose messages differ, or that weren't all configured with one, are still written from what they expected, as is a union or intersection configured with a message of its own. A message `ctx.reject` supplied counts as configured.

### Keep defaults in `~standard.jsonSchema.input`

`~standard.jsonSchema.input` wrote the schema of a Type's `in`, which has no defaults, so a key's `default` was dropped. It now writes the Type as it's accepted (#1575):

```ts
const T = type({ name: 'string = "Anon"' })

// was: { type: "object", properties: { name: { type: "string" } } }
// now: { type: "object", properties: { name: { type: "string", default: "Anon" } } }
T["~standard"].jsonSchema.input({ target: "draft-2020-12" })
```

`input` writes each morph's input rather than calling a configured `morph` fallback, and no longer writes `additionalProperties: false` for `"+": "delete"`, whose input may have the keys it removes. `output` and `toJsonSchema()` are unchanged.

Thanks to @ybai08 for #1695.

### Describe what an `instanceof` check rejected as a domain check does

A proto error's `actual` was a bare domain or class name, while a domain error's names the domain with an article. It now names a primitive or plain object as a domain error does. A builtin's instance is still named by its class, without an article that would be a guess:

```ts
// was: ArkErrors: must be a Date (was number)
// now: ArkErrors: must be a Date (was a number)
type("Date")(5)

// was: ArkErrors: must be an array (was object)
// now: ArkErrors: must be an array (was an object)
type("string[]")({})

// ArkErrors: must be a Date (was Map), as before
type("Date")(new Map())
```

`de` already wrote these with its nouns.

### Say "an array" where a union's object branches are arrays

A union discriminated by domain described its object case as `an object`, even when every branch it reached was an array. It now says `an array`, and its error's `cases` holds `"Array"` in place of `"object"`:

```ts
// was: ArkErrors: must be a string or an object (was a number)
// now: ArkErrors: must be a string or an array (was a number)
type("string | string[]")(5)
```

A `switch` over a `discriminant` error's `cases` must handle `"Array"`.

### Write `string.regex` errors as `string.json` writes its own

A `string.regex` error's problem was the bare `SyntaxError` the pattern threw. It now says what was expected, as `string.json`'s does and `de` already did:

```ts
// was: ArkErrors: SyntaxError: Invalid regular expression: /(/: Unterminated group
// now: ArkErrors: must be a regex pattern (SyntaxError: Invalid regular expression: /(/: Unterminated group)
type("string.regex")("(")
```

### Say how to fix an indeterminate morph union or intersection

The `ParseError` for a union of a morph and a type whose inputs overlap, or for an intersection of distinct morphs, now ends with how to fix it:

```ts
// ParseError: An unordered union of a type including a morph and a type with overlapping input is indeterminate:
// Left: (In: unknown) => To<number % 1>
// Right: null
// Make their inputs disjoint, e.g. by narrowing the morph's input, or pipe the union of their inputs to a single morph.
type("unknown").pipe(Number).to("number.integer").or("null")

// ParseError: The intersection of distinct morphs at a single path is indeterminate:
// Left: (In: string) => Out<unknown>
// Right: (In: string) => Out<unknown>
// To apply both, pipe one to the other instead, e.g. with .to().
type("string")
	.pipe(s => s.length)
	.and(type("string").pipe(s => s.trim()))
```

### Say what a morph's input checks when it rejects a default

A default is checked against a morph's input, but a description configured on the morph described the input too, so the error could contradict itself:

```ts
const Flag = type("'true' | 'false'")
	.pipe(s => s === "true")
	.describe("boolean")

// was: TraversalError: must be boolean (was false)
// now: ParseError: Default for flag must be "false" or "true" (was false)
type({ flag: [Flag, "=", false] })
```

### Name the undeclared key an intersection can't add

Intersecting an object that deletes or rejects undeclared keys with one that adds a key now says why the result is unsatisfiable:

```ts
// ParseError: Intersection at token of never and string results in an unsatisfiable type
// token is undeclared on a side that deletes undeclared keys.
// To add it, use .merge(), which takes "+" from the merged object.
type({ "+": "delete", id: "number" }).and({ token: "string" })
```

### Throw for overlapping objects in a union when `onUndeclaredKey` is `"delete"`

With `onUndeclaredKey: "delete"` configured, a union of objects whose inputs overlap was built, though the same union with `"+": "delete"` in each object threw. Data both branches allowed came out as whichever sorted first, without the keys only the other declares. It now throws either way:

```ts
configure({ onUndeclaredKey: "delete" })

// previously returned { blob: "b", uri: "u" } for { uri: "u", text: "t", blob: "b" }, now throws:
// ParseError: An unordered union of a type including a morph and a type with overlapping input is indeterminate:
// Left: { blob: string, uri: string, + (undeclared): delete }
// Right: { text: string, uri: string, + (undeclared): delete }
// Make their inputs disjoint, e.g. by narrowing the morph's input, or pipe the union of their inputs to a single morph.
type({ uri: "string", text: "string" }).or({ uri: "string", blob: "string" })
```

Give the branches a key that tells them apart, or delete outside the union:

```ts
const Discriminated = type({
	kind: "'text'",
	uri: "string",
	text: "string"
}).or({ kind: "'blob'", uri: "string", blob: "string" })

// { uri: string, text?: string, blob?: string }
const Contents = type({ "+": "ignore", uri: "string", text: "string" })
	.or({ "+": "ignore", uri: "string", blob: "string" })
	.to({ uri: "string", "text?": "string", "blob?": "string" })
```

An object that deletes undeclared keys now allows them in its `.in`, which took `onUndeclaredKey`'s configured `"delete"` or `"reject"` instead.

An object's `"+": "ignore"` holds where `onUndeclaredKey` is configured otherwise, in what's built from it too: its `.in` where it holds a morph, an intersection, `.merge()`, `.partial()` and `.onUndeclaredKey("ignore")` each took the configured `"delete"` or `"reject"` back. Such an object's `expression` ends with `+ (undeclared): ignore`, and a union with an overlapping branch throws, where it was built and returned data unchanged:

```ts
configure({ onUndeclaredKey: "delete" })

const C = type({ provider: "string" })

// previously built, now throws ParseError: ... is indeterminate
C.or({ "+": "ignore", uses: "string", "o?": C })
```

### Name the code, path and fallback in a `ToJsonSchemaError`

A `ToJsonSchemaError`'s message was only its printed context. It now starts with a sentence naming its code, where in the Type the part it couldn't convert is, and the `fallback` to configure:

```ts
// was: ToJsonSchemaError: { code: "date", base: {} }
// now: ToJsonSchemaError: Can't convert "date" at user.createdAt to JSON Schema. Configure fallback.date to write it:
//      { code: "date", base: {} }
type({ user: { createdAt: "Date" } }).toJsonSchema()
```

### Add codecs

`codec` from `arktype/codecs` pairs a morph with its inverse (#909). Every Type has `.encode`, a Type that inverts each of its morphs to turn output back into input, so a codec encodes wherever it is nested:

```ts
import { codec } from "arktype/codecs"

const EpochMs = codec("number.integer", "Date", {
	decode: n => new Date(n),
	encode: d => d.getTime()
})

const Event = type({ name: "string", at: EpochMs })

// { name: "launch", at: new Date(0) }
const event = Event({ name: "launch", at: 0 })
// { name: "launch", at: 0 }
const encoded = Event.encode(event)
```

`.encode` validates its input against the Type's output and its result against the Type's input. A defaulted key is required when encoding, and a union tries its branches without morphs first. Parse keywords like `string.date.iso.parse` encode back to strings, and format keywords like `string.trim` encode a formatted string as itself. Accessing `.encode` throws a `ParseError` if a morph has no inverse, or if `arktype/codecs` isn't imported: it installs encoding, so an app that doesn't encode doesn't ship it. A precompiled standalone build encodes wherever it folds `.encode`, since it installs encoding itself. See [the docs](https://arktype.io/docs/codecs).

A codec's inverse is part of its morph node's schema as `inverse`, so it appears in `.json`.

### Write error messages in other languages

Configure a locale to write error messages in another language (#1498). ArkType ships two: `en`, the default, and `de`.

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

`locale` can also be a function, e.g. to return the locale of the current request, which is called when an `ArkErrors`' errors are first read. Messages are written then, so validation does no locale work. `ArkErrors` gains `toLocaleString(locale)`, which writes its summary in the locale it is given, and `messageIn(error, locale)` writes one error's message in it.

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

`arktype` writes errors only in `en` unless its renderer of other locales is installed, which keeps it out of a bundle that doesn't need it. Importing `arktype/locales/de`, `arktype/locales/en` or `arktype/i18n` installs it. A locale you write yourself, or a function, needs one of them:

```ts title="config.ts"
import { configure } from "arktype/config"
import "arktype/i18n"
import { fr } from "./fr.ts"

configure({ locale: fr })
```

Without it, creating a Type with that locale configured throws, as does `toLocaleString` or `messageIn` with that locale.

### Give undeclared keys the `undeclared` code

A key that `"+": "reject"` disallows was a `predicate` error (#1403). It now has the code `undeclared`, and its `data` is the key's value rather than the object around it, as every other error's `data` is the value at its path:

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
	if (error.code === "discriminant") error.cases
}
```

Configure its text with `discriminant` instead of `predicate`. Its message is unchanged, except that `.configure({ expected, actual })` on a union whose discriminant is the value itself now applies, and that inside an outer union, it prints the discriminant's value rather than the object around it:

```ts
// previously must be "a", "b" or "c" (was "d")
// now must be a letter (was "d")
type("'a' | 'b' | 'c'").configure({ expected: "a letter" })("d")

const T = type({ v: Shape }).or({ v: { kind: "string >= 9" } })

// previously (was {"kind":"triangle"})
// now v.kind must be "circle", "square" or at least length 9 (was "triangle")
T({ v: { kind: "triangle" } })
```

A union of two literal values, like `boolean` or `"jpg" | "png"`, was a `union` error listing each value's error. It's now a `discriminant` error too, with `cases` where it had `errors`, so `union` config no longer reaches it. Its message is unchanged.

At a key, its `meta` is the union's without `expected` and `actual`, which describe the object around the key rather than its value. Its JSON also includes `description`, the cases it expected (`"circle" or "square"`).

### Pass error writers the error and the locale

Each error writer receives the active locale as its last argument. An `expected` writer receives the error rather than only its context, so it can read `data` and `path` too, and an `actual` writer receives `(data, error, locale)`.

A writer's `ctx` is typed by its code, without the parts of the message that could read the one it writes. `ctx.meta` may be `undefined` in an `expected` writer, as it already could in the others, since an error raised by `ctx.reject` has no meta:

```ts
import { configure } from "arktype/config"

// previously type-checked and threw for an error from ctx.reject
// now TS18048: 'ctx.meta' is possibly 'undefined'
configure({ predicate: { expected: ctx => ctx.meta.title! } })
```

### Reference the morph that threw in `pipe.try` errors

A `pipe.try` error referenced the function that threw as `predicate` and wrote what it threw into its own `actual`. It now references the function as `morph`, with what it threw as `cause`, and writes its `actual` when read. Its message is unchanged, and an `actual` configured for `predicate` now reaches it.

### Raise keyword parse errors as data

The errors that `string.integer.parse`, `string.date.parse`, `string.url.parse`, `string.json`, `string.json.parse` and `string.regex` raise while parsing carried their own English `expected` text, and some their own `problem`. They now carry `meta.keyword`, a `description`, and what was thrown, if anything, as `cause`. Their messages are unchanged, and `predicate` config now reaches the text their own hid.

### Reserve `meta.keyword`

Built-in keywords set `meta.keyword` to their name, so a locale can find their phrase. Configuring a description, e.g. with `.describe()`, removes it, and JSON Schema omits it. A keyword's meta in `.json` is therefore `{ description, keyword }` where it was the description string. Rename meta of your own named `keyword`.

### Run precompiled validators on `arktype/runtime`

`@ark/aot` can replace each Type a program defines with a validator that runs on the new `arktype/runtime` entry, without arktype's parser or nodes and without generating code, so it validates under a Content-Security-Policy that blocks `eval` (#810):

```ts
// vite.config.ts
import { precompile } from "@ark/aot/unplugin"

export default defineConfig({
	plugins: [precompile.vite()]
})
```

```ts
// bundled as a validator that validates, asserts and implements Standard Schema as the Type does
export const User = type({ name: "string > 0" })
```

Scopes, Modules, Generics, cyclic Types, `match`, `type.fn` and codecs are precompiled too. A Module becomes a plain object of its validators, and a Scope or Generic an empty object, since resolving an alias or instantiating a Generic needs arktype:

```ts
const $ = scope({
	tree: { value: "number", "children?": "tree[]" },
	"box<t>": { box: "t" }
})

// bundled as an object of validators, whose box is an empty object
export const types = $.export()
// bundled as a validator, which validates cyclic data as the Type does
export const BoxedTree = types.box("tree")
```

A call to `define`, which returns its argument, is replaced by the argument.

A validator differs from the Type it replaces:

- It lacks the members that compose a Type, like `and` or `in`, so calling one is a TypeError, and keeps `meta` but not a keyword's.
- It has `expression`, `description`, `json`, `toJSON()`, `toJsonSchema()` and `~standard.jsonSchema` only where the build's `members` option sets them, and reads `undefined` for one it lacks. Where `arktype/runtime` resolves under the `"development"` condition, as in Vite's dev server, Vitest and webpack's development mode, reading one it lacks throws, naming the member to set, and `console.log` prints its errors as their issues. Outside a production build, reading a `~standard.jsonSchema` it lacks throws too, so a library converting it to JSON Schema says what to set rather than failing on `undefined`.
- It and its members are frozen, except a Date or RegExp it holds, unless the build sets `freeze: false`.
- The build refuses what the runtime can't reproduce, like an instance of a class other than Date or RegExp, naming it.
- A build installs encoding itself, so `.encode` works in a precompiled program that never imports `arktype/codecs`, where arktype throws. A Type with a morph that has no inverse fails the build where its `.encode` is read.
- It links only to the `arktype/runtime` of the arktype version it was built with, so a runtime from another version fails the build or Node's module linking.
- Its errors' `issues` are plain objects holding `code`, `path`, `data` and `expected`, the failing node's description, with a plain message like `name must be a string` or `name is invalid` that doesn't say what the value was unless text configured for it does. Errors at one path stay apart, and a union no branch allows is one issue. A validator a morph calls with its `ctx` adds its issues to that validation. `arktype/runtime` doesn't export `byPath`, `flatByPath`, `flatProblemsByPath`, `byAncestorPath` or `messageIn`, and the errors have no `toLocaleString`.
- When it rejects an array, it may look for errors only from the first element it rejects, so a getter or `Proxy` trap reading an element before that one runs once rather than twice, and an element that reads differently the second time is judged by its first read.
- A `message`, `problem`, `expected` or `actual` configured on a Type or for a code with `configure()`, as a string or a function, is written as arktype writes it. The build refuses a configured locale, a function writing a union's text, text a scope configures for a code, and `predicate` text configured where a narrow or morph can raise it.
- The `ctx.config` a narrow or morph receives holds only `jitless` and `onFail`.
- A program's `configure()` call configures `arktype/runtime`, which fixes its configuration at the first validator it creates and throws if `configure()` comes later or differs from the build's.

Build with `errors: "first"` to stop each validation at its first issue:

```ts
precompile.vite({ errors: "first" })
```

### Copy objects without boxing their numbers

A Type deleting undeclared keys writes its copy as a literal of nulls it then fills, as a build does unless it's built for size, so V8 lets the copy's fields hold any value and stores the numbers it takes from data as data holds them, rather than allocating a box for each fraction. Parsing moltar's benchmark object with `onDeepUndeclaredKey("delete")` allocates 128 bytes per call where it allocated 144, in 0.88x the cycles.

### Compile and discriminate a Type when it's first used

A Type is compiled the second time it's called or its `allows` is called, or when its `precompilation` is read, rather than when it's defined, so Types a program defines but never calls aren't compiled and one it checks once is checked without compiling. A Type whose narrows or morphs read `ctx` is compiled the first time instead. A scope's exports are compiled the same way, so `@ark/schema`'s scope `precompilation` is undefined unless the scope is cyclic. A Type referencing an alias is still compiled where it's defined, so an error resolving the alias is thrown there. Checking a default as it's defined doesn't count as a use of the Type it's checked against.

A union finds its discriminant when it's compiled, checks data, describes a miss or has its references read, rather than when it's created. Where a scope has several definition errors, which is thrown first can change, and can differ between JIT and jitless, e.g. an indeterminate union of morphs before an invalid default it includes.

A host that refuses code generation once it has loaded, as Cloudflare Workers do within a request, has its Types checked as with `jitless` from then on.

### Order keys by code unit

Keys are ordered by code unit, where they were ordered as `JSON.stringify` writes them, so only keys that first differ where JSON escapes a character, or where one ends and the other continues, can change places. Keys now order differently when they first differ:

- where one key ends and the other continues with a space or `!`: `"a"` now precedes `"a b"` and `"a!"`
- at a control character, against a space, `!`, `"`, a backslash, a character from `#` to `[`, or some other control characters
- at `"`, against a character from `#` to `[`
- at a lone surrogate, against a character from U+005D to U+D7FF: `"ab"` now precedes `"a\uD800"`

Other keys that first differ at a space, `!`, `"` or a backslash keep their order. That order is the order of keys in a Type's `expression` and `json`, its JSON Schema's `properties` and `required`, and the errors it reports.

### Install the set algebra from `arksets`

The algebra that intersects nodes, reduces unions and writes JSON Schema moved from `@ark/schema` to `arksets`, which `arktype` imports. A program using `@ark/schema` alone must `import "arksets"` before it parses a schema. Without it, intersecting a node or calling `toJsonSchema()` throws `Set algebra is not installed (import "arksets" to install it)`, and a union isn't reduced:

```ts
import "arksets"
import { rootSchema } from "@ark/schema"

// { domain: "string" }, without arksets ["string", { domain: "string", minLength: 1 }]
rootSchema([{ domain: "string" }, { domain: "string", minLength: 1 }]).json
```

The functions `@ark/schema` exported for it, like `intersectNodesRoot`, `intersectBranches`, `reduceBranches`, `pruneDiscriminant`, `flattenConstraints` and the `write*IntersectionMessage` and `writeIndiscriminableMorphMessage` writers, are exported by `arksets/internal`.

### Simplify `@ark/schema` nodes

- A scope's `references` and `byId` are collected when first read rather than as it exports, unless code `@ark/aot` built with `runtime: "arktype"` is registered or it includes an alias.
- A node's `tAllows` and `tApply` (before: `traverseAllows`, `traverseApply`) and its new `tTransform` are methods of its class, so call them on the node, as in `node.tAllows(data, ctx)`, rather than detached, as in `[x].every(node.tAllows)`, until the JIT compiles it, which replaces them with compiled functions that run detached. A jitless scope's nodes keep the methods, and `domain`, `unit`, `proto`, `pattern`, `min` and `max` nodes still create a `tAllows` of their own.
- `$.node(kind, input)` takes a node's inner, with children already nodes, rather than the schema format, so `$.node("min", 5)` is now `$.node("min", { rule: 5 })`. Parse the schema format with `rootSchema` or `$.schema`.
- `NodeParseContext`, what `parseNode` takes, is `{ kind, def, $, id, alias, reduced }`, where it extended `NodeParseContextInput` and a definition's attached parse context. A node's id is registered as it's created, from its `alias` or kind unless `id` is passed, so a schema that resolves to a node the scope already holds registers none.
- Members nothing used are gone: an alias's `resolutionId` (read `resolution.id`), a node's `assertHasKindIn`, `isConstraint` and `isRefinement`, a root's `shortDescription`, a morph's `declareIn` and `serializedMorphs`, a structure's `optionalKeys`, a union's `discriminantJson` (call `discriminantJsonOf(union)` from `arksets/internal`), and `Scanner`'s `jumpToIndex` in `@ark/util`. A union of two literal values now has a `discriminant` too.
- Fields each node computed whether or not it was compiled are gone: a constraint's `compiledCondition`, a predicate's `compiledNegation`, a morph's `compiledMorphs` and a sequence's `optionalsLength`. A leaf writes its check with `jsCond(js, data)`. The `PrecompiledReferences` type, which described a precompiled unit nothing builds, is gone too.
- Derived and memoized keys moved from a node's own enumerable keys to its cache, `node.c`, like the flags `alters` and `ctxPred`, `kv`, a structure's `byKey`, a node's `assert` and the `expression` of a union, intersection, structure, required prop or index signature; each reads as before, and none that's now computed when read can throw. A node's flags are bits of its own `bits`.

### Start a morph's `morphs` with its input

A morph node's input is the first of its `morphs` rather than its own `in`, so its `json` is `{ morphs: ["string", "$ark.trim"] }` where it was `{ in: "string", morphs: ["$ark.trim"] }`, and a node it pipes to is written by its shorthand too (#1179). A schema or `$.node` input with `in` still parses, as the first of its `morphs`, and `morphs` in a schema can start with a schema. Each part has a name that says which it is:

| Was                                            | Now           |                                                                                                         |
| ---------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------- |
| `inner.in`, `introspectableIn`                 | `head`        | the node data must allow before any morph runs, its own morphs included                                 |
| `morphs` without `in`, ending with `lastMorph` | `piped`       | what the head pipes data to: functions, then nodes                                                      |
| `lastMorphIfNode`                              | `tail`        | the node the output is piped to, if `morphs` ends with one besides its head                             |
| `introspectableOut`                            | `tail._out`   |                                                                                                         |
| `rawIn`, `rawOut`                              | `_in`, `_out` | any node's input or output with each morph replaced by its own, which `.in` and `.out` return as a Type |

Intersecting two morphs intersects their heads, where it intersected their `rawIn`, which dropped the morphs within either input:

```ts
const keep = (o: object) => o
const A = type({ a: "string.numeric.parse" }).pipe(keep)
const B = type({ b: "string" }).pipe(keep)

// { a: 5, b: "x" }, where a stayed "5"
A.and(B)({ a: "5", b: "x" })
```

The `out` a JSON Schema `morph` fallback is given for a pipe to a cyclic alias is now that alias's output where it was its input.

### Shorten long internal names

Internal members, read through `.internal`, `@ark/schema` or `@ark/util`, have short names, since a minifier keeps property names and the JIT writes some of them into the code it compiles. Each works as before under its new name, which its JSDoc spells out:

| Was                                           | Now                  |
| --------------------------------------------- | -------------------- |
| `$ark.intrinsic`                              | `$ark.kw`            |
| `allowsRequiresContext`                       | `allowsCtx`          |
| `applyStructuralOperation`                    | `applyStruct`        |
| `assertHasKind`                               | `assertIs`           |
| `baseInstantiation`                           | `baseInstance`       |
| `bindReference`                               | `bindRef`            |
| `boundOperandKind`                            | `opKind`             |
| `cache`                                       | `c`                  |
| `cacheGetter`                                 | `memo`               |
| `collapsibleJson`                             | `bareJson`           |
| `collapsibleKey`                              | `bareKey`            |
| `_compileDeclaresKey`                         | `_jsDeclaresKey`     |
| `compiledErrorContext`                        | `jsErrorCtx`         |
| `compiledKey`                                 | `keyStr`             |
| `compiledValue`                               | `unitJson`           |
| `compileExhaustiveEntry`                      | `jsEntry`            |
| `compileIndiscriminable`                      | `jsIndisc`           |
| `configureReferences`                         | `configureRefs`      |
| `createParseContext`                          | `createParseCtx`     |
| `_createTransformContext`                     | `_tfContext`         |
| `currentErrorCount`                           | `errN`               |
| `defaultablesAndOptionals`                    | `maybes`             |
| `defaultablesLength`                          | `defLen`             |
| `defaultEntries`                              | `defaultPairs`       |
| `defaultShortDescription`                     | `brief`              |
| `defaultValueMorph`                           | `defMorph`           |
| `defaultValueMorphs`                          | `defMorphs`          |
| `elementAtIndex`                              | `atIndex`            |
| `errorContext`                                | `errorCtx`           |
| `errorCount`                                  | `errN`               |
| `errorFromNodeContext`                        | `nodeError`          |
| `_exportedResolutions`                        | `_exported`          |
| `finalize`                                    | `fin`                |
| `finalizeInnerJson`                           | `fixJson`            |
| `hasAssociatedError`                          | `ownErr`             |
| `hasDefault`                                  | `hasDef`             |
| `hasEqualMorphs`                              | `sameMorphs`         |
| `hasKind`                                     | `is`                 |
| `hasOpenIntersection`                         | `canStack`           |
| `impliedBasis`                                | `implied`            |
| `impliedSiblings`                             | `impliedBy`          |
| `includesContextualPredicate`                 | `ctxPred`            |
| `includesTransform`                           | `alters`             |
| `initializeErrorCount`                        | `initErrCount`       |
| `innerEntries`                                | `kv`                 |
| `intersectionIsOpen`                          | `stacks`             |
| `invoke`                                      | `inv`                |
| `keyExpression`                               | `keyExpr`            |
| `leftBound`                                   | `lBound`             |
| `lookahead`                                   | `peek`               |
| `lookaheadIs`                                 | `peekIs`             |
| `lookaheadIsIn`                               | `peekIsIn`           |
| `maxLengthNode`                               | `maxNode`            |
| `minLengthNode`                               | `minNode`            |
| `Morph.implementation`, as each kind's module | `Morph.impl`         |
| `nestableExpression`                          | `nestedExpr`         |
| `nextLookahead`                               | `peekNext`           |
| `nodesByRegisteredId`                         | `nodesById`          |
| `normalizeRootScopeValue`                     | `normValue`          |
| `numericLimit`                                | `numRule`            |
| `obviatesBasisDescription`                    | `coversNoun`         |
| `obviatesBasisExpression`                     | `coversExpr`         |
| `optionallyChainedPropString`                 | `pathStr`            |
| `parseDefinition`                             | `parseDef`           |
| `parseOwnDefinitionFormat`                    | `parseOwn`           |
| `popBranch`                                   | `popBr`              |
| `postfixLength`                               | `postLen`            |
| `prefixLength`                                | `preLen`             |
| `preparseOwnAliasEntry`                       | `preparseEntry`      |
| `preparseOwnDefinitionFormat`                 | `preparseOwn`        |
| `prereduced`                                  | `reduced`            |
| `preserveUndefined`                           | `keepUndef`          |
| `prestructurals`                              | `preStruct`          |
| `prevariadic`                                 | `leading`            |
| `propsByKey`                                  | `byKey`              |
| `pushBranch`                                  | `pushBr`             |
| `pushRootToBranch`                            | `pushRootBranch`     |
| `referencesById`                              | `byId`               |
| `referenceToId`                               | `refToId`            |
| `requiresContext`                             | `needsCtx`           |
| `requiresContextFor`                          | `needsCtxFor`        |
| `requiresInvalidDateCheck`                    | `checksInvalid`      |
| `requiresNaNCheck`                            | `checksNaN`          |
| `resolutions`                                 | `res`                |
| `resolvedConfig`                              | `cfg`                |
| `rootApplyStrategy`                           | `applyMode`          |
| `scanner`                                     | `sc`                 |
| `serializedValue`                             | `jsUnit`             |
| `shallowMorphs`                               | `topMorphs`          |
| `shallowReferences`                           | `shallowRefs`        |
| `shiftUntilLookahead`                         | `shiftUntilNext`     |
| `shiftUntilNonWhitespace`                     | `skipSpace`          |
| `shouldTransform`                             | `shouldTf`           |
| `structuralMorph`                             | `structMorph`        |
| `throwInternalOperandError`                   | `throwOperandError`  |
| `_transform`                                  | `_tf`                |
| `traversalKind`                               | `trav`               |
| `traverseAllows`                              | `tAllows`            |
| `traverseApply`                               | `tApply`             |
| `traverseKey`                                 | `travKey`            |
| `undeclaredKeyHandling`                       | `undeclaredHandling` |
| `variadicOrPostfix`                           | `trail`              |

### Read an object definition's values as its keys are parsed

An object definition's values are read as each key is parsed rather than all before the first, so a getter on the definition runs later, and if one throws while an earlier key is invalid, the earlier key's error is thrown instead.

### Read data in a different order

A getter or `Proxy` trap on validated data can run a different number of times, and in a different order, than before, and a value that reads differently each time can be allowed if any read is. In detail:

- `allows`, and the check a call runs before it looks for errors, read the first key they check before checking that data is an object, and again as they check its value, so a getter or `get` trap for that key can run twice, and one on a primitive's prototype, such as `String.prototype` or `Object.prototype`, runs before the primitive is rejected. They then look for `Object.prototype` in the object's prototype chain, so the `getPrototypeOf` trap of any `Proxy` on it runs, and an error from that trap propagates, as one from a getter does.
- `allows`, and the check a call runs before it looks for errors, read a required key whose value can't be `undefined`, a morph's input included, without first asking whether data has it, so a `has` trap doesn't run for it.
- `allows`, and the check a call runs before it looks for errors, may read a value checked against a union, `boolean` included, once for each branch, so its getter or trap can run more than once, and a value that reads differently each time is allowed if any of those reads is.
- Checking that a `Date` is valid reads its `getTime` and calls it as a method when it's `Date.prototype.getTime`, so a getter or trap for `getTime` runs as it's checked.
- A call that reports errors may read a failing prop's value more than once, so its getter or trap can run again, and a value that reads differently each time is allowed if any of those reads is.
- `allows`, and the check a call runs before it looks for errors, read a key whose value is a number, or a unit other than a string, before the other keys, one whose value is an object after the other primitives and one whose value holds an array or a regex last, though never past one whose value runs a narrow or a morph, so each runs for the same data as before and errors list keys in the same order.
- A transform that copies an object asks whether it has its first required key first, so a `has` trap runs once more.
- Checking that data is valid asks whether each key it walks is the object's own before whether it's declared, so a `getOwnPropertyDescriptor` trap runs for each enumerable key, where it ran only for an undeclared one.
- `"+": "delete"` reads an array's keys once to tell whether it holds any besides its indices, and looks for undeclared keys only when it does, so a `Proxy` whose `ownKeys` trap lists a named key before an array's indices can keep that key.
- When `"+": "delete"` transforms an array's elements and declares no keys besides its indices, it copies the array with `slice` and no longer reads its undeclared keys, so their getters and the `ownKeys` and `getOwnPropertyDescriptor` traps don't run. As a stripped object is always a new one, every array of objects is copied.

### Capture only what `string.date.iso`'s pattern backreferences

`string.date.iso`'s pattern captures only the groups its backreferences read. It accepts the same strings, but its source changes, and with it the `expression`, `json` and JSON Schema `pattern` of `string.date.iso` and `string.date.iso.parse`'s input.

### Check numeric strings by their characters

`string.numeric` and `string.integer`, and the inputs of their `parse` morphs, check a string by reading its characters rather than testing their patterns, as do `@ark/util`'s `isNumericString` and `isWellFormedInteger`, which now read only strings. They accept the same strings, and their `expression`, `json` and JSON Schema are unchanged. A pattern node with either source, like `numericStringMatcher` from `@ark/util`, holds the check as `test`.

### Read `File` from `platformConstructors` when it's used

`@ark/util`'s `platformConstructors.File` and `builtinConstructors.File` are getters, as `FormData`, `Headers`, `Request` and `Response` are, returning `globalThis.File`, or `Blob` where it's missing, each time they're read. A `File` installed after import is the one they return. In a bundle that never reads `builtinConstructors`, `objectKindOf` builds its own table at its first call, capturing `Blob`, `URL` and the other constructors then rather than at import.

### Check IP addresses and ISO dates by their characters, and UUIDs by their length first

`string.ip.v4`, `string.ip.v6` and `string.date.iso` (and its `parse` morph's input) check a string by reading its characters rather than testing it against their patterns, and accept the same strings, and `string.uuid` tests its pattern only against a string of a UUID's length. A valid IPv4 address takes about half the instructions, an IPv6 address up to 6x fewer, and a string that can't start one is rejected in a fifth of the instructions or less. `string.date.iso` reads `YYYY-MM-DD` and `YYYY-MM-DDTHH:mm:ss` with a fraction and `Z` or an offset itself, and other forms with its pattern. Their patterns are unchanged, as are their `expression`, `json` and JSON Schema, and as with `string.numeric`, any pattern with the same source is checked the same way. `uuidMatcher`, `ipv4Matcher`, `ipv6Matcher` and `iso8601Matcher` and their tests (`isUuid`, `isIpv4`, `isIpv6`, `isIso8601`) are exported by `@ark/util`. A build with `optimize: "size"` still checks them by their patterns, which are smaller, as it now does `string.numeric` and `string.integer`.

### Call narrows and morphs without a receiver when jitless

A narrow's predicate was called with its node as `this` when jitless, and a Type whose morphs need no `ctx` called them with its morphs array as `this`. Both are now called as compiled code calls them, with `this` undefined.

### Relate Types regardless of their meta

`.extends` and `.subsumes` compared a Type with its intersection including the meta of every node in it, so a union described with `.describe` didn't extend itself:

```ts
// previously false, now true
type("string | number").describe("a key").extends("string | number")
```

`.equals` still compares meta.

### Intersect optional keys by whether each side allows `undefined`

Intersecting a Type from a Scope configured with `exactOptionalPropertyTypes: false` with one that isn't could let an optional key allow `undefined` where the other Type rejects it. Unions and `.extends` were wrong the same way:

```ts
const loose = scope({}, { exactOptionalPropertyTypes: false })
const Loose = loose.type({ "a?": "string" })
const Exact = type({ "a?": "string" })

// previously { a?: string | undefined }, now { a?: string }
Loose.and(Exact)

// previously { a?: string }, now { a?: string | undefined }
Loose.or(Exact)

// previously true, now false
Loose.extends(Exact)
```

An optional key in an intersection allows `undefined` only where both sides do, and never where an index signature's value doesn't.

### Fix intersecting tuples with elements after a variadic element

Intersecting tuples where either has elements after a variadic element now allows exactly the arrays both allow. It could throw for a satisfiable intersection, allow arrays either side rejects, or drop the lengths where a prefix or optional element meets the other side's postfix:

```ts
const T = type(["number", "...", "number[]", "string"]).and([
	"number",
	"...",
	"string[]",
	"string"
])

// previously threw "Intersection at [0] of string and number", now [number, string]
T.expression

// previously [number, number], now [number, 1]
type(["number", "number"]).and(["...", "number[]", "1"]).expression

// previously [string], now ["a"]
type(["...", "number[]", "string"]).and(["...", "boolean[]", "'a'"]).expression
```

An unsatisfiable intersection now names only the elements that conflict at the lengths both tuples allow:

```ts
// previously ParseError listing [0], [1] and [2] as number and string
// now ParseError: Intersection at [2] of number and string results in an unsatisfiable type
type(["number", "number", "number"]).and(["...", "number[]", "'a'"])
```

### Fix deep transforms through a tuple default

`onDeepUndeclaredKey` and `configure` with `"references"` threw on a tuple with a default:

```ts
// previously threw "n._transform is not a function", now { d: [{ a: "ok" }, 2] }
type({ d: [{ a: "string" }, "number = 2"] }).onDeepUndeclaredKey("delete")({
	d: [{ a: "ok", b: "extra" }]
})
```

### Throw for an empty intersection with a cyclic Type

An intersection a definition writes with a Type still being defined is decided once it resolves, and now throws there if it's empty, as one with a resolved Type already did. Previously, including in 2.2.9 where the other side wasn't a primitive, it became `never`:

```ts
// previously b accepted only a number, now throws ParseError: Intersection of string and object results in an unsatisfiable type
scope({ a: { b: "string.trim & a | number" } }).export()
```

A required key whose value is disjoint from an index signature's once a Type it references resolves, like `b` in `{ b: "a", "[string]": "string" }` where `a` is an array, throws as it did in 2.2.9, where it was accepted and threw from the first validation reaching it.

### Throw a `ParseError` when `Exclude` or `Extract` filters a type still being defined

`Exclude` and `Extract` over a definition still being defined, like `"Extract<a | string, object>"` inside `a`, throw a `ParseError`:

```ts
// previously { n: string, c?: never }, now ParseError: Extract can't filter a type still being defined
scope({ a: { n: "string", "c?": "Extract<a | string, object>" } }).export()
```

`Exclude` threw `'a' is unresolvable` there.

### Throw a `ParseError` when a tuple expression narrows a morph

A tuple expression's `:` constrains the whole Type, so it can't follow a morph. Its types reject it with the same message, where they accepted it as a narrow of the morph's output:

```ts
// previously threw "TypeError: Cannot read properties of null (reading 'description')",
// now "ParseError: Predicate operand must be unknown (was a morph)"
type([["string", "=>", s => s.length], ":", n => n % 2 === 0])
```

### Describe a range's minimum first in every engine

Firefox described a range by its maximum first, since the order depended on how the engine sorts:

```ts
// previously "at most 0.1 and at least 0.000001" in Firefox, now "at least 0.000001 and at most 0.1" as in V8
type("0.000001 <= number <= 0.1").description
```

### Describe an `Hkt` generic by its class

A generic defined with an `Hkt` class and no `description` was described by the class's constructor, `Function`, rather than by the class:

```ts
const List = generic(["t", "string"])(
	args => args.t.array(),
	class ListOf extends Hkt {
		declare body: this[0][]
	}
)

// previously "a generic type for Function", now "a generic type for ListOf"
List.internal.description
```

### Print `this` for an anonymous cyclic Type's references

A Type that references itself through `this` printed each reference as a node id, which changed with whatever was defined first. It now prints `this` at the top of its own Type, and inside another Type, where `this` would mean the outer Type, a name derived from the Type's text. A deep transform like `onDeepUndeclaredKey`, which printed `synthetic<N>`, does the same. A thunk in such a definition is called twice:

```ts
const T = type({ v: "number", "next?": "this" })

// previously { v: number, next?: type1 }, now { v: number, next?: this }
T.expression
// previously { a: { v: number, next?: type1 } }, now { a: { v: number, next?: typegszdr00kec5od } }
type({ a: T }).expression
```

### Omit function meta from JSON Schema

JSON Schema can't represent a function, so a meta value like a custom `message` writer was copied as an internal reference whose name depended on what else was registered. It's now omitted:

```ts
// previously { type: "string", message: "$ark.message" }, now { type: "string" }
type("string")
	.configure({ message: () => "a letter" })
	.toJsonSchema({ dialect: null })
```

### Throw when merging an array

Like the `...` spread operator, `.merge`, `type.merge` and `Merge` extend an object, so an array, a tuple or an instance of another class like `Date` on either side now throws a `ParseError`. Previously, including in 2.2.7, merging an array gave an object, which accepted non-arrays, and for a tuple threw an internal error from `toJsonSchema()`:

```ts
// previously accepted { a: "x" }, now throws ParseError: merge operand must resolve to an object literal type (was object[])
type("object[]").merge({ a: "string" })
```

### Throw from every `export()` of a scope with an invalid alias

After a scope's `export()` threw a `ParseError`, a later `export()`, `export(...names)` or `import()` returned a module whose aliases from the failed one on were `undefined`. Each now throws the same error:

```ts
const $ = scope({
	even: ["number", ":", n => n % 2 === 0],
	a: { b: "even = 1" },
	c: { d: "even" }
})

$.export() // throws ParseError: Default for b must be valid according to an anonymous predicate (was 1)
// previously { even, a: undefined, c: undefined }, now throws the same ParseError
$.export()
```

### Reject an object inheriting `Date.prototype` without being a `Date`

`Date` and its bounds threw a `TypeError` validating an object like `Object.create(Date.prototype)`, since `Date.prototype`'s methods throw on it. They now reject it:

```ts
// previously threw "this is not a Date object", now "must be a Date (was an object)"
type("Date")(Object.create(Date.prototype))
```

### Fix index signatures whose key narrow reads `ctx`

A key an index signature rejects is undeclared, but an error its narrow added through `ctx` was kept, so valid data failed. It's no longer kept, and `"delete"` no longer throws on such a signature:

```ts
const K = type("string").narrow(
	(s, ctx) => s.startsWith("a") || ctx.mustBe("prefixed with a")
)

// previously failed with "must be prefixed with a", now { ab: 1, x: 2 }
type.Record(K, "number")({ ab: 1, x: 2 })
```

### Call an index signature's key narrow that reads `ctx` only while validating

Such a narrow was called on each declared key as its Type was parsed, outside any validation, so one reading `ctx.root` threw. It now decides whether its signature checks a declared key only while validating, as it does for other keys:

```ts
const types = scope({
	listed: [
		"string",
		":",
		(k, ctx) => (ctx.root as { listed: string[] }).listed.includes(k)
	],
	t: { listed: "string[]", a: "string | number", "[listed]": "string" }
}).export()

// previously parsing t threw a TypeError, now "a must be a string (was a number)"
types.t({ listed: ["a"], a: 1 })
```

### Check a prop against the other side's index signatures in an intersection

`.and` checks each prop against the other side's index signatures as an object literal checks its own, so a prop they exclude throws a `ParseError` where it's required, and becomes `never` where it's optional, dropping its default. Previously the intersection kept both, and a union of it threw that `ParseError` when first used:

```ts
// previously { [string]: number, a: string }, now ParseError: Intersection at a of string and number results in an unsatisfiable type
type({ a: "string" }).and({ "[string]": "number" })
```

A prop and an index signature that both transform a key transform it in turn, as they did in an intersection, now in an object literal or a union too, where they threw:

```ts
// previously ParseError: The intersection of distinct morphs at a single path is indeterminate
const T = type({ a: "string.trim", "[string]": "string.lower" })

// { a: "ab", b: " q " }
T({ a: " AB ", b: " Q " })
```

### Check data first when a narrow reads `ctx`

A Type without morphs that has a narrow taking `ctx` checks data before collecting errors, as other Types do, so valid data is accepted faster. Errors are collected by a second pass, so on invalid data its narrows can run twice, as they can in other Types:

```ts
const T = type({
	a: "string",
	b: type("string").narrow((s, ctx) => s.length < 3 || ctx.mustBe("short"))
})

// previously the narrow ran once, now twice
T({ a: "a", b: "long" })
```

### Run morphs where they're reached on failed calls

When validation fails, each morph whose input is valid runs as it's reached rather than after everything else is checked, so its errors are listed in traversal order and a morph reading `ctx.errors` sees only the errors before it:

```ts
const T = type({
	a: ["string", "=>", (s, ctx) => ctx.error("short")],
	b: "number"
})

// previously 'b must be a number (was a string)\na must be short (was "x")'
// now 'a must be short (was "x")\nb must be a number (was a string)'
T({ a: "x", b: "1" }).toString()
```

Function defaults, cyclic transforms and predicates beside morphs can run as they're reached on a failed call. Valid calls are unchanged.

### Fix validating and transforming cyclic data

A cyclic Type skipped every object an alias had already reached, even on another path or in a union branch that failed, so it accepted some invalid data (#1587), reported an object's errors once per path reaching it (#924) and, with `jitless`, wrote into input arrays and rejected valid data (#1367):

```ts
const types = scope({
	x: { v: "string", "self?": "x" },
	a: { x: "x", z: "string" },
	b: { x: "x", b: "string" },
	union: "a | b",
	node: { a: "node | number", "b?": "node" }
}).export()

// previously true, now false
types.union.allows({ x: { v: "a", self: { v: 1 } }, z: "z", b: "b" })

// previously valid, now b must be an object (was a number)
types.node({ a: 5, b: 5 }).toString()

const { nested } = scope(
	{ nested: "(nested | number)[]" },
	{ jitless: true }
).export()
const input = [[1], [2]]

// previously left input as [[1, 2], [2]], now leaves it as [[1], [2]]
nested(input)
```

A morph reached through a union branch that references the cyclic alias, like a `string.date.parse` key of `supervisor?: "User | null"` inside `User`, didn't run, so nested data stayed untransformed (#1486). It now runs at every depth.

A transforming cyclic Type transforms each path separately, like an acyclic Type, so an object reached by two paths gives two outputs:

```ts
const { tree } = scope({
	tree: { v: "string.numeric.parse", "left?": "tree", "right?": "tree" }
}).export()
const leaf = { v: "1" }
const out = tree.assert({ v: "0", left: leaf, right: leaf })

// previously true, now false
out.left === out.right
```

Past about 64 nested aliases, or about 1,000 aliases reached in one call, data is still transformed once per object, so a cycle in the data closes in the output. A morph returning a class instance from cyclic data now returns one whose cycle closes.

### Instantiate recursive generics

A generic that referenced itself overflowed the stack, and a generic argument referencing the definition it's in failed the generic's constraint (#1082, #1237):

```ts
// previously RangeError: Maximum call stack size exceeded
// now { v: string, next?: list<string> }
scope({
	"list<t>": { v: "t", "next?": "list<t>" },
	strings: "list<string>"
}).export().strings.expression

// previously ParseError: T must be assignable to object (was $node)
scope({ node: { n: "string", "kids?": "Partial<node>" } }).export()
```

A generic whose instantiations keep growing, like `"g<p>": { "n?": "g<g<p>>" }`, throws `ParseError: Instantiating g recursed with new arguments more than 100 times` where it overflowed the stack.

### Infer a `Record` referencing its own alias

A `Record` whose value referenced the alias it was in failed to type check, where writing the object as its own alias worked:

```ts
// previously TS2589: Type instantiation is excessively deep and possibly infinite
scope({
	json: "string | number | boolean | null | json[] | Record<string, json>"
}).export()
```

### Equate cyclic types of the same shape

Cyclic types were equal only if they referenced the same definitions, so two of the same shape from different aliases weren't equal, and `.extends` and unions related them only by reference (#928). They're now compared by structure:

```ts
const types = scope({
	user: { friends: "user[]", name: "string" },
	peer: { friends: "peer[]", name: "string" },
	list: { v: "number", "next?": "list" },
	listPos: { v: "number > 0", "next?": "listPos" }
}).export()

// previously false, now true
types.user.equals(types.peer)

// previously { v: number, next?: $list } | { v: number > 0, next?: $listPos }
// now { v: number, next?: $list }
types.list.or(types.listPos).expression
```

### Tell apart same-named aliases from different scopes

An alias was identified by its name alone, so cyclic types from two scopes reusing a name were equal and shared their intersections, and a cyclic type's `json` didn't parse back (#930):

```ts
const s1 = scope({
	a: { v: "string", "next?": "a" },
	box: { "inner?": "a" }
}).export()
const s2 = scope({
	a: { v: "number", "next?": "a" },
	box: { "inner?": "a" }
}).export()

// previously true, now false
s1.box.equals(s2.box)

const { node } = scope({
	node: { v: "number", "next?": "node | null" }
}).export()

// previously ParseError: 'node' is unresolvable, now true
type.schema(node.json).equals(node)
```

A cyclic alias's `json` names its resolution as registered, like `"$ark.tree2"`, where it was `"$tree"`. A cyclic Type's `expression` and `description` print another alias of its cycle by name rather than expanding it:

```ts
const { a } = scope({ a: { b: "b" }, b: { "a?": "a" } }).export()

// previously { b: { a?: $a } }, now { b: $b }
a.expression
```

### Read `.in` and `.out` through cyclic aliases

`.in`, `.out` and deep config like `onDeepUndeclaredKey` stopped at a cyclic alias, so `.out` checked what the alias reached as input, and `onDeepUndeclaredKey("reject")` didn't reject a key past it (#944):

```ts
const { node } = scope({
	node: { n: "string.numeric.parse", "next?": "node" }
}).export()

// previously ArkErrors: next.n must be a string (was a number)
// now { n: 1, next: { n: 2 } }
node.out({ n: 1, next: { n: 2 } })
```

### Discriminate cyclic unions

A union branch that was an alias to a cyclic type kept the union from being discriminated, so data failing one branch was reported against every branch (#1026, #1630):

```ts
const api = scope({
	Field: { type: "'field'", value: "string >= 1" },
	Group: { type: "'group'", parts: "Part[]" },
	Part: "Field | Group"
}).export()

// previously parts must be an array (was missing) or value must be non-empty
// now value must be non-empty
api.Part({ type: "field", value: "" }).toString()
```

### Export mutually recursive aliases whose branches intersect

Cyclic aliases whose union branches intersect each other's objects overflowed the stack or ran out of memory as their scope was exported (#1476):

```ts
// previously RangeError: Maximum call stack size exceeded
scope({
	leaf: { kind: "'leaf'" },
	tt: { kind: "'and'", left: "t", right: "t" },
	tf: { kind: "'and'", left: "t", right: "f" },
	ff: { kind: "'and'", left: "f", right: "f" },
	ft: { kind: "'and'", left: "f", right: "t" },
	t: "leaf | tt | tf",
	f: "leaf | ff | ft"
}).export()
```

### Parse more cyclic scopes

Some cyclic scopes threw as they were exported or first used:

```ts
// previously RangeError: Maximum call stack size exceeded, now { a?: $a }
scope({ a: () => ({ "a?": "a" }) }).export().a.expression

// previously RangeError: Maximum call stack size exceeded
scope({
	node: { id: "string", "parent?": "tree<node>" },
	"tree<t extends node>": { value: "t", children: "tree<t>[]" }
}).export()

// previously ParseError: t must be assignable to { n?: $base } (was { x: string, n?: $derived })
scope({
	"g<t extends base>": { v: "t" },
	base: { "n?": "base" },
	derived: { "n?": "derived", x: "string" },
	use: "g<derived>"
}).export()

// previously ParseError: An unordered union of a type including a morph and a type with overlapping input is indeterminate
scope({
	D: { p0: "boolean" },
	E: { x: "string.numeric.parse", "p0?": "E" },
	C: "E | D"
}).export()

// previously a TypeError, now { v: 1, n: null }
scope({ a: { v: "number", n: "a | null = null" } })
	.export()
	.a({ v: 1 })
```

### Infer generics through nested scopes' exports

A generic exported through further scopes, or instantiated with an alias of the scope referencing it, inferred `never` for references in its body (#1437, #1457):

```ts
const $1 = scope({ "#private": "string", "generic<t>": "private" })
const $3 = scope({ ...scope({ ...$1.export() }).export() })
const Thing = $3.type("generic<string>")

// previously never, now string
type In = typeof Thing.inferIn
```

### Keep a Type's descriptions wherever it's referenced

A Type keeps the `description` writers of the scope that defined it wherever it's referenced or imported, and a name a scope resolves, such as a keyword, uses that scope's writers all the way down, whether compiled or `jitless`:

```ts
const custom = { domain: { description: () => "a custom number" } }
const lib = scope({ x: "number" }, custom).export()
const types = scope(
	{ ref: type("number"), int: "number.integer" },
	custom
).export()

// previously "must be a custom number (was a string)", now "must be a number (was a string)"
types.ref("x").toString()
// previously "must be a number (was a string)", now "must be a custom number (was a string)"
types.int("x").toString()
// previously "a must be a number (was a string)", now "a must be a custom number (was a string)"
type({ a: lib.x })({ a: "x" }).toString()
```

A cyclic keyword like `object.json` keeps arktype's writers.

### Name keyword morphs and predicates

Keywords' morphs and predicates are named functions exported from `arktype/internal`, so `.json` names each by what it does, where every keyword morph was named `morphs`, with a `$N` counter after the first one used:

```ts
// previously ["$ark.morphs"], now ["$ark.trimString"]
type("string.trim").json.morphs
```

### Fix global config when the first Type is created

Global config is read when the first Type is created rather than when arktype is imported, so `configure()` must run before any Type is created, but can follow any import of `arktype` or `@ark/schema`, including `./internal/*` deep imports. A `configure` imported from `"arktype"` now applies to `type` and keywords too. A `configure` call after a Type has been created throws instead of applying to scopes created later but not to `type` or keywords, unless it changes nothing, as when a test runner resets its modules and the config file runs again:

```ts
import { configure, type } from "arktype"

configure({ numberAllowsNaN: true })
// previously false, now true
type.number.allows(Number.NaN)

// previously ignored by type, now throws: configure() must be called before any Type is created, so import the module calling it before any module that creates one
configure({ onUndeclaredKey: "delete" })
```

### Tell apart values that serialized alike

A type returned another type defined earlier whose value serialized the same way, such as `NaN` and `"NaN"`, `5n` and `"5n"`, `undefined` and `"undefined"`, a Date and its ISO string, a symbol and its registry name, or default values `-0` and `0`. `meta.examples` and cached defaults confused `NaN` with `null` and `5` with `"5"`:

```ts
type.unit(NaN)

// previously false, now true
type("'NaN'").allows("NaN")
```

In `json`, such a string is now quoted, e.g. `{ unit: "\"NaN\"" }`. A unit of `-0` is now a unit of `0`, which it equals, and `examples: [5n]` no longer throws.

### Print object units without calling their code

An object unit's `expression`, description and errors list its own enumerable data properties, without calling its `toJSON`, getters or other methods, so defining a type or failing to match it no longer runs them:

```ts
const o = {
	a: 1,
	get b() {
		return 2
	},
	toJSON: () => "custom"
}

// previously "custom", now {"a":1,"b":"(getter)","toJSON":"Function(toJSON)"}
type.unit(o).expression
```

### Print functions and symbols by their own names

Messages, `expression` and ParseErrors print a function or symbol by its name alone, without the `$ark.` prefix or a count of earlier values with the same name, and union branches are ordered by those names:

```ts
const tag = Symbol("tag")

// previously "must be Symbol(tag2) (was 5)" if other symbols described as tag were named first
// now "must be Symbol(tag) (was 5)"
type.unit(tag)(5).toString()

// previously { $ark.tag: string }, now { Symbol(tag): string }
type({ [tag]: "string" }).expression
```

`json` still names each value uniquely, now counting repeated names as `tag$1` rather than `tag1`. Two symbol keys described alike print alike, so `byPath`, `flatByPath` and `flatProblemsByPath` keep only the last error of the two.

### Reject `Infinity` from `number`

`number` rejects `Infinity` and `-Infinity` by default, as it already rejects `NaN` (#1598):

```ts
// previously Infinity, now ArkErrors: must be a number (was Infinity)
type.number(Infinity)
```

Allow them everywhere with `configure({ numberAllowsInfinity: true })`, or in one type with the `number.Infinity` and `number.NegativeInfinity` keywords:

```ts
const T = type("number | number.Infinity | number.NegativeInfinity")
```

A type whose range already excluded an infinite value, like `number.safe`, now reports `must be a number (was Infinity)` instead of its range error.

So their output stays a `number`, `string.numeric.parse` rejects a string too large for a finite number, like `"1e400"`, with `must be finite (was "1e400")`, and `string.json.parse` rejects JSON holding one. Either parses it to `Infinity` where `numberAllowsInfinity` is configured. `string.json.parse`'s output is any JSON value, where it was declared an object or array though `"5"` parsed to `5`.

### Remove the `clone` option

Transforming no longer clones the input first, and writes to it only to transform a builtin like a Date, Map or function, which is transformed in place. Any other transformed object is a new object sharing every untransformed value with the input, and input that nothing transforms is returned as is:

```ts
const T = type({ a: "string.trim", b: { c: "string" } })
const input = { a: " x ", b: { c: "y" } }

// previously false, now true
T(input).b === input.b
```

A morph receives the validated value itself, so a morph that mutates its argument mutates the caller's data. A `Date` subclass, like `@date-fns/utc`'s `UTCDate`, reaches a morph intact, where the copy it was given had lost its date, so a call like `toISOString()` threw (#1568). Remove `clone` from your config.

Deleting undeclared keys no longer needs a traversal context, so `onDeepUndeclaredKey("delete")` transforms valid data as directly as a shallow `"+": "delete"` does (#1380).

### Drop `filename` from the global registry

`$ark.filename`, the file arktype's registry was created in, is gone. `$ark.version` still names the `@ark/util` version that created the registry.

### Annotate what JSON Schema can't express

Pass `annotatingFallback` as `toJsonSchema()`'s `fallback` to write each constraint JSON Schema can't express as an `x-arktype-*` keyword instead of throwing:

```ts
import { annotatingFallback, type } from "arktype"

// { $schema: "...", "x-arktype-domain": "bigint" }
type("bigint").toJsonSchema({ fallback: annotatingFallback })
```

A function, class or symbol is written as its `$ark` name, as in the type's `.json`. Validators ignore those keywords, so the schema accepts values the type rejects.

A `symbolKey` fallback's result for a symbol-keyed property is now used instead of discarded.

`arktype` exports the `ToJsonSchema` type, so a fallback declared outside the call can be typed as `ToJsonSchema.FallbackOption`.

### Fall back for regex flags and constrained keys in JSON Schema

JSON Schema's `pattern` has no flags, so `toJsonSchema()` wrote `/^a/i` as `"^a"`, which rejects `"A"`. A flag that changes what a pattern matches now goes to the new `patternFlags` fallback. `d` and `g` are ignored, as is `u` for draft-2020-12, whose patterns are built with it.

An index signature whose key is constrained beyond one pattern, like `[string <= 3]`, was left out. It now goes to the new `indexKey` fallback, or, if undeclared keys are rejected or deleted and every declared key matches it, is written with `propertyNames`:

```ts
// { type: "object", propertyNames: { type: "string", maxLength: 3 }, additionalProperties: { type: "number" } }
type({ "[string <= 3]": "number", "+": "reject" }).toJsonSchema()
```

`~standard.jsonSchema` leaves out either one, along with an `additionalProperties: false` that would reject keys the index allows.

### Reject shallow cycles

An alias that resolved to itself without passing through an object, array or morph accepted every value. It now throws a ParseError and is a type error (#579):

```ts
// previously accepted every value, now throws: Alias 'a' has a shallow resolution cycle: a->a
scope({ a: "a" }).export()
```

### Describe dates in UTC

Dates in descriptions and error messages are written in UTC instead of local time, except that a date at UTC midnight is written as its calendar date, like `January 1, 2000`. One at local midnight on January 1 was written as its year, so `Date <= d'2020-01-01'` reported `must be 2020 or earlier (was June 1, 2020)`, and now that it's at UTC midnight, the day is kept:

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

### Throw from `.assert` when a root morph fails

When a type's root was a morph (or a union of morphs) that returned `ArkErrors`, `.assert` returned the errors instead of throwing, and a configured `onFail` was not called. A root morph's errors are now handled like any others, as they already were for a morph at a key:

```ts
const N = type("number")
const T = type("string").pipe(s => N(s))

// previously returned ArkErrors, now throws TraversalError: must be a number (was a string)
T.assert("x")
```

### Return a type's output when it is called with `ctx` in a morph

Calling a type's `internal` node with the morph's `ctx` returned the morph's own input rather than the type's output, and threw if the type transformed its input. A Type's own signature takes only data, so call its node to pass `ctx`:

```ts
const T = type("string").pipe((s, ctx) =>
	type({ a: "string.trim" }).internal(JSON.parse(s), ctx)
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
// now a (an object) must be... ◦ p ◦ q
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

### Flatten an intersection a morph returns into the errors at its path

A morph returning errors that held an intersection at a path where the traversal already had an error nested that intersection inside the new one, garbling its text, and `flatByPath` and `flatProblemsByPath` held the nested intersection:

```ts
const Inner = type({ s: "(string >= 5) & /^a/" })
const T = type({ s: "string" }).pipe((o, ctx) => {
	ctx.error({ expected: "own", path: ["s"] })
	return Inner(o)
})

// previously ({"s":"b"}) must be... ◦ own ◦ ◦ matched by ^a ◦ at least length 5
// now s (an object) must be... ◦ own ◦ matched by ^a ◦ at least length 5
T({ s: "b" }).toString()
```

### Handle only string keys as undeclared

`"+": "reject"` checks only an object's string keys, and `"+": "delete"` outputs only its declared keys. So an undeclared symbol key passes `"reject"`, where it failed, and is dropped by `"delete"`, which kept it:

```ts
const s = Symbol("s")

// valid, instead of ArkErrors: value at [Symbol(s)] must be removed
type({ "+": "reject", a: "string" })({ a: "x", [s]: 1 })

// { a: "x" }, instead of { a: "x", [s]: 1 }
type({ "+": "delete", a: "string" })({ a: "x", [s]: 1 })
```

Looking for symbol keys read each object's symbols, which cost about four times the rest of a strict object's check.

Reject types that differ only by a symbol key now overlap, so a union of them with a morph is indeterminate:

```ts
const s = Symbol("s")

// throws: An unordered union ... is indeterminate
type({ "+": "reject", a: "string.trim" }).or({
	"+": "reject",
	a: "string",
	[s]: "1"
})
```

### Return deleting types' keys in the order they're declared

`"+": "delete"` builds its output with the declared keys in the order the definition declares them, as Zod does, followed by keys matching an index signature in input order. It previously deleted from a copy of the input, which kept the input's order, and prerelease builds of this version sorted them. Data is usually serialized from the shape its Type declares, so the output usually lists keys as its input did. The output is always a new object, even when nothing was deleted, while an array is returned as is unless it has an undeclared key to remove:

```ts
const T = type({ "+": "delete", b: "string", a: "string", "c?": "number" })

// previously { a: "1", c: 1, b: "2" }, now { b: "2", a: "1", c: 1 }
T({ a: "1", z: 0, c: 1, b: "2" })
```

A spread, `.merge()` or `.and()` lists the left object's keys, then the right's new ones, as `{ ...left, ...right }` would, and `.pick()`, `.omit()`, `.partial()` and `.required()` keep their source's order. Defaults missing from data are added in the order they're declared, after the input's keys where undeclared keys are kept. A Type's `expression`, `json` and JSON Schema still list keys required first, then optional, each sorted, and Types that declare the same keys in different orders are still equal, though no longer the same object.

### Report an object's errors in the order its keys are declared

An object's keys are checked in the order its definition declares them, so its errors are too, where they were found required keys first, then optional ones, each sorted. The first of them is the one a reader looking down the definition would expect, and `firstIssue` stops there. Morphs on its values run in that order as well:

```ts
const User = type({ name: "string", age: "number", "nick?": "string" })

// previously "age must be a number (was missing)" first
firstIssue(User({ nick: 0 })).message // "name must be a string (was missing)"
```

Declared keys are still checked before an index signature's and undeclared keys, which follow the data's order. The order composes as the order of an output's keys does, so an intersection is checked left operand's keys first.

### Treat integer keys past an array's greatest index as undeclared

An array's length is at most 4294967295, so an integer key from 4294967295 up is one of its named properties rather than an index. `"+": "reject"` now rejects such a key and `"+": "delete"` deletes it, as they do any other undeclared key, where every integer string was declared before:

```ts
const T = type("string[]").onUndeclaredKey("reject")

// previously valid, now ArkErrors: value at ["4294967295"] must be removed
T(Object.assign(["a"], { 4294967295: "b" }))
```

### Import internals from `arktype/internal`

`arktype/internal` exports the names of every arktype module, and `@ark/schema`, `@ark/util`, `arkregex` and `arksets` each have an `./internal` entry like it. A deep import like `arktype/internal/parser/string.ts` keeps its module's types and loads that entry at runtime.

### Resolve names that match `Object.prototype` members

Aliases, generic parameters, keyword lookups and `FormData` fields named like an `Object.prototype` member (e.g. `toString`, `constructor`, `valueOf`) no longer resolve to the inherited member (#1121):

```ts
// previously threw: #toString duplicates public alias toString
scope({ toString: "string" }).export()

// previously threw an internal TypeError, now 'toString' is unresolvable
type("toString")
```

### Skip the CSP probe when `jitless` is configured

Configuring `jitless` before the first Type is created, even after importing arktype, no longer runs the `new Function` check for JIT support, so a page with a strict Content-Security-Policy no longer logs an eval violation (#1473).

### Emit `enum` for a configured union of literals

A union of literals with meta of its own, like a `title` or a description, was written as an `anyOf` of `const`s, each repeating the meta (#1470):

```ts
// previously { anyOf: [{ const: "a", title: "Letter" }, { const: "b", title: "Letter" }], title: "Letter" }
// now { type: "string", enum: ["a", "b"], title: "Letter" }
type("'a' | 'b'").configure({ title: "Letter" }).toJsonSchema()
```

### Import in runtimes without web platform globals

Importing arktype no longer throws in runtimes that lack `Blob`, `URL`, `FormData`, `Headers`, `Request` or `Response`, such as WeChat mini programs, AudioWorklets or an embedded V8 or QuickJS (#1555). A keyword whose global is missing throws when used, e.g. `'Blob' is unresolvable`.

### Infer platform keywords whose globals are declared as classes

With declarations like `@cloudflare/workers-types`, which declare `Blob`, `File`, `Headers` and `URL` as classes, those keywords infer their instance types instead of `never` (#1548).

### Infer `ArkEnv.meta` from a scope that imports Types

Augmenting `ArkEnv.meta` with a type inferred from a scope that spreads another scope's `import()` was circular, so the type was `any` (#1644):

```ts
const base = scope({ BaseMeta: { "description?": "string" } })

const Meta = scope({
	...base.import(),
	Binary: { "...": "BaseMeta", kind: "'binary'" }
}).export().Binary

declare global {
	interface ArkEnv {
		// was: Return type annotation circularly references itself
		meta(): typeof Meta.infer
	}
}
```

### Default an alias described or configured inline in a scope

A scope alias defined with `.describe()` or `.configure()` in the scope itself inferred as `unknown`, so a string default referencing it was a type error (#1510):

```ts
const $ = scope({
	version: type.string.describe("a version"),
	// was: Default value 'v0' must be assignable to version
	release: { version: "version = 'v0'" }
})
```

Their signatures are no longer generic, which is what TypeScript deferred. They accept the same selectors, and a `where` predicate's parameter is still the kind its selector names. `where` is now among the keys a selector object completes.

### Throw a scope alias's parse error on every reference

After an alias failed to parse, later references to it returned a type that crashed when validating, or reported a false cycle. Each reference now throws the original error.

### Export the types that inferred types reference

`arktype` exports `Brand`, `Json`, `GenericAst`, `ArkErrorCode` and `Regex` as types (#1577). Under pnpm, exporting a type that references one of them (a brand, `string.json.parse`, a scope with a generic, a `regex()` value or `byPath(errors)`) failed declaration emit with TS2883, since the packages they lived in usually can't be resolved from your project:

```ts
// previously TS2883: The inferred type of 'Gid' cannot be named without a reference to '.pnpm/@ark+util@.../node_modules/@ark/util'
// now emits import("arktype").Brand<string, "GID">
export const Gid = type("string#GID")
```

### Write length bounds and protos alongside a structure

An expression or description with props or an array element dropped the length bounds and the proto beside it, so distinct types printed the same (#1430):

```ts
// previously number[], now number[] >= 2
type("number[] > 1").expression

// previously { foo: string }, now { foo: string } & Date
type("Date").and({ foo: "string" }).expression

// previously string >= 2[], now (string >= 2)[]
type("(string > 1)[]").expression
```

### Parse an invoked builtin generic in the invoking scope

A type created by calling a builtin generic directly, like `type.Record(...)`, belonged to an internal schema scope, so methods that take a definition (`.to`, `.or`, `.and`, ...) parsed it as a schema (#1600):

```ts
// previously threw ParseError: instanceOf operand must be a function (was undefined)
type
	.Record("string", "boolean")
	.pipe(o => Object.keys(o))
	.to("string[]")
```

It now belongs to the scope it was invoked from and follows its config, so `$.type.Record(...)` invoked from a `jitless` scope is no longer compiled, and the scope's `onFail` applies to it.

### Release functions passed to `narrow`, `pipe`, `match` and defaults

A type built from a new function, such as one created per request, kept that function and everything it captured in memory forever (#1676). Such functions are now released along with the type, and so is a `scope()` whose aliases are never resolved:

```ts
const handleRequest = (request: { id: number }) =>
	type({ id: "number" }).narrow(v => v.id === request.id)

// previously each call kept its request in memory, now it can be garbage collected
handleRequest({ id: 1 })
```

A function stays in memory while a cyclic Type, a generic instantiation (always, for builtins like `type.Record`) or the first Type compiling a default's keyword holds it.

The `$ark.x` names that functions get in a type's `json` or `expression` are unique names only and no longer resolve through `$ark`. `ctx.meta` in a compiled union or undeclared-key error is the type's own meta, as in jitless mode, so a value like `NaN` is no longer stringified. In `@ark/schema`, `BaseNode.compiledMeta` is removed, and `BaseScope.res` (before: `resolutions`) holds an unresolved alias's parse context instead of its id.

### Define a matcher whose cases a reordering would separate

A matcher whose cases get grouped out of order, like tuples discriminated by an element, threw at definition even though no input could reach two of the cases (#1445):

```ts
const Dir = type({ "[string]": "unknown" })

// previously ParseError: The intersection of distinct morphs at a single path is indeterminate
match
	.case(["string", Dir], () => -1)
	.case([Dir, "string"], () => 1)
	.case(["string", "string"], ([a, b]) => a.localeCompare(b))
	.default(() => 0)
```

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

`.required()` and the `Required` generic made a defaulted key required at runtime, but its inferred type kept the default, so `inferIn` still treated the key as optional (#1160). This also applied to defaulted morphs and tuple elements:

```ts
const T = type({ foo: "string = 'bar'" }).required()

// previously { foo?: string }, now { foo: string }
type In = typeof T.inferIn
```

### Infer the output of morphs that return `any`

A morph whose output was `any`, or a function returning `any`, was left in the inferred type as the morph itself (#1023):

```ts
const T = type({ a: ["string", "=>", s => JSON.parse(s)] })

// previously { a: (In: string) => Out<any> }, now { a: any }
type Out = typeof T.infer
```

Inferred types that contain no morphs, defaults or brands still keep their names, like interfaces passed to `.as`.

### Name the narrow in an unsatisfiable intersection error

When a narrow rejected every branch of a union it was intersected with, the error described the narrow by its expression, which omits predicates:

```ts
const isC = (s: string) => s === "c"

// previously ParseError: Intersection of "a" | "b" and unknown results in an unsatisfiable type
// now ParseError: Intersection of "a" | "b" and isC results in an unsatisfiable type
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

### Name JSON Schema `$defs` by their alias

`$defs` keys and `$ref`s were node ids, whose numbers depend on every type defined before, so the same type's JSON Schema changed with unrelated code, and a cyclic type wrote each of its objects, arrays and unions as a def of its own. Now a def is written only for a cyclic alias, named exactly by its alias, and everything else is inline:

```ts
const { user } = scope({
	user: { name: "string", "friends?": "user[]" }
}).export()

// previously e.g. { $ref: "#/$defs/user3", $defs: { user3: ..., intersection41: ... } }
// now
// {
// 	$schema: "https://json-schema.org/draft/2020-12/schema",
// 	$ref: "#/$defs/user",
// 	$defs: {
// 		user: {
// 			type: "object",
// 			properties: {
// 				name: { type: "string" },
// 				friends: { type: "array", items: { $ref: "#/$defs/user" } }
// 			},
// 			required: ["name"]
// 		}
// 	}
// }
user.toJsonSchema()
```

- An alias that isn't cyclic is inline, as its type is the same node as an equal anonymous one.
- A generic's instantiations are named by the generic (`box` for `box<string>`), and a submodule's alias by its own name (`b` for `a.b`).
- A name another def already has is numbered from 2 (`user2`), in the order the defs are reached.
- A cycle with no alias, like a `this` reference, is named by what arktype calls it (`type`).
- `.in`, `.out`, `~standard.jsonSchema` and the `definitions` and `#/components/schemas/` of `"draft-07"` and `"openapi-3.0"` use the same names.
- `useRefs` writes every other part as a def named by its kind (`intersection`, `intersection2`), and no longer writes an empty `$defs` for a type with none.

### Write `type` beside a literal's `const` or `enum`

A literal's JSON Schema now names its type, as zod's does and as consumers like MCP elicitation require. A union of literals that share no type is still an `enum` alone, and one with `null` writes `null` beside the rest, as `string | null` is written:

```ts
const T = type({ k: "'b' | 'a'", l: "1 | 2", m: "'x'", n: "'a' | 'b' | null" })

// previously k: { enum: ["a", "b"] }, l: { enum: [1, 2] }, m: { const: "x" },
// n: { anyOf: [{ const: "a" }, { const: "b" }, { type: "null" }] }
// now
// k: { type: "string", enum: ["a", "b"] }
// l: { type: "number", enum: [1, 2] }
// m: { type: "string", const: "x" }
// n: { anyOf: [{ type: "string", enum: ["a", "b"] }, { type: "null" }] }
T.toJsonSchema()
```

A number literal's type is `number`, even for integers, since its `enum` or `const` already says which values it allows.

### Leave a Standard Schema issue's path out of its message

A Standard Schema consumer, like a form library or the MCP SDK, prints each issue's `path` before its `message`, which already began with it:

```ts
const T = type({ entities: "string[]" })

const result = T["~standard"].validate({})

// previously "entities must be an array (was missing)", now "must be an array (was missing)"
result.issues[0].message
// ["entities"], as before
result.issues[0].path
```

An issue at a path is a copy of its error with that message. A union's lists each branch's path from the union's, like `b must be a string (was missing) or c must be a number (was missing)`. `validate` returns `{ issues }` rather than the `ArkErrors`, whose own errors and `summary` still start with their paths. A precompiled validator's issues are written the same way, unless their message was configured.

### Throw for a global-only option passed to a Scope

`onUndeclaredKey`, `numberAllowsNaN`, `numberAllowsInfinity`, `dateAllowsInvalid`, `keywords` and `locale` can only be configured with `configure()`, and a Scope's type already rejected them, but a JavaScript or cast config passing one to a Scope was honored for `onUndeclaredKey` and silently ignored for the rest. Each now throws:

```ts
// previously validated Infinity as a number anyway, now throws
// ParseError: numberAllowsInfinity can only be configured globally, with configure()
scope({}, { numberAllowsInfinity: true } as never)
```

### Write `properties: {}` for an object declaring no keys

An object Type with no props or index signature, like `type({})`, `type("object")` or `type({ "+": "reject" })`, is written with an empty `properties`, as Zod writes `z.object({})`, since consumers like MCP clients read a tool's input schema's `properties`:

```ts
// previously { type: "object" }, now { type: "object", properties: {} }
type({}).toJsonSchema()
```

### Write an optional key's `undefined` as its absence in JSON Schema

JSON has no `undefined`, so an optional key whose value allows it threw from `toJsonSchema()`, and `~standard.jsonSchema` wrote its value as `{}`, allowing anything. An optional key can already be absent, so its JSON Schema leaves `undefined` out:

```ts
// previously threw Can't convert "unit" at a to JSON Schema, now
// { type: "object", properties: { a: { type: "string" } } }
type({ "a?": "string | undefined" }).toJsonSchema()
```

A required key whose value allows `undefined` still needs `fallback.unit`.

### Write a nested arktype Standard Schema's errors without repeating their key

When a definition embeds a validator only through its `~standard` property, an error from an arktype validator inside it repeated the key its message already started with:

```ts
const User = type({ age: "number.integer" })
const T = type({ user: { "~standard": User["~standard"] } })

// previously user.age age must be an integer (was 1.5)
// now user.age must be an integer (was 1.5)
T({ user: { age: 1.5 } })
```

### Stop at the first failed narrow with `jitless`

With `jitless` or in a CSP environment, a Type with chained narrows ran each narrow after the first that failed, on data that narrow had already rejected, and reported every failure. It now stops at the first, as compiled types already did:

```ts
const T = scope({}, { jitless: true })
	.type("number")
	.narrow((n, ctx) => n % 2 === 0 || ctx.reject("divisible by 2"))
	.narrow((n, ctx) => n % 3 === 0 || ctx.reject("divisible by 3"))

// previously "(1) must be...\n  ◦ divisible by 2\n  ◦ divisible by 3", now "must be divisible by 2 (was 1)"
T(1).toString()
```

### Discriminate unions with `jitless`

With `jitless` or in a CSP environment, a discriminated union checked every branch and reported each one's errors, where a compiled type reports only the matching branch's, and a cyclic union could reject valid data (#961, #1547, #1640):

```ts
const $ = scope({}, { jitless: true })
const T = $.type({ kind: "'a'", a: "string" }).or({ kind: "'b'", b: "number" })

// previously a must be a string (was a number) or b must be a number (was missing)
// now a must be a string (was a number)
T({ kind: "a", a: 1 }).toString()
```

### Match a Date in a union of literals

A union of literals holding a Date was discriminated by the Date's ISO string, so at a key it rejected an equal Date and accepted the string:

```ts
const T = type({ a: type.enumerated(new Date(0), 1, 2) })

// previously [false, true], now [true, false]
;[T.allows({ a: new Date(0) }), T.allows({ a: new Date(0).toISOString() })]
```

### Check `g` and `y` patterns from the start of the string every time

With `jitless` or in a CSP environment, a pattern with the `g` or `y` flag kept its `lastIndex` between checks, so the same input alternated between valid and invalid. Every check now starts from the beginning of the string, as compiled types already did:

```ts
const T = scope({}, { jitless: true }).type(/a/g)

// previously [true, false], now [true, true]
;[T.allows("a"), T.allows("a")]
```

### Run description writers when a type is defined with `jitless`

A configured `description` writer for a domain, unit, proto or constraint ran when a compiled type was defined, but with `jitless` or in a CSP environment only on the first error that read it. It now runs when the node is created, in both modes:

```ts
let lang = "en"
const T = scope(
	{},
	{ jitless: true, domain: { description: node => `${lang}:${node.domain}` } }
).type({ a: "string" })
lang = "de"

// previously "a must be de:string (was a number)", now "a must be en:string (was a number)"
T({ a: 5 }).toString()
```

### Check defaults without calling `onFail`

A default was checked by calling its type, which applied a configured `onFail`. If `onFail` threw, an invalid default threw its TraversalError instead of a ParseError, and if it returned, the invalid default was accepted:

```ts
const $ = scope({}, { onFail: () => 0 })

// previously accepted the default, now ParseError: Default for a must be a number (was a string)
$.type({ a: ["number", "=", "5"] })
```

### Call a default function only when the default is applied

A function default was called once while its type was defined, to check its result, and later results were not checked unless the value transformed. It is now called each time the default is applied, and its result is validated like input at that key:

```ts
const T = type({ count: ["number", "=", () => readCount()] })

// previously called readCount once when T was defined, now only when T({}) applies the default
// previously { count: "3" } if readCount() returned "3", now ArkErrors: count must be a number (was a string)
T({})
```

### Run a morph on a primitive default each time the default is applied

A primitive default whose type had a morph was morphed once, when the type was defined, and every omitted key got that output. The morph now runs each time the default is applied, as it already did for a default that morphed to an object, so an omitted key behaves like the default passed explicitly:

```ts
const T = type({ at: [type("number").pipe(n => n || Date.now()), "=", 0] })

// previously the time T was defined, now the time of each call
T({}).at
```

A morph that fails on the default returns its errors from validation instead of throwing a TraversalError when the type is defined. The default is still checked against the morph's input when defined.

### Accept a function as a Standard Schema

A function definition was called as a thunk, so a Standard Schema that's a class, like the one Effect's `Schema.standardSchemaV1` returns, threw when it was parsed:

```ts
// previously TypeError: Class constructor StandardSchemaV1Class cannot be invoked without 'new'
type({ age: Schema.standardSchemaV1(Schema.Number) })
```

### Infer `.merge()` of a definition holding a described Type

A definition passed to `.merge()` that called a method like `.describe()` or `.configure()` inline failed to type check:

```ts
// previously: Argument of type '{ "b?": Type<string, {}>; }' is not assignable to parameter of type 'never'
type({ a: "string" })
	.partial()
	.merge({ "b?": type("string").describe("an ID") })
```

### Fail an embedded Standard Schema's empty `issues`

A Standard Schema result with `issues` is a failure, but one whose `issues` was empty passed, with `undefined` as its output. It now fails with `is invalid`:

```ts
const T = type({
	a: {
		"~standard": { version: 1, vendor: "x", validate: () => ({ issues: [] }) }
	}
})

// previously { a: undefined }, now ArkErrors: a is invalid
T({ a: 1 })
```

### Throw when an embedded Standard Schema validates asynchronously

A Standard Schema whose `validate` returned a Promise, like a Zod schema with an async refinement, gave `undefined` for any input. ArkType validates synchronously, so it now throws:

```ts
const T = type({ name: z.string().refine(async s => s.length > 1) })

// previously { name: undefined }
// now throws: Standard Schema definitions must validate synchronously (zod returned a Promise)
T({ name: "x" })
```

### Keep the path of an embedded Standard Schema's issues

An issue with an empty or missing path, as for any non-object Zod or Valibot schema, lost the path it was found at:

```ts
const T = type({ age: z.number() })

// previously "Invalid input: expected number, received string"
// now "age invalid input: expected number, received string"
T({ age: "x" }).toString()
```

### Accept multi-line strings in `string.trim.preformatted`

`string.trim.preformatted` rejected any string with a line break, so a multi-line string `string.trim` had trimmed failed to encode:

```ts
const T = type({ bio: "string.trim" })

// was: ArkErrors: bio must be trimmed (was "a\nb")
// now: { bio: "a\nb" }
T.encode(T.assert({ bio: " a\nb " }))
```

### Accept what `string.lower`, `string.upper` and `string.capitalize` output

Their `.preformatted` keywords, which are also their outputs, accepted only ASCII letters, so most strings the morphs returned failed to encode. `string.lower.preformatted` now accepts any string without an uppercase ASCII letter, `string.upper.preformatted` any string without a lowercase one, and `string.capitalize.preformatted` the empty string and any string not starting with a lowercase one:

```ts
const T = type({ tag: "string.lower" })

// was: ArkErrors: tag must be only lowercase letters (was "foo bar")
// now: { tag: "foo bar" }
T.encode(T.assert({ tag: "Foo Bar" }))
```

Their descriptions are now "lowercase" and "uppercase".

### Make `.strings` on a matcher stable

`.strings` on a matcher with an input, from `.in(...)` or `.at(key)`, matches each key as a string value rather than a definition, so a key needs no quotes and `number` matches the string `"number"`. Its types are much cheaper to check than `.match` with quoted literals (#1334):

```ts
const area = match
	.in<{ kind: "circle"; r: number } | { kind: "square"; side: number }>()
	.at("kind")
	.strings({
		circle: c => Math.PI * c.r ** 2,
		square: s => s.side ** 2,
		default: "assert"
	})

// 4
area({ kind: "square", side: 2 })
```

### Write a path and a problem for a value that must be `never`

The message of an error from `never` was only `never`:

```ts
const T = type({ "files?": "never" })

// was: never
// now: files must be never (was 1)
T({ files: 1 }).toString()
```

### Describe keywords checked by a predicate by their phrase alone

The descriptions of keywords like `string.url`, `string.date` and `string.creditCard` repeated their basis or their phrase (#1300), and `string.normalize`'s `.preformatted` keywords rejected data as "valid according to predicate":

```ts
// was: a string and a URL string
// now: a URL string
type("string.url").description

// was: a credit card number and a credit card number
// now: a credit card number
type("string.creditCard").description

// was: must be valid according to predicate (was "é")
// now: must be NFC-normalized unicode (was "é")
type("string.normalize.NFC.preformatted")("é").toString()
```

### Throw a `ToJsonSchemaError` for a named symbol key

Converting a Type with a named symbol key threw a `TypeError` while writing the `ToJsonSchemaError` meant to report it:

```ts
// was: TypeError: Cannot convert a Symbol value to a string
// now: ToJsonSchemaError: Can't convert "symbolKey" at [Symbol(s)] to JSON Schema. ...
type({ [Symbol("s")]: "string" }).toJsonSchema()
```

### Emit `format: "uuid"` for versioned UUIDs

`string.uuid.v1` through `string.uuid.v8` now emit `format: "uuid"` in JSON Schema, as `string.uuid` does:

```ts
// was: { type: "string", pattern: "^[\\dA-Fa-f]{8}-..." }
// now: { type: "string", pattern: "^[\\dA-Fa-f]{8}-...", format: "uuid" }
type("string.uuid.v4").toJsonSchema()
```

### Don't require the nil and max UUIDs as keys of a `string.uuid` index signature

`string.uuid` was a union of a pattern and the nil and max UUIDs, which as an index signature's key made those two required keys (#1481). It's now one pattern accepting the same strings, so its JSON Schema is a `pattern` rather than an `anyOf`:

```ts
// was: ArkErrors: value at ["00000000-0000-0000-0000-000000000000"] must be a number (was missing)
// value at ["ffffffff-ffff-ffff-ffff-ffffffffffff"] must be a number (was missing)
// now: {}
type({ "[string.uuid]": "number" })({})
```

### Write a described union's errors from its description

A described union listed its cases instead when data missed every one of them (#963), and listed its branches' errors when they failed at keys:

```ts
const Primitive = type("string | number").describe("a primitive")

// was: must be a number or a string (was an object)
// now: must be a primitive (was an object)
Primitive({}).toString()

const AorB = type({ a: "string" }).or({ b: "number" }).describe("an a or a b")

// was: a must be a string (was missing) or b must be a number (was missing)
// now: must be an a or a b (was an object)
AorB({}).toString()

const Shape = type({ kind: "'circle'", r: "number" })
	.or({ kind: "'square'", s: "number" })
	.describe("a shape")

// was: kind must be "circle" or "square" (was "triangle")
// now: must be a shape (was an object)
Shape({ kind: "triangle" }).toString()
```

Its error is at the union's own path, with the union's value as `data`. Its `(was …)` is what its branches' errors there agree on, like `3` for a described union of string lengths, or else the value's kind. Data whose discriminant matches a case is still reported against that case's branches, like `r must be a number (was missing)`.

When a union isn't described but one of its branches is, a miss of the value itself lists the branches as an undiscriminated union's does:

```ts
const Count = type("string").or(type("number").describe("a count"))

// was: must be a number or a string (was an object)
// now: must be a count or a string (was an object)
Count({}).toString()
```

A miss at a key of a union whose branches alone are described still lists the key's cases, like `kind must be "circle" or "square" (was "triangle")`, as an undiscriminated union lists its branches' errors at the key.

### Name the comparator missing its right operand

A comparator at the end of a definition threw `Expected an expression`, and after a left bound named the comparator inverted (#1213):

```ts
// was: ParseError: Expected an expression
// now: ParseError: Token '>=' requires a right operand
type("number >=")

// was: ParseError: Token '>' requires a right operand
// now: ParseError: Token '<' requires a right operand
type("5 <")
```

The type error for `"number >="` is the same message, where it was a union of keyword completions.

### Write constraints described alike once

An intersection error listed each failed constraint's description, so constraints under one configured description repeated it (#1412). Each description is now listed once, and a single one is written as a plain `must be`:

```ts
const Email = type("string.email > 0", "@", "Email is not valid")

// was: ("") must be...
//   ◦ Email is not valid
//   ◦ Email is not valid
// now: must be Email is not valid (was "")
Email("").toString()
```

### Reject a generic definition at a parameterized scope key

A scope key declaring parameters, like `"Box<s extends string>"`, whose definition was already a `generic(...)` type-checked but threw `'generic' is unresolvable` (#1343). It's now a type error and throws a `ParseError` naming the alias:

```ts
// was: ParseError: 'generic' is unresolvable
// now: ParseError: Box is defined by a generic, so its key must not declare parameters
scope({ "Box<s extends string>": generic(["s", "string"])({ box: "s" }) })
```

### Export `TerminallyInferredObject` as a type

`arktype` exports `TerminallyInferredObject`, the objects inference keeps whole rather than mapping over, like `Date`, `Promise` and any class declared in `ArkEnv.prototypes`, so a utility type built on inferred types can stop at the same objects (#1490).

### Parse a union disjoint by an optional `never` key whatever was defined first

A union whose branches were disjoint only by an optional `never` key, with defaults that differ, threw if a union of the same keys had been defined earlier (#1543):

```ts
type({ code: "string", status: "'EXPIRED' = 'EXPIRED'" }).or({
	"code?": "never",
	status: "'REJECTED' = 'REJECTED'"
})

// previously ParseError: Invalid intersection of default values "EXPIRED" & "REJECTED"
type({
	code: "string",
	items: [{ reason: "'timeout'" }],
	status: "'EXPIRED' = 'EXPIRED'"
}).or({
	"code?": "never",
	items: [{ reason: "string" }],
	status: "'REJECTED' = 'REJECTED'"
})
```

### Infer large cyclic modules

A module with an alias for the union of `string` and 25 of its other aliases, which referenced it back, failed with TS2589, `Type instantiation is excessively deep and possibly infinite` (#1370). It now type-checks.

### Apply a default to an explicit `undefined` without `exactOptionalPropertyTypes`

With `exactOptionalPropertyTypes: false`, a defaulted key given `undefined` kept it, though its inferred type was the default's (#1390). It now gets the default, as a missing key does:

```ts
const $ = scope({}, { exactOptionalPropertyTypes: false })

// previously { key: undefined }, now { key: 5 }
$.type({ key: "number = 5" })({ key: undefined })
```

### Keep a referenced Type's `undefined` without `exactOptionalPropertyTypes`

Without TypeScript's `exactOptionalPropertyTypes`, a key whose value was a Type allowing `undefined` was inferred without it (#1310):

```ts
const age = type("number | undefined")
const User = type({ age })

// previously number, now number | undefined
type Age = typeof User.infer.age
```

### Keep a closed object closed when an intersection leaves it no keys

Intersecting objects that reject or delete undeclared keys dropped that once neither had a key left, so the result allowed any object:

```ts
// previously true, now false
type({ "a?": "1", "+": "reject" })
	.and({ "b?": "2", "+": "reject" })
	.allows({ z: 1 })

// previously true, now false
type({}).extends(type({ "+": "reject" }))
```

### Check an array's indices against a closed object it's intersected with

`"+": "reject"` rejects an array's indices unless the object declares them, but intersected with an array, the array's elements counted as declared:

```ts
// previously number[], now never[], which allows only []
type({ "+": "reject" }).and("number[]").expression

// previously allowed [0, 1], now allows at most one element
type({ "0?": "number", "+": "reject" }).and("number[]")
```

### Compare every branch of a union past a redundant one

Reducing an unordered union stopped comparing a branch at the first branch found redundant, so a morph beside a branch overlapping its input could be accepted, leaving which one transformed the data to their order. It now throws as it's defined:

```ts
// previously { kind?: "b" } | { a: number, kind: 1 } | { kind: number, + (undeclared): delete }
// now ParseError: An unordered union of a type including a morph and a type with overlapping input is indeterminate
type.or(
	{ "kind?": "'b'" },
	{ a: "number", kind: "1" },
	{ kind: "'b'" },
	{ kind: "number", "+": "delete" }
)
```

### Reject an invalid Date where a Date literal is expected

A Date literal, or a range allowing one Date, threw a RangeError for an invalid Date rather than rejecting it:

```ts
// previously RangeError: Invalid time value, now false
type("d'2000-01-01'").allows(new Date(NaN))
```

### Write a bounded Type's expression so it parses back

A Type with both bounds, or a bound after a divisor or pattern, wrote an `expression` that threw when parsed. Each is now written as it's parsed:

```ts
// previously number <= 5 & >= 1, now 1 <= number <= 5
type("1 <= number <= 5").expression

// previously number % 2 & >= 1, now number % 2 >= 1
type("number % 2 >= 1").expression

// previously number[], now 1 <= number[] <= 5
type("1 <= number[] <= 5").expression
```

### Say a missing discriminant key "was missing"

A discriminated union's error for a key the data lacks reads `(was missing)`, as a required key's does:

```ts
const Shape = type({ kind: "'circle'", r: "number" }).or({
	kind: "'square'",
	side: "number"
})

// previously kind must be "circle" or "square" (was undefined)
// now kind must be "circle" or "square" (was missing)
Shape({}).toString()
```

### Read `string.date.iso.parse`'s dates in UTC

`string.date.iso.parse` reads an ISO date or date-time without an offset as UTC, so one string is one instant on every machine, where it read them in local time. Week dates, basic formats like `"20250101"`, fractional hours and hour-only offsets, which its pattern accepts but which parsed to an Invalid Date, now parse, and a date that doesn't exist fails rather than rolling over:

```ts
const parse = type("string.date.iso.parse")

// previously 2025-01-01T17:00:00.000Z in New York, now 2025-01-01T12:00:00.000Z
parse("2025-01-01T12:00")

// previously an Invalid Date, now 2025-01-01T00:00:00.000Z
parse("20250101")

// previously 2025-03-01T00:00:00.000Z
// now ArkErrors: must be an ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ) date (was "2025-02-29")
parse("2025-02-29")
```

`string.date.parse` and `string.date` read a string `string.date.iso` accepts the same way, falling back to `new Date(s)` for other forms, like `"5/21/1993"`, which are still read by the host. So `string.date.parse` gives an ISO string the same instant on every machine, and `string.date` rejects an ISO date that doesn't exist:

```ts
// previously 2020-01-01T17:00:00.000Z in New York, now 2020-01-01T12:00:00.000Z
type("string.date.parse")("2020-01-01T12:00")

// previously 2025-03-02T00:00:00.000Z, now ArkErrors: must be a parsable date (was "2025-02-30")
type("string.date.parse")("2025-02-30")
```

### Intersect arrays whose elements are disjoint as empty arrays

Intersecting arrays whose elements are disjoint allowed any array, and a tuple an intersection narrowed kept the length bounds it had before:

```ts
// previously unknown[], now []
type("string[] & number[]").expression

// previously true, now false
type("string[]").and(["string", "number?"]).allows(["a", 5])
```

### Keep the keys an index signature narrows to optional

Intersecting an object that rejects or deletes undeclared keys with an index signature narrows the signature to the object's keys, which made each of them required:

```ts
// previously { a: number, + (undeclared): reject }, which rejected {}
// now { a?: number, + (undeclared): reject }
type({ "+": "reject", "a?": "number" }).and({ "[string]": "number" }).expression

// previously ParseError: Intersection at a of string and number results in an unsatisfiable type
// now { a?: never, + (undeclared): reject }
type({ "+": "reject", "a?": "string" }).and({ "[string]": "number" }).expression
```

### Intersect Types in the scope that asks

An intersection was cached by its operands' hashes alone, so intersecting two Types after another scope had intersected them returned that scope's result, written with its configured messages:

```ts
const L = type({ x: "string" })
const R = type({ y: "number" })
scope({}, { required: { message: "configured" } }).type([L, "&", R])

// previously configured
//            configured
// now x must be a string (was missing)
//     y must be a number (was missing)
L.and(R)({}).toString()
```

### Run the function a Type was given

A function was named by its name and a count, so a function named like another's generated name, such as `fn1`, could get that name too, and a Type defined with it ran the other function. Each function's name is now unique.

### Fail `.allows` where a narrow adds an error

A narrow that adds an error through `ctx` and returns a truthy value failed validation, but `.allows` returned true. It now returns false:

```ts
const T = type("number").narrow((n, ctx) => n > 0 || !!ctx.error("positive"))

// previously true, now false
T.allows(-1)
```

### Summarize union errors at a key named like an `Object.prototype` member

Reading the errors of a union failing at a key like `constructor` or `toString` threw:

```ts
// previously TypeError: to.push is not a function
// now constructor must be an email address or a UUID (was "x")
type({ constructor: "string.email | string.uuid" })({
	constructor: "x"
}).toString()
```

### Write JSON Schema for more index signatures and self-piping Types

`toJsonSchema()` threw an internal error for an index signature keyed by a morph, whatever `morph` fallback was given, or by `string | symbol` with a `symbolKey` fallback, and overflowed the stack for a Type whose morph pipes into its own alias. A morph key is now written as the fallback's schema describes it:

```ts
// previously InternalArktypeError: Unexpected index branch kind morph.
// now { type: "object", patternProperties: { "^(?:...)$": { type: "string" } } }, keyed by string.integer's pattern
type({ "[string.integer.parse]": "string" }).toJsonSchema({
	fallback: { morph: ctx => ctx.base }
})
```

### Infer a defaulted key beside an index signature as optional on input

```ts
const T = type({ a: "number = 5", "[string]": "number" })

// previously { [x: string]: number; a: number }, now a is optional
type In = typeof T.inferIn
```

### Read a Type's input without changing another's

Reading one Type's `in` could change another's that shared a defaulted key, so its input kept the default:

```ts
const A = type({ foo: "number = 0" })
const B = type({ foo: "number = 0", bar: "string" })
A.in.expression

// previously { bar: string, foo: number = 0 }, now { bar: string, foo?: number }
B.in.expression
```

### Install `arktype`, not `@ark/type`

arktype publishes under one name. `@ark/type`, the same package under another name, is deprecated at its last version, and `@arktype/type` is no longer published. Replace each `@ark/type` import with `arktype`, and `@ark/type/config` with `arktype/config`.

## 2.2.9

### Keep tuple elements around defaults in `.in` and `.out`

Combining a tuple's defaultable elements with its other elements dropped some of them, depending on key order:

```ts
const T = type(["string", "number = 5", "boolean?"])

// was: [string, boolean?]
// now: [string, number?, boolean?]
T.in.expression

// was: number[]
// now: [number, string, ...number[]]
type(["number", "string = 'foo'", "...", "number[]"]).out.expression
```

A bound that narrows two existing length constraints at once also no longer throws "multiple distinct intersection results":

```ts
// was: throws
// now: string == 2
type("1 <= string <= 2").and("string >= 2")
```

Thanks to @ybai08 (#1696).

### Reject `NaN` in unions discriminated by `typeof`

`number` rejects `NaN`, but compiled unions like `number | null` dropped that check when they discriminated by `typeof`, so `NaN` was only rejected with `jitless` (#1702).

```ts
const T = type("number | null")

// was: NaN
// now: ArkErrors: must be a number (was NaN)
T(NaN)
```

Thanks to @thecotne.

### Don't treat `Object.prototype` keys as declared

Inherited names like `toString` or `constructor`, and an own `__proto__` key like the one `JSON.parse` creates, were treated as declared keys, so `"+": "delete"` kept them and `"+": "reject"` accepted them (#1701).

```ts
const T = type({ a: "string", "+": "reject" })

// was: { a: "x", constructor: 1 }
// now: ArkErrors: constructor must be removed
T({ a: "x", constructor: 1 })
```

Thanks to @thecotne.

### Only emit referenced `$defs` in `toJsonSchema`

With `useRefs`, or for a cyclic type, every node a type referenced was written to `$defs`, including discriminated union cases that never appear in the output. Some of those couldn't be converted, so `toJsonSchema()` threw `Unexpected JSON Schema input for structure: {}` (#1689, fixes #1612, #1511 and #1546).

```ts
const T = type.or(
	{ a: type.enumerated("a", "b", "c"), b: "1" },
	{ a: type.enumerated("a", "e", "f"), b: "2" }
)

// was: throws
// now: only the $defs that a $ref points to
T.toJsonSchema({ useRefs: true })
```

Thanks to @giaBaoJS.

### Convert unrepresentable types in `~standard.jsonSchema` instead of throwing

`~standard.jsonSchema.input` and `.output` now throw only for an unsupported `target`, i.e. one other than `draft-2020-12` or `draft-07`. Parts of a type that JSON Schema can't represent are converted instead (#1694):

- a predicate, a second pattern, a `Date` bound or an array's non-index props is dropped from the schema it constrains
- `bigint`, `symbol`, a non-JSON unit like `undefined` and any prototype other than `Array` become `{}`
- a variadic tuple with postfix elements keeps its prefix and `minItems`, but not its `items`
- a default that isn't JSON is omitted

```ts
const T = type({
	big: "bigint",
	even: type("number").narrow(n => n % 2 === 0)
})

// was: throws
// now: { type: "object", properties: { big: {}, even: { type: "number" } }, ... }
T["~standard"].jsonSchema.input({ target: "draft-2020-12" })
```

Fallbacks from a scope's `toJsonSchema` config or from `libraryOptions` still take precedence, and `toJsonSchema()` itself still throws by default.

A `defaultValue` fallback can now return `undefined` to omit the default rather than writing `default: undefined`.

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
