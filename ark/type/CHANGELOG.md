# arktype

## 2.0.0-beta.1

### Generic Builtins

In addition to `Record`, the following generics from TS are now available in ArkType:

- **Pick**
- **Omit**
- **Extract**
- **Exclude**

These can be instantiated in one of three ways:

### Syntactic Definition

```ts
// Type<1>
const one = type("Extract<0 | 1, 1>")
```

### Chained Definition

```ts
const user = type({
	name: "string",
	"age?": "number",
	isAdmin: "boolean"
})

// Type<{
//     name: string;
//     age?: number;
// }>
const basicUser = user.pick("name", "age")
```

### Invoked Definition

```ts
import { ark } from "arktype"

// Type<true>
const unfalse = ark.Exclude("boolean", "false")
```

### New Keywords

#### BuiltinObjects

We've added many new keywords for builtin JavaScript objects:

- `ArrayBuffer`
- `Blob`
- `File`
- `FormData`
- `Headers`
- `Request`
- `Response`
- `URL`
- `TypedArray.Int8`
- `TypedArray.Uint8`
- `TypedArray.Uint8Clamped`
- `TypedArray.Int16`
- `TypedArray.Uint16`
- `TypedArray.Int32`
- `TypedArray.Uint32`
- `TypedArray.Float32`
- `TypedArray.Float64`
- `TypedArray.BigInt64`
- `TypedArray.BigUint64`

#### `pasre.formData` and `liftArray`

We've also added a new builtin parse keyword, `parse.formData`. It validates an input is an instance of `FormData`, then converts it to a `Record<string, string | File | string[] | File[]>`. The first entry for a given key will have a `string | File` value. If subsequent entries with the same key are encountered, the value will be an array listing them.

This is especially useful when combined with a new builtin generic, `liftArray`. This generic accepts a single parameter, accepts inputs of that type or arrays of that type, and converts the input to an array if it is not one already.

Here's an example of how they can be used together:

```ts
const user = type({
	email: "email",
	file: "File",
	tags: "liftArray<string>"
})

// Type<(In: FormData) => Out<{
//     email: string.matching<"?">;
//     file: File;
//     tags: (In: string | string[]) => Out<string[]>;
// }>>
const parseUserForm = type("parse.formData").pipe(user)
```

### Generic HKTs

Our new generics have been built using a new method for integrating arbitrary external types as native ArkType generics! This opens up tons of possibilities for external integrations that would otherwise not be possible, but we're still finalizing the API. As a preview, here's what the implementation of `Exclude` looks like internally:

```ts
class ArkExclude extends generic("T", "U")(args => args.T.exclude(args.U)) {
	declare hkt: (
		args: conform<this[Hkt.args], [unknown, unknown]>
	) => Exclude<(typeof args)[0], (typeof args)[1]>
}
```

More to come on this as the API is finalized!

## 2.0.0-beta.0

### Generics

Native generic syntax is finally available! 🎉

Here are some examples of how this powerful feature can be used:

#### Standalone Type Syntax

```ts
const boxOf = type("<t>", { box: "t" })

const schrodingersBox = boxOf({ cat: { isAlive: "boolean" } })

const expected = type({
	box: {
		cat: { isAlive: "boolean" }
	}
})

// true
console.log(expected.equals(schrodingersBox))
```

#### Constrained Parameters

All syntax in parameters definitions and all references to generic args are fully-type safe and autocompleted like any builtin keyword. Constraints can be used just like TS to limit what can be passed to a generic and allow that arg to be used with operators like `>`.

```ts
const nonEmpty = type("<arr extends unknown[]>", "arr > 0")
const nonEmptyNumberArray = nonEmpty("number[]")

const expected = type("number[] > 0")

// true
console.log(expected.equals(nonEmptyNumberArray))
```

#### Scoped

There is a special syntax for specifying generics in a scope:

```ts
const types = scope({
	"box<t, u>": {
		box: "t | u"
	},
	bitBox: "box<0, 1>"
}).export()

const expected = type({ box: "0|1" })

// true
console.log(expected.equals(types.bitBox))
```

#### Builtins

Record is now available as a builtin keyword.

```ts
const stringRecord = type("Record<string, string>")

const expected = type({
	"[string]": "string"
})

// true
console.log(expected.equals(stringRecord))
```

Other common utils like `Pick` and `Omit` to follow in the an upcoming release.

Recursive and cyclic generics are also currently unavailable and will be added soon.

