import { ListPossibleTypes, StringReplace } from "@re-/tools"
import { Type, Node } from "ts-morph"
import { bench } from "../index.js"

// bench("includes", () => {
//     return "boofoozoo".includes("foo")
// }).median("45.00ns")

// bench("includes", () => {
//     return "boofoozoo".includes("foo")
// }).mark({ mean: "61.23ns", median: "48.00ns" })

// bench("regex", () => {
//     return /.*foo.*/.test("boofoozoo")
// }).mean("83.22ns")

// bench("regex", () => {
//     return /.*foo.*/.test("boofoozoo")
// }).mark({ mean: "84.83ns", median: "63.00ns" })

type GetChars<S extends string> = StringReplace<S, "a", "!">

type Z = ListPossibleTypes<GetChars<keyof Type>>

bench("regex", () => {
    const f = {} as any as Z
    return f
})
    .mean("38.46ns")
    .type({ until: { ms: 10000 } })
    .median("753.75ms")

bench("regex2", () => {
    const zyv = {} as any as ListPossibleTypes<
        StringReplace<keyof Type, "e", "?">
    >
    return zyv
}).type.mark({ mean: "173.61ms", median: "170.51ms" })

// bench("long running function", () => {})
//     .call({ until: { count: 1000 } })
//     .mean("74.4ns")

// bench("my complex type", () => {
//     const f = [] as any as ListPossibleTypes<keyof Window>
// }).type("74ns")

// bench("my complex typed long running function", () => {
//     const f = [] as any as ListPossibleTypes<keyof Window>
// })
//     .call.mean("74.4ns")
//     .type("74.4ns")
