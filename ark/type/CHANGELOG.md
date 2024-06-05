# arktype

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
