import { bench } from "@ark/attest"
import type { makeComplexType as externalmakeComplexType } from "./utils.ts"

const fakeCallOptions = {
	until: { count: 2 },
	fakeCallMs: "count",
	benchFormat: { noExternal: true }
}

bench(
	"bench call single stat median",
	() => "boofoozoo".includes("foo"),
	fakeCallOptions
).median()

bench(
	"bench call single stat",
	() => "boofoozoo".includes("foo"),
	fakeCallOptions
).mean()

bench(
	"bench call mark",
	() => /.*foo.*/.test("boofoozoo"),
	fakeCallOptions
).mark()

let resource: { value: number } | undefined

bench("bench call with hooks", () => resource!.value, {
	...fakeCallOptions,
	hooks: {
		beforeCall: () => (resource = { value: 1 }),
		afterCall: () => (resource = undefined)
	}
}).median()

type makeComplexType<S extends string> =
	S extends `${infer head}${infer tail}` ? head | tail | makeComplexType<tail>
	:	S

bench("bench type", () => ({}) as makeComplexType<"defenestration">).types()

bench(
	"bench type from external module",
	() => ({}) as externalmakeComplexType<"defenestration">
).types()

bench(
	"bench call and type",
	() => ({}) as makeComplexType<"antidisestablishmentarianism">,
	fakeCallOptions
)
	.mean()
	.types()

bench(
	"bench async call and type",
	async () => ({}) as makeComplexType<"antidisestablishmentarianism">,
	fakeCallOptions
)
	.mean()
	.then(assertions => assertions.types())

bench("empty", () => {}).types()
