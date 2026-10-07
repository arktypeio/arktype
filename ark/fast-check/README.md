# @ark/fast-check

Generate [`fast-check`](https://fast-check.dev) arbitraries from ArkType schemas.

## Install

Install it alongside `fast-check`:

```sh
pnpm add arktype @ark/fast-check fast-check
```

## Usage

`arkToArbitrary` accepts an ArkType `Type` and returns a `fast-check` `Arbitrary` that generates values matching that schema:

```ts
import { arkToArbitrary } from "@ark/fast-check"
import { type } from "arktype"
import { assert, property } from "fast-check"

const User = type({
	name: "string",
	"age?": "number.integer >= 0"
})

assert(
	property(arkToArbitrary(User), value => {
		const user = User.assert(value)
		return user.age === undefined || user.age >= 0
	})
)
```

This is useful when you want property-based tests to cover the same input space that your runtime validators accept.

## Supported Schemas

`@ark/fast-check` supports common ArkType definitions including:

- primitive domains like `string`, `number`, `bigint`, `boolean`, `symbol` and `unknown`
- unions and literals
- numeric, string, array and date constraints
- arrays, tuples and variadic tuples
- object structures, optional properties and index signatures
- finite aliases and morph inputs

Unsupported schema combinations throw when creating the arbitrary, so test failures point to the unsupported definition before the property runs.
