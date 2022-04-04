import { testExpression } from "../fragment/expression/__tests__/index.js"
import { testReference } from "../fragment/reference/__tests__/index.js"
import { testModification } from "../modification/__tests__/index.js"
import { testIntegration } from "./integration.assert.js"

export const testStr = () => {
    describe("expression", testExpression)
    describe("reference", testReference)
    describe("modification", testModification)
    describe("integration", testIntegration)
}
