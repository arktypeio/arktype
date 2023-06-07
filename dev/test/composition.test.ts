import { suite, test } from "mocha"
import { type } from "../../src/main.js"
import { attest } from "../attest/main.js"

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
