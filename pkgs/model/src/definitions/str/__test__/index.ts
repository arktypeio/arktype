import { testExpression } from "../fragment/expression/__tests__/index.js"
import { testBuiltin } from "../fragment/reference/__tests__/index.js"
import { testModifier } from "../modification/__tests__/index.js"
import { testAlias } from "../fragment/alias/__tests__/index.js"
import { testIntegration } from "./integration.assert.js"

export const testStr = () => {
    describe("alias", testAlias)
    describe("expression", testExpression)
    describe("builtin", testBuiltin)
    describe("modifier", testModifier)
    describe("integration", testIntegration)
}
