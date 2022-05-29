import { ListPossibleTypes } from "@re-/tools"
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

type GetChars<S> = S extends `${infer First}${infer Second}`
    ? GetChars<First> | GetChars<Second>
    : S

type Z = ListPossibleTypes<keyof Window>

bench("regex", () => {
    const zyv = {} as any as Z
    return zyv
}).type("53.22ms")

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
