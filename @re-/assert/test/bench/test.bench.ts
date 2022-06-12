import { ListPossibleTypes, StringReplace } from "@re-/tools"
import { Type } from "ts-morph"
import { bench } from "#src"

bench("bench call single stat", () => {
    return "boofoozoo".includes("foo")
}).median("47.00ns")

bench("bench call mark", () => {
    return /.*foo.*/.test("boofoozoo")
}).mark({ mean: "71.72ns", median: "59.00ns" })

type MakeComplexType<S extends string> = ListPossibleTypes<
    StringReplace<keyof Type, "e", S>
>

// Complex type returned directly
bench("bench type", () => {
    return [] as any as MakeComplexType<"!">
}).type.mean("177.46ms")

// Complex type as an intermediate value (results should be similar to above)
bench("bench unreturned type", () => {
    const doNothing = () => {}
    const f = [] as any as MakeComplexType<"!">
    return {}
})
    .type()
    .mark({ mean: "184.99ms", median: "184.58ms" })

// Type should be similar to above, call should be similar to includes
bench("chained call and type assertion", () => {
    const f = [] as any as MakeComplexType<"!">
    return "boofoozoo".includes("foo")
})
    .median("48.00ns")
    .type()
    .median("163.36ms")

// Should be very fast
bench(
    "until conditions",
    () => {
        return "boofoozoo".includes("foo")
    },
    { until: { count: 100 } }
)
    .mean("578.77ns")
    .type({ until: { ms: 500 } })
    .mean("70.54us")
