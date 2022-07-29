import { ListPossibleTypes, StringReplace } from "@re-/tools"
import { Type } from "ts-morph"
import { bench } from "../../index.js"

const fakeCallOptions = { until: { count: 2 }, fakeCallMs: "count" }

bench(
    "bench call single stat",
    () => {
        return "boofoozoo".includes("foo")
    },
    fakeCallOptions
).median(`2.00ms`)

bench(
    "bench call single stat",
    () => {
        return "boofoozoo".includes("foo")
    },
    fakeCallOptions
).mean(`2.00ms`)

bench(
    "bench call mark",
    () => {
        return /.*foo.*/.test("boofoozoo")
    },
    fakeCallOptions
).mark({ mean: `2.00ms`, median: `2.00ms` })

type MakeComplexType<S extends string> = ListPossibleTypes<
    StringReplace<keyof Type, "e", S>
>

bench("bench type", () => {
    return [] as any as MakeComplexType<"!">
}).type(`51255 instantiations`)

bench(
    "bench call and type",
    () => {
        return /.*foo.*/.test("boofoozoo") as any as MakeComplexType<"?">
    },
    fakeCallOptions
)
    .mean(`2.00ms`)
    .type(`51255 instantiations`)
