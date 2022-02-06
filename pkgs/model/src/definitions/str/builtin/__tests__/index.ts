import { testBigintLiteral } from "./bigintLiteral.assert.js"
import { testNumberLiteral } from "./numberLiteral.assert.js"
import { testStringLiteral } from "./stringLiteral.assert.js"
import { testKeyword } from "./keyword.assert.js"

export const testBuiltin = () => {
    describe("builtin", () => {
        describe("literal", () => {
            describe("string", testStringLiteral)
            describe("number", testNumberLiteral)
            describe("bigint", testBigintLiteral)
        })
        describe("keyword", testKeyword)
    })
}
