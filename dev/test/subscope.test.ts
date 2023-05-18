import { suite, test } from "mocha"
import type { Space } from "../../src/main.js"
import { scope, type } from "../../src/main.js"
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
            sub: Space<{
                alias: number
            }>
        }>
        attest(types.sub.alias.infer).typed as number
        const expected = type("number").root
        attest(types.sub.alias.root).is(expected)
        attest(types.b.root).is(expected)
    })
})
