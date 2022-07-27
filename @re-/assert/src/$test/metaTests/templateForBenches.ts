import { ListPossibleTypes, StringReplace } from "@re-/tools"
import { Type } from "ts-morph"
import { bench } from "../../src/index.js"

//median
bench(
    "bench call single stat",
    () => {
        return "boofoozoo".includes("foo")
    },
    { until: { count: 2 } }
).median()

//mean
bench(
    "bench call single stat",
    () => {
        return "boofoozoo".includes("foo")
    },
    { until: { count: 2 } }
).mean()

//mark
bench(
    "bench call mark",
    () => {
        return /.*foo.*/.test("boofoozoo")
    },
    { until: { count: 2 } }
).mark()

type MakeComplexType<S extends string> = ListPossibleTypes<
    StringReplace<keyof Type, "e", S>
>

//type
bench("bench type", () => {
    return [] as any as MakeComplexType<"!">
}).type()

//callAndType
bench(
    "bench call and type",
    () => {
        return /.*foo.*/.test("boofoozoo") as any as MakeComplexType<"?">
    },
    { until: { count: 2 } }
)
    .mean()
    .type()
