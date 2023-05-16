import { suite, test } from "mocha"
import type { Space } from "../../src/main.js"
import { scope } from "../../src/main.js"
import { attest } from "../attest/main.js"

suite("subscopes", () => {
    test("base", () => {
        const $ = scope({
            a: "string",
            b: scope({ nested: "boolean" }).compile(),
            c: "b.nested"
        })
        const types = $.compile()
        attest(types).typed as Space<{
            a: string
            b: Space<{
                nested: boolean
            }>
            c: boolean
        }>
    })
})
