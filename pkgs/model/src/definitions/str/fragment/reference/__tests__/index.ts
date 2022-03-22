import { testBigintLiteral } from "./bigintLiteral.assert.js"
import { testNumberLiteral } from "./numberLiteral.assert.js"
import { testStringLiteral } from "./stringLiteral.assert.js"
import { testKeyword } from "./keyword.assert.js"
import { testRegex } from "./regex.assert.js"
import { testAlias } from "./alias.assert.js"

export const testBuiltin = () => {
    describe("literal", () => {
        describe("string", testStringLiteral)
        describe("number", testNumberLiteral)
        describe("bigint", testBigintLiteral)
    })
    describe("keyword", testKeyword)
    describe("regex", testRegex)
    describe("alias", testAlias)
}
