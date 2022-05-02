import { testExpression } from "../expression/__tests__/index.js"
import { testReference } from "../reference/__tests__/index.js"
import { testIntegration } from "./integration.assert.js"
import { testOptional } from "./optional.assert.js"

export const testStr = () => {
    describe("expression", testExpression)
    describe("reference", testReference)
    describe("optional", testOptional)
    describe("integration", testIntegration)
}