For more usage examples, check out the unit tests for generics [here](https://github.com/arktypeio/arktype/blob/main/ark/type/__tests__/generic.test.ts).

This feature was built to be very robust and flexible. We're excited to see what you do with it!

### Fix narrowing output of some piped unions

In recent versions, types like the following would fail to parse:

```ts
// Previously was a ParseError, now correctly inferred as
// (In: string | number) => Out<of<bigint, Narrowed>>
const Amount = type("string|number")
	.pipe(v => BigInt(v))
	.narrow(b => b > 0n)
```

## 2.0.0-dev.29

### Fix parsing for expressions starting with subalias references

In recent versions, types like the following would fail to parse:

```ts
// ParseError: "parse.date | Date" is unresolvable
const dateFrom = type("parse.date | Date")
```

Those expressions are once again resolved correctly.

## 2.0.0-dev.28

### Fix inference for constrained or morphed optional keys (https://github.com/arktypeio/arktype/issues/1040)

```ts
const repro = type({
	normal: "string>0",
	"optional?": "string>0"
})

type Expected = { normal: string; optional?: string }

// these are both now identical to Expected
// (previously, optional was inferred as string.moreThanLength<0>)
type Actual = typeof repro.infer
type ActualIn = typeof repro.infer
```

## 2.0.0-dev.27

### Fixed an issue causing morphs on optional keys to give a type error incorrectly indicating they had default values, e.g.:

```ts
const t = type({
	// previously had a type error here
	"optionalKey?": ["string", "=>", x => x.toLowerCase()]
})

// now correctly inferred as
type T = {
	optionalKey?: (In: string) => Out<string>
}
```

## 2.0.0-dev.26

### Improved string default parsing

String defaults are now parsed more efficiently by the core string parser. They can include arbitrary whitespace and give more specific errors.

### Fix a resolution issue on certain cyclic unions

```ts
// Now resolves correctly
const types = scope({
	TypeWithKeywords: "ArraySchema",
	Schema: "number|ArraySchema",
	ArraySchema: {
		"additionalItems?": "Schema"
	}
}).export()
```

## 2.0.0-dev.25

### String defaults

Previously, setting a default value on an object required a tuple expression:

```ts
const myType = type({ value: ["number", "=", 42] })
```

This is still valid, but now a more convenient syntax is supported for many common cases:

```ts
const myType = type({ value: "number = 42" })
```

The original syntax is still supported, and will be required for cases where the default value is not a serializable primitive e.g.

```ts
const mySymbol = Symbol()
const myType = type({ value: ["symbol", "=", mySymbol] })
```

### Chained index access

This allows type-safe chained index access on types via a .get method

```ts
const myUnion = type(
	{
		foo: {
			bar: "0"
		}
	},
	"|",
	{
		foo: {
			bar: "1"
		}
	}
)

// Type<0 | 1>
const fooBar = myUnion.get("foo", "bar")
```

### `format` subscope keyword

The new built-in format subscope contains keywords for transforming validated strings:

```ts
const foo =

const trim = type("format.trim")

// "fOO"
console.log(trim(" fOO "))

const lowercase = type("format.lowercase")

// " foo "
console.log(lowercase(" fOO "))

// " FOO "
const uppercase = type("format.uppercase")
```

### Many more improvements, especially related to morphs across unions

## 2.0.0-dev.24

### Fix constrained narrow/pipe tuple expression input inference

Previously constraints were not stripped when inferring function inputs for tuple expressions like the following:

```ts
// previously errored due to data being inferred as `number.moreThan<0>`
// now correctly inferred as number
const t = type(["number>0", "=>", data => data + 1])
```

### Fix a bug where paths including optional keys could be included as candidates for discrimination (see https://github.com/arktypeio/arktype/issues/960)

### Throw descriptive parse errors on unordered unions between indiscriminable morphs and other indeterminate type operations (see https://github.com/arktypeio/arktype/issues/967)

## 2.0.0-dev.23

### Add an `AnyType` type that allows a Type instance from any Scope

### Avoid an overly verbose default error on a missing key for a complex object

```ts
const MyType = type({
	foo: {
		/** Some very complex object */
	}
})

// previously threw with a message like:
// sections must be /* Some very complex description */ (was missing)

// now throws with a message like:
// sections must be an object (was missing)
MyType.assert({})
```

## 2.0.0-dev.22

### Allow overriding builtin keywords

```ts
// all references to string in this scope now enforce minLength: 1
const $ = scope({
	foo: {
		// has minLength: 1
		bar: "string"
	},
	string: schema({ domain: "string" }).constrain("minLength", 1)
})

// has minLength: 1
const s = $.type("string")
```

### Fix a ParseError compiling certain morphs with cyclic inputs

Types like the following will now work:

```ts
const types = scope({
	ArraySchema: {
		"items?": "Schema"
	},
	Schema: "TypeWithKeywords",
	TypeWithKeywords: "ArraySchema"
}).export()

const t = types.Schema.pipe(o => JSON.stringify(o))
```

## 2.0.0-dev.21

### Fix chained .describe() on union types

```ts
// now correctly adds the description to the union and its branches
const t = type("number|string").describe("My custom type")
```

## 2.0.0-dev.20

### Fix autocomplete for private aliases

```ts
const $ = scope({
	"#kekw": "true",
	// now correctly completed as "kekw" without the # prefix,
	outerKek: {
		kekw: "kek"
	}
})
```

## 2.0.0-dev.19

### Chainable Constraints

Added `satisfying`, `matching`, `divisibleBy`, `atLeast`, `moreThan`, `atMost`, `lessThan`, `atLeastLength`, `moreThanLength`, `atMostLength`, `lessThanLength`, `atOrAfter`, `laterThan`, `atOrBefore`, and `earlierThan` as chainable expressions mirroring existing comparator expressions.

This can be especially convenient for applying constraints to previously defined types like this:

```ts
const evenNumber = type("number%2")

const evenNumberLessThan100 = evenNumber.lessThan(100)

const equivalentSingleDeclaration = type("number%2<100")
```

Also works great for chaining off non-string-embedable expressions outside a scope:

```ts
const myBoundedArray = type({ foo: "string" })
	.array()
	.atLeastLength(5)
	.atMostLength(20)
```

These chained operations are also typesafe:

```ts
// TypeError: Divisor operand must be a number (was a string)
type("string").divisibleBy(2)
```

### Cyclic Types Bug Fix

Fixed an issue causing standalone types referencing cyclic types in a scope to crash on JIT-compiled runtime validation.

Types like this will now work correctly:

```ts
const $ = scope({
	box: {
		"box?": "box"
	}
})

const box = $.type("box|null")
```

## 2.0.0-dev.18

Add a `"digits"` keyword for strings consisting exclusively of 0-9.

Fix an issue causing index signatures with constraints like regex to be considered invalid as definitions.

The following is valid and now will be allowed as a definition.

```ts
const test = scope({
	svgPath: /^\.\/(\d|a|b|c|d|e|f)+(-(\d|a|b|c|d|e|f)+)*\.svg$/,
	svgMap: {
		"[svgPath]": "digits"
	}
}).export()
```

## 2.0.0-dev.17

- Error thrown by `.assert` or `out.throw()` is now an instance of [AggregateError](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AggregateError), with the cause being an `ArkErrors` array.

- Throw an error immediately if multiple versions of `arktype` are imported

- Fix an issue causing some discriminated unions including a prototype like `string | RegExp` to return incorrect validation results.

## 2.0.0-dev.16

- Fix an incorrect return value on pipe sequences like the following:

```ts
const Amount = type(
	"string",
	":",
	(s, ctx) => Number.isInteger(Number(s)) || ctx.invalid("number")
)
	.pipe((s, ctx) => {
		try {
			return BigInt(s)
		} catch {
			return ctx.error("a non-decimal number")
		}
	})
	.narrow((amount, ctx) => true)

const Token = type("7<string<=120")
	.pipe(s => s.toLowerCase())
	.narrow((s, ctx) => true)

const $ = scope({
	Asset: {
		token: Token,
		amount: Amount
	},
	Assets: () => $.type("Asset[]>=1").pipe(assets => assets)
})

const types = $.export()

// now correctly returns { token: "lovelace", amount: 5000000n }
const out = types.Assets([{ token: "lovelace", amount: "5000000" }])

// (was previously { token: undefined, amount: undefined })
```

https://github.com/arktypeio/arktype/pull/974

## 2.0.0-dev.15

- Fix a crash when piping to nested paths (see https://github.com/arktypeio/arktype/issues/968)
- Fix inferred input type of `.narrow` (see https://github.com/arktypeio/arktype/issues/969)
- Throw on a pipe between disjoint types, e.g.:

```ts
// Now correctly throws ParseError: Intersection of <3 and >5 results in an unsatisfiable type
const t = type("number>5").pipe(type("number<3"))

// Previously returned a Disjoint object
```

- Mention the actual value when describing an intersection error:

```ts
const evenGreaterThan5 = type({ value: "number%2>5" })
const out = evenGreaterThan5(3)
if (out instanceof type.errors) {
	/*
    value 3 must be...
      • a multiple of 2
      • at most 5
    */
	console.log(out.summary)
}

// was previously "value must be..."
```

Thanks [@TizzySaurus](https://github.com/TizzySaurus) for reporting the last two on [our Discord](arktype.io/discord)!

https://github.com/arktypeio/arktype/pull/971

## 2.0.0-dev.14

### Patch Changes

- Initial changeset

```

```

```

```
