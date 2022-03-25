import { testArrowFunction } from "./arrowFunction.assert.js"
import { testConstraint } from "./constraint.assert.js"
import { testList } from "./list.assert.js"
import { testUnion } from "./union.assert.js"

export const testExpression = () => {
    describe("arrow function", testArrowFunction)
    describe("list", testList)
    describe("constraint", testConstraint)
    describe("union", testUnion)
}
