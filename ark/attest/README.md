# Attest

Attest is a testing library that makes your TypeScript types available at runtime, giving you access to precise type-level assertions and performance benchmarks.

Assertions are framework agnostic and can be seamlessly integrated with your existing Vitest, Jest, or Mocha tests.

Benchmarks can run from anywhere and will deterministically report the number of type instantiations contributed by the contents of the `bench` call.

If you've ever wondered how [ArkType](https://github.com/arktypeio/arktype) can guarantee identical behavior between its runtime and static parser implementations and highly optimized editor performance, Attest is your answer⚡

## Installation

```bash
npm install @ark/attest
```

_Note: This package is still in alpha! Your feedback will help us iterate toward a stable 1.0._

## Setup

To use attest's type assertions, you'll need to call our setup/cleanup methods before your first test and after your last test, respectively. This usually involves some kind of globalSetup/globalTeardown config.

### Vitest

`vitest.config.ts`

```ts
import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		globalSetup: ["setupVitest.ts"]
	}
})
```

`setupVitest.ts`

```ts
import { setup } from "@ark/attest"

// config options can be passed here
export default () => setup({})
```

### Mocha

`package.json`

```json
"mocha": {
	"require": "./setupMocha.ts"
}
```

`setupMocha.ts`

```ts
import { setup, teardown } from "@ark/attest"

// config options can be passed here
export const mochaGlobalSetup = () => setup({})

export const mochaGlobalTeardown = teardown
```

You should also add `.attest` to your repository's `.gitignore` file.

