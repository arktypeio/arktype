# arktype

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
| `date`                | a Date instance (supercedes `proto` for Dates )             |

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
	base,
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
	base,
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
const validResult = myObj({})

// Error: key must be a number (was undefined)
const errorResult = myObj({ key: undefined })
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
const validResult = myObj({})

// now also valid data (would be an error by default)
const secondResult = myObj({ key: undefined })
```

**WARNING: exactOptionalPropertyTypes does not yet affect default values!**

```ts
const MyObj = type({
	key: "number = 5"
})

// { key: 5 }
const omittedResult = myObj({})

// { key: undefined }
const undefinedResult = myObj({ key: undefined })
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
	n: "number % 2 > 2"
})

const out = nEvenAtLeast2({ n: 1 })

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

const out = user({
	// ArkErrors: name must be shorthand description (was a number)
	name: 5,
	// ArkErrors: email must be an email address (was definitely fake)
	email: "449 Canal St"
})
```

The options you can provide here are identical to those used to [configure a Type directly](https://arktype.io/docs/expressions#meta), and can also be [extended at a type-level to include custom metadata](https://arktype.io/docs/configuration#custom).

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
customOne(2)
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
discriminated({ name: "foo", id: 1 })
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
