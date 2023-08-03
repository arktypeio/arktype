# Attest

This package is under active development.

If you want to try it, you'll need to call our setup/cleanup methods before and after your tests run.

For example, in mocha

```ts
import { cleanup, setup } from "@arktype/attest"

export const mochaGlobalSetup = setup

export const mochaGlobalTeardown = cleanup
```

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
	attest(o).types.toString.snap()
})

test("type assertion", () => {
	attest(o).typed as { readonly ark: "type" }
})

test("chained snaps", () => {
	attest(o).snap().types.toString.snap()
})

test("error and type error snap", () => {
	// @ts-expect-error
	attest(() => shouldThrow(true))
		.throws.snap()
		.types.errors.snap()
})
```

Here is an example of benchmarking:

```ts
bench(
	"bench call single stat median",
	() => "boofoozoo".includes("foo")
	// will snapshot execution time
).median()

bench("bench type", () => {
	return [] as any as MakeComplexType<"defenestration">
	// will snapshot type instantiation count
	// can be a bit finicky, sometimes requires the type to be assigned to a variable
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
