import { bench } from "@arktype/attest"

const fakeCallOptions = {
	until: { count: 2 },
	fakeCallMs: "count",
	benchFormat: { noExternal: true }
}

bench(
	"bench call single stat median",
	() => {
		return "boofoozoo".includes("foo")
	},
	fakeCallOptions
).median([2, "ms"])

bench(
	"bench call single stat",
	() => {
		return "boofoozoo".includes("foo")
	},
	fakeCallOptions
).mean([2, "ms"])

bench(
	"bench call mark",
	() => {
		return /.*foo.*/.test("boofoozoo")
	},
	fakeCallOptions
).mark({ mean: [2, "ms"], median: [2, "ms"] })

type MakeComplexType<S extends string> = S extends `${infer head}${infer tail}`
	? head | tail | MakeComplexType<tail>
	: S

bench("bench type", () => {
	return [] as any as MakeComplexType<"defenestration">
}).types([169, "instantiations"])

bench(
	"bench call and type",
	() => {
		return /.*foo.*/.test(
			"boofoozoo"
		) as any as MakeComplexType<"antidisestablishmenttarianism">
	},
	fakeCallOptions
)
	.mean([2, "ms"])
	.types([349, "instantiations"])
