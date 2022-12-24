import { bench } from "../api.ts"

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

type MakeComplexType<S extends string> = S extends `${infer head}${infer tail}`
    ? head | tail | MakeComplexType<tail>
    : S

bench("bench type", () => {
    return [] as any as MakeComplexType<"defenestration">
}).type()

bench(
    "bench call and type",
    () => {
        return /.*foo.*/.test(
            "boofoozoo"
        ) as any as MakeComplexType<"antidisestablishmenttarianism">
    },
    fakeCallOptions
)
    .mean()
    .type()
