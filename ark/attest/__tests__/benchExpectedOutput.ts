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
).median([2, "ms"])

bench(
	"bench call single stat",
	() => "boofoozoo".includes("foo"),
	fakeCallOptions
).mean([2, "ms"])

bench(
	"bench call mark",
	() => /.*foo.*/.test("boofoozoo"),
	fakeCallOptions
).mark({ mean: [2, "ms"], median: [2, "ms"] })

type makeComplexType<S extends string> =
	S extends `${infer head}${infer tail}` ? head | tail | makeComplexType<tail>
	:	S

bench("bench type", () => ({}) as makeComplexType<"defenestration">).types([
	163,
	"instantiations"
])

bench(
	"bench type from external module",
	() => ({}) as externalmakeComplexType<"defenestration">
).types([179, "instantiations"])

bench(
	"bench call and type",
	() => ({}) as makeComplexType<"antidisestablishmentarianism">,
	fakeCallOptions
)
	.mean([2, "ms"])
	.types([317, "instantiations"])

bench("empty", () => {}).types([0, "instantiations"])
