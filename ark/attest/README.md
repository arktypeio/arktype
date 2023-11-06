# Attest

This package is under active development.

If you want to try it, you'll need to call our setup/cleanup methods before and after your tests run.

For example, in mocha:

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
	attest(o).type.toString.snap()
})

test("type assertion", () => {
	attest(o).typed as { readonly ark: "type" }
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
