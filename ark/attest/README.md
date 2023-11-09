# Attest

## Installation

```bash
npm install @arktype/attest
```

*Note: This package is still in alpha! Your feedback will help us iterate toward a stable 1.0.*

## Setup

To use attest's type assertions, you'll need to call our setup/cleanup methods before your first test and after your last test, respectively. This usually involves some kind of globalSetup/globalTeardown config.

For example, in mocha:

```ts
import { cleanup, setup } from "@arktype/attest"

export const mochaGlobalSetup = setup

export const mochaGlobalTeardown = cleanup
```

## Assertions

Here are some simple examples of type assertions and snapshotting:

```ts
import { attest } from "@arktype/attest"
import { test } from "mocha"

const o = { ark: "type" } as const

const shouldThrow = (a: false) => {
	if (a) {
		throw new Error(`${a} is not assignable to false`)
	}
}

test("value snap", () => {
	attest(o).snap()
})

test("type snap", () => {
	attest(o).type.toString.snap()
})

test("typed value assertions", () => {
	// assert the type of `o` is exactly { readonly ark: "type" }
	attest<{ readonly ark: "type" }>(o)
})

test("type-only assertions", () => {
	// assert that two types are equivalent without a value
	attest<{ readonly ark: "type" }, typeof o>()
})

test("chained snaps", () => {
	attest(o).snap().type.toString.snap()
})

test("error and type error snap", () => {
	// @ts-expect-error
	attest(() => shouldThrow(true))
		.throws.snap()
		.type.errors.snap()
})
```

## Benches

Benches are run separately from tests and don't require any special setup. If the below file was `benches.ts`, you could run it using something like `tsx benches.ts` or `ts-node benches.ts`:

```ts
import { bench } from "@arktype/attest"

type MakeComplexType<S extends string> = S extends `${infer head}${infer tail}`
	? head | tail | MakeComplexType<tail>
	: S

bench(
	"bench call single stat median",
	() => "boofoozoo".includes("foo")
	// will snapshot execution time
).median()

bench("bench type", () => {
	return [] as any as MakeComplexType<"defenestration">
	// will snapshot type instantiation count
	// can be a bit finicky, sometimes requires the type to be returned or assigned to a variable
	// if the result is 0, something is probably off :-)
}).types()

bench(
	"bench call and type",
	() =>
		/.*foo.*/.test(
			"boofoozoo"
		) as any as MakeComplexType<"antidisestablishmenttarianism">
)
	// runtime and type benchmarks can be chained for an expression
	.mean()
	.types()
```

## Integration

### Setup

If you're a library author wanting to integrate type into your own assertions instead of using the `attest` API, you'll need to call `setup` with a list of `attestAliases` to ensure type data is collected from your own functions:

```ts
// attest will only collect type data from functions with names listed in `attestAliases`
setup({ attestAliases: ["yourCustomAssert"] })

// There are many other config options, but some are primarily internal- use others at your own risk!
```

You'll need to make sure that setup with whatever aliases you need before the first test runs. As part of the setup process, attest will search for the specified assertion calls and cache their types in a temporary file that will be referenced during test execution.

This ensures that type assertions can be made across processes without creating a new TSServer instance for each.

### APIs

The most flexible attest APIs are `getArgTypesAtPosition` and `caller`.

Here's an example of how you might use them in your own API:

```ts
import { getArgTypesAtPosition, caller } from "@arktype/attest"

const yourCustomAssert = <expectedType>(actualValue: expectedType) => {
	const position = caller()
	const types = getArgTypesAtPosition(position)
	// assert that the type of actualValue is the same as the type of expectedType
	const relationship = types.args[0].relationships.typeArgs[0]
	if (relationship === undefined) {
		throw new Error(
			`yourCustomAssert requires a type arg representing the expected type, e.g. 'yourCustomAssert<"foo">("foo")'`
		)
	}
	if (relationship !== "equality") {
		throw new Error(
			`Expected ${types.typeArgs[0].type}, got ${types.args[0].type} with relationship ${relationship}`
		)
	}
}
```

A user might then use `yourCustomAssert` like this:

```ts
import { yourCustomAssert } from "your-package"

test("my code", () => {
	// Ok
	yourCustomAssert<"foo">(`${"f"}oo` as const)
	// Error: `Expected boolean, got true with relationship subtype`
	yourCustomAssert<boolean>(true)
	// Error: `Expected 5, got number with relationship supertype`
	yourCustomAssert<5>(2 + 3)
})
```

Please don't hesitate to a GitHub [issue](https://github.com/arktypeio/arktype/issues/new/choose) or [discussion](https://github.com/arktypeio/arktype/discussions/new/choose) or reach out on [ArkType's Discord](https://arktype.io/discord) if you have any questions or feedback- we'd love to hear from you! ⛵
