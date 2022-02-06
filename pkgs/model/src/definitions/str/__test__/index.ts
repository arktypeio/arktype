import { testExpression } from "../expression/__tests__"
import { testBuiltin } from "../builtin/__tests__"
import { testModifier } from "../modifier/__tests__"
import { testIntegration } from "./integration.assert.js"

export const testStr = () => {
    describe("expression", testExpression)
    describe("builtin", testBuiltin)
    describe("modifier", testModifier)
    describe("integration", testIntegration)
}
