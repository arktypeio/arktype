import type { ListPossibleTypes, StringReplace } from "@re-/tools"
import type { Type } from "ts-morph"
import { bench } from "../../index.js"

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

type MakeComplexType<S extends string> = ListPossibleTypes<
    StringReplace<keyof Type, "e", S>
>

bench("bench type", () => {
    return [] as any as MakeComplexType<"!">
}).type([45763, "instantiations"])

bench(
    "bench call and type",
    () => {
        return /.*foo.*/.test("boofoozoo") as any as MakeComplexType<"?">
    },
    fakeCallOptions
)
    .mean([2, "ms"])
    .type([45763, "instantiations"])
