import { testConstraint } from "./constraint.assert.js"
import { testIntersection } from "./intersection.assert.js"
import { testList } from "./list.assert.js"
import { testUnion } from "./union.assert.js"

export const testExpression = () => {
    describe("list", testList)
    describe("constraint", testConstraint)
    describe("intersection", testIntersection)
    describe("union", testUnion)
}
