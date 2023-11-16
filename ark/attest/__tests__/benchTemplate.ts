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
).median()

bench(
	"bench call single stat",
	() => {
		return "boofoozoo".includes("foo")
	},
	fakeCallOptions
).mean()

bench(
	"bench call mark",
	() => {
		return /.*foo.*/.test("boofoozoo")
	},
	fakeCallOptions
).mark()

type makeComplexType<S extends string> = S extends `${infer head}${infer tail}`
	? head | tail | makeComplexType<tail>
	: S

bench("bench type", () => {
	return {} as makeComplexType<"defenestration">
}).types()

bench(
	"bench call and type",
	() => {
		return {} as makeComplexType<"antidisestablishmentarianism">
	},
	fakeCallOptions
)
	.mean()
	.types()
