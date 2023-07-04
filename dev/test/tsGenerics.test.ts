import { attest } from "@arktype/attest"
import { arktypes, scope } from "arktype"
import { suite, test } from "mocha"

suite("tsGenerics", () => {
    // test("in scope", () => {
    //     const types = scope({
    //         t: "Record<string, number>"
    //     }).export()
    //     attest(types.t.infer).typed as Record<string, number>
    // })
    // test("in module", () => {
    //     const t = arktypes.Record("string", "number")
    //     attest(t.infer).typed as Record<string, number>
    // })
})
