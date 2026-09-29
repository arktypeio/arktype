---
title: Type API
---

<ApiTable group="Type" />

The methods below are available on every `Type` instance. For validation and traversal methods (`assert`, `allows`, direct invocation), see the [Traversal API](/docs/traversal-api). For composition methods (`pipe`, `to`, `narrow`, `filter`, `and`, `or`), see [Expressions](/docs/expressions). For object-specific methods (`pick`, `omit`, `required`, `partial`, `merge`, `keyof`, `get`, `readonly`, `map`, `props`), see [Objects](/docs/objects).

### from

`from` is a typed-input variant of `assert`. It accepts an input matching `inferIn` and returns `inferOut`, providing type safety on both sides. Like `assert`, it throws a `TraversalError` on invalid input:

```ts
// @errors: 2345
const StringToNumber = type("string.numeric.parse")

// TypeScript knows the input must be a string
const result = StringToNumber.from("42") // 42

StringToNumber.from(42)
```

### in / out

The `in` and `out` getters extract the input or output Type from a morphed Type, stripping transformations:

```ts
const ParsedUser = type({
	name: "string",
	age: "string.numeric.parse"
})

// Type<{ name: string; age: string }>
const UserInput = ParsedUser.in

// Type<{ name: string; age: number }>
const UserOutput = ParsedUser.out
```

### extends

Check if a Type is a subtype of another:

```ts
const T = type("string")

T.extends("unknown") // true
T.extends("number") // false

// ifExtends returns the Type itself if true, undefined otherwise
const result = T.ifExtends("string | number") // Type<string | number> | undefined
```

### equals

Check if two Types are structurally identical:

```ts
const A = type({ name: "string" })
const B = type({ name: "string" })
const C = type({ name: "number" })

A.equals(B) // true
A.equals(C) // false

// ifEquals returns the Type if equal, undefined otherwise
const result = A.ifEquals(B) // Type<{ name: string }> | undefined
```

### overlaps

Check if any value could satisfy both Types:

```ts
const A = type("string | number")
const B = type("number | boolean")
const C = type("string")

A.overlaps(B) // true (number satisfies both)
C.overlaps(type("number")) // false
```

### extract / exclude

Extract or exclude union branches based on a Type:

```ts
const T = type("string | number | boolean")

// Type<string | boolean>
const Extracted = T.extract("string | boolean")

// Type<number>
const Excluded = T.exclude("string | boolean")
```

### distribute

Map and optionally reduce over union branches:

```ts
const T = type("string | number | bigint")

// ["bigint", "number", "string"]
const expressions = T.distribute(branch => branch.expression)

// with a reducer
const count = T.distribute(
	branch => branch,
	branches => branches.length
) // 3
```

### toJsonSchema

Each `Type` instance exposes a `toJsonSchema()` method that can be used to generate a corresponding JSON Schema.

```ts
const User = type({
	name: "string",
	email: "string.email",
	"age?": "number >= 18"
})

const schema = User.toJsonSchema()

const result = {
	$schema: "https://json-schema.org/draft/2020-12/schema",
	type: "object",
	properties: {
		name: { type: "string" },
		email: {
			type: "string",
			format: "email",
			pattern: "^[\w%+.-]+@[\d.A-Za-z-]+\.[A-Za-z]{2,}$"
		},
		age: { type: "number", minimum: 18 }
	},
	required: ["email", "name"]
}
```

Options can be passed to change the behavior including how incompatibilities are handled. See [the associated config docs](/docs/configuration#tojsonschema) for more details.
