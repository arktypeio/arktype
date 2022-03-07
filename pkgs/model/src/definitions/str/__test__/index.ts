import { testExpression } from "../expression/__tests__/index.js"
import { testBuiltin } from "../builtin/__tests__/index.js"
import { testModifier } from "../modifier/__tests__/index.js"
import { testAlias } from "../alias/__tests__/index.js"
import { testIntegration } from "./integration.assert.js"

export const testStr = () => {
    describe("alias", testAlias)
    describe("expression", testExpression)
    describe("builtin", testBuiltin)
    describe("modifier", testModifier)
    describe("integration", testIntegration)
}
