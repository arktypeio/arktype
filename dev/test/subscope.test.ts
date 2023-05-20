import { suite, test } from "mocha"
import type { Space, Type } from "../../src/main.js"
import { scope, type } from "../../src/main.js"
import type { Ark } from "../../src/scopes/ark.js"
import { attest } from "../attest/main.js"

suite("subscopes", () => {
    test("base", () => {
        const sub = scope({ alias: "number", another: "boolean" }).compile()

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
    test("object with type values not treated as space", () => {
        const types = scope({ notASpace: { a: type("string") } }).compile()
        attest(types.notASpace).typed as Type<{ a: string }, Ark>
    })
})
