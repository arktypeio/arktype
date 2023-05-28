import { suite, test } from "mocha"
import type { Scope, Space } from "../../src/main.js"
import { scope, type } from "../../src/main.js"
import type { Ark } from "../../src/scopes/ark.js"
import { attest } from "../attest/main.js"

suite("subscopes", () => {
    test("base", () => {
        const sub = scope({ alias: "number", another: "boolean" })

        const types = scope({
            a: "string",
            b: "sub.alias",
            sub
        }).compile()

        attest(types).typed as Space<{
            a: string
            b: number
            sub: Scope<
                {
                    alias: number
                },
                {},
                Ark
            >
        }>
        attest(types.sub.alias.infer).typed as number
        const expected = type("number").condition
        attest(types.sub.alias.condition).is(expected)
        attest(types.b.condition).is(expected)
    })
})
