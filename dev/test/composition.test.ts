import { attest } from "@arktype/attest"
import { type } from "arktype"
import { suite, test } from "mocha"

suite("composition", () => {
    test("referenced type", () => {
        const a = type("string")
        const t = type({
            a
        })
        attest(t.infer).typed as { a: string }
    })

    test("inline type", () => {
        const t = type({
            a: type("string")
        })
        attest(t.infer).typed as { a: string }
    })
})
