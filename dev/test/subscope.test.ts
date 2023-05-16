import { suite, test } from "mocha"
import type { Space } from "../../src/main.js"
import { scope } from "../../src/main.js"
import { attest } from "../attest/main.js"

suite("subscopes", () => {
    test("base", () => {
        const sub = scope({ alias: "number" }).compile()
        const types = scope({
            a: "string",
            b: "sub.alias",
            sub
        }).compile()
        attest(types).typed as Space<{
            a: string
            b: number
            sub: {
                alias: number
            }
        }>
    })
})
