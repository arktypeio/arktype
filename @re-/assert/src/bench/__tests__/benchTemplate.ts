import { ListPossibleTypes, StringReplace } from "@re-/tools"
import { Type } from "ts-morph"
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

type MakeComplexType<S extends string> = ListPossibleTypes<
    StringReplace<keyof Type, "e", S>
>

bench("bench type", () => {
    return [] as any as MakeComplexType<"!">
}).type()

bench(
    "bench call and type",
    () => {
        return /.*foo.*/.test("boofoozoo") as any as MakeComplexType<"?">
    },
    fakeCallOptions
)
    .mean()
    .type()
