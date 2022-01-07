import { testArrowFunction } from "./arrowFunction.assert.js"
import { testList } from "./list.assert.js"

describe("expression", () => {
    describe("arrow function", testArrowFunction)
    describe("list", testList)
})
