import { testArrowFunction } from "./arrowFunction.assert.js"
import { testList } from "./list.assert.js"
import { testUnion } from "./union.assert.js"

describe("expression", () => {
    describe("arrow function", testArrowFunction)
    describe("list", testList)
    describe("union", testUnion)
})
