# arktype

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
