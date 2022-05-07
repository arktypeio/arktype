import { testConstraint } from "./constraint.assert.js"
import { testIntersection } from "./intersection.assert.js"
import { testList } from "./list.assert.js"
import { testUnion } from "./union.assert.js"
import { testBigintLiteral } from "./bigintLiteral.assert.js"
import { testNumberLiteral } from "./numberLiteral.assert.js"
import { testStringLiteral } from "./stringLiteral.assert.js"
import { testKeyword } from "./keyword.assert.js"
import { testRegex } from "./regex.assert.js"
import { testAlias } from "./alias.assert.js"
import { testIntegration } from "./integration.assert.js"
import { testOptional } from "./optional.assert.js"

export const testStr = () => {
    describe("list", testList)
    describe("constraint", testConstraint)
    describe("intersection", testIntersection)
    describe("union", testUnion)
    describe("literal", () => {
        describe("string", testStringLiteral)
        describe("number", testNumberLiteral)
        describe("bigint", testBigintLiteral)
    })
    describe("keyword", testKeyword)
    describe("regex", testRegex)
    describe("alias", testAlias)
    describe("optional", testOptional)
    describe("integration", testIntegration)
}
