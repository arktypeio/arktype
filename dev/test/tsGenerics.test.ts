import { suite, test } from "mocha"
import { arktypes, scope } from "../../src/main.js"
import { attest } from "../attest/main.js"

suite("tsGenerics", () => {
    test("in scope", () => {
        const types = scope({
            t: "Record<string, number>"
        }).export()
        attest(types.t.infer).typed as Record<string, number>
    })
    // test("in typeset", () => {
    //     const t = arktypes.Record("string", "number")
    //     attest(t.infer).typed as Record<string, number>
    // })
})