Bun support is currently pending [them supporting @prettier/sync for type formatting](https://github.com/oven-sh/bun/issues/10768). If this is a problem for you, please 👍 that issue so they prioritize it!

## Assertions

Here are some simple examples of type assertions and snapshotting:

```ts
// @ark/attest assertions can be made from any unit test framework with a global setup/teardown
describe("attest features", () => {
	it("type and value assertions", () => {
		const Even = type("number%2")
		// asserts even.infer is exactly number
		attest<number>(even.infer)
		// make assertions about types and values seamlessly
		attest(even.infer).type.toString.snap("number")
		// including object literals- no more long inline strings!
		attest(even.json).snap({
			intersection: [{ domain: "number" }, { divisor: 2 }]
		})
	})

	it("error assertions", () => {
		// Check type errors, runtime errors, or both at the same time!
		// @ts-expect-error
		attest(() => type("number%0")).throwsAndHasTypeError(
			"% operator must be followed by a non-zero integer literal (was 0)"
		)
		// @ts-expect-error
		attest(() => type({ "[object]": "string" })).type.errors(
			"Indexed key definition 'object' must be a string, number or symbol"
		)
	})

	it("completion snapshotting", () => {
		// snapshot expected completions for any string literal!
		// @ts-expect-error (if your expression would throw, prepend () =>)
		attest(() => type({ a: "a", b: "b" })).completions({
			a: ["any", "alpha", "alphanumeric"],
			b: ["bigint", "boolean"]
		})
		type Legends = { faker?: "🐐"; [others: string]: unknown }
		// works for keys or index access as well (may need prettier-ignore to avoid removing quotes)
		// prettier-ignore
		attest({ "f": "🐐" } as Legends).completions({ "f": ["faker"] })
	})

	it("jsdoc snapshotting", () => {
		// match or snapshot expected jsdoc associated with the value passed to attest
		const T = type({
			/** FOO */
			foo: "string"
		})

		const out = T.assert({ foo: "foo" })

		attest(out.foo).jsdoc.snap("FOO")
	})

	it("integrate runtime logic with type assertions", () => {
		const ArrayOf = type("<t>", "t[]")
		const numericArray = arrayOf("number | bigint")
		// flexibly combine runtime logic with type assertions to customize your
		// tests beyond what is possible from pure static-analysis based type testing tools
		if (getTsVersionUnderTest().startsWith("5")) {
			// this assertion will only occur when testing TypeScript 5+!
			attest<(number | bigint)[]>(numericArray.infer)
		}
	})

	it("integrated type performance benchmarking", () => {
		const User = type({
			kind: "'admin'",
			"powers?": "string[]"
		})
			.or({
				kind: "'superadmin'",
				"superpowers?": "string[]"
			})
			.or({
				kind: "'pleb'"
			})
		attest.instantiations([7574, "instantiations"])
	})
})
```

## Options

Options can be specified in one of 3 ways:

- An argument passed to your test process, e.g. `--skipTypes` or `--benchPercentThreshold 10`
- An environment variable with an `ATTEST_` prefix, e.g. `ATTEST_skipTypes=1` or `ATTEST_benchPercentThreshold=10`
- Passed as an option to attest's `setup` function, e.g.:

`setupVitest.ts`

```ts
import * as attest from "@ark/attest"

export const setup = () =>
	attest.setup({
		skipTypes: true,
		benchPercentThreshold: 10
	})
```

Here are the current defaults for all available options. Please note, some of these are experimental and subject to change:

```ts
export const getDefaultAttestConfig = (): BaseAttestConfig => ({
	tsconfig:
		existsSync(fromCwd("tsconfig.json")) ? fromCwd("tsconfig.json") : undefined,
	attestAliases: ["attest", "attestInternal"],
	updateSnapshots: false,
	skipTypes: false,
	skipInlineInstantiations: false,
	tsVersions: "typescript",
	benchPercentThreshold: 20,
	benchErrorOnThresholdExceeded: true,
	filter: undefined,
	testDeclarationAliases: ["bench", "it", "test"],
	formatter: `npm exec --no -- prettier --write`,
	shouldFormat: true,
	typeToStringFormat: {}
})
```

### `skipTypes`

`skipTypes` is extremely useful for iterating quickly during development without having to typecheck your project to test runtime logic.

When this setting is enabled, setup will skip typechecking and all assertions requiring type information will be skipped.

You likely want two scripts, one for running tests with types and one for tests without:

```json
		"test": "ATTEST_skipTypes=1 vitest run",
		"testWithTypes": "vitest run",
```

Our recommendation is to use `test` when:

- Only wanting to test runtime logic during development
- Running tests in watch mode or via VSCode's Test Explorer

Use `testWithTypes` when:

- You've made changes to your types and want to recheck your type-level assertions
- You're running your tests in CI

### `typeToStringFormat`

A set of [`prettier.Options`](https://prettier.io/docs/en/options.html) overrides that apply specifically `type.toString` formatting.

Any options you provide will override the defaults, which are as follows:

```jsonc
{
	"semi": false,
	// note this print width is optimized for type serialization, not general code
	"printWidth": 60,
	"trailingComma": "none",
	"parser": "typescript"
}
```

The easiest way to provide overrides is to the `setup` function, but they can also be provided as a JSON serialized string either passed to a `--typeToStringFormat` CLI flag or set as the value of `ATTEST_typeToStringFormat` on `process.env`.

## Benches

Benches are run separately from tests and don't require any special setup. If the below file was `benches.ts`, you could run it using something like `tsx benches.ts` or `ts-node benches.ts`:

```ts
// Combinatorial template literals often result in expensive types- let's benchmark this one!
type makeComplexType<s extends string> =
	s extends `${infer head}${infer tail}` ? head | tail | makeComplexType<tail>
	:	s

bench("bench type", () => {
	return {} as makeComplexType<"defenestration">
	// This is an inline snapshot that will be populated or compared when you run the file
}).types([169, "instantiations"])

bench(
	"bench runtime and type",
	() => {
		return {} as makeComplexType<"antidisestablishmentarianism">
	},
	fakeCallOptions
)
	// Average time it takes the function execute
	.mean([2, "ms"])
	// Seems like our type is O(n) with respect to the length of the input- not bad!
	.types([337, "instantiations"])
```

If you're benchmarking an API, you'll need to include a "baseline expression" so that instantiations created when your API is initially invoked don't add noise to the individual tests.

Here's an example of what that looks like:

```ts
import { bench } from "@ark/attest"
import { type } from "arktype"

// baseline expression
type("boolean")

bench("single-quoted", () => {
	const _ = type("'nineteen characters'")
	// would be 2697 without baseline
}).types([610, "instantiations"])

bench("keyword", () => {
	const _ = type("string")
	// would be 2507 without baseline
}).types([356, "instantiations"])
```

> [!WARNING]  
> Be sure your baseline expression is not identical to an expression you are using in any of your benchmarks. If it is, the individual benchmarks will reuse its cached types, leading to reduced (or 0) instantiations.

If you'd like to fail in CI above a threshold, you can add flags like the following (default value is 20%, but it will not throw unless `--benchErrorOnThresholdExceeded` is set):

```
 tsx ./p99/within-limit/p99-tall-simple.bench.ts  --benchErrorOnThresholdExceeded --benchPercentThreshold 10
```

## CLI

Attest also includes a builtin `attest` CLI including the following commands:

### `stats`

```bash
npm run attest stats packages/*
```

Summarizes key type performance metrics for each package (check time, instantiations, and type count).

Expects any number of args representing package directories to check, optionally specified using glob patterns like `packages/*`.

If no directories are provided, defaults to CWD.

### `trace`

```bash
npm run attest trace .
```

Creates a trace.json file in `.attest/trace` that can be viewed as a type performance heat map via a tool like https://ui.perfetto.dev/. Also summarizes any hot spots as identified by `@typescript/analyze-trace`.

Trace expects a single argument representing the root directory of the root package for which to gather type information.

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

### TS Versions

There is a tsVersions setting that allows testing multiple TypeScript aliases at once.

````ts globalSetup.ts
import { setup } from "@ark/attest"
/** A string or list of strings representing the TypeScript version aliases to run.
 *
 * Aliases must be specified as a package.json dependency or devDependency beginning with "typescript".
 * Alternate aliases can be specified using the "npm:" prefix:
 * ```json
 * 		"typescript": "latest",
 * 		"typescript-next": "npm:typescript@next",
 * 		"typescript-1": "npm:typescript@5.2"
 * 		"typescript-2": "npm:typescript@5.1"
 * ```
 *
 * "*" can be pased to run all discovered versions beginning with "typescript".
 */
setup({ tsVersions: "*" })
````

### APIs

The most flexible attest APIs are `getTypeAssertionsAtPosition` and `caller`.

Here's an example of how you might use them in your own API:

```ts
import { getTypeAssertionsAtPosition, caller } from "@ark/attest"

const yourCustomAssert = <expectedType>(actualValue: expectedType) => {
	const position = caller()
	const types = getTypeAssertionsAtPosition(position)
	// assert that the type of actualValue is the same as the type of expectedType
	const relationship = types[0].args[0].relationships.typeArgs[0]
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
