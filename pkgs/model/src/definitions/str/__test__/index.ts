import { testStr } from "./str.assert.js"
import { testExpression } from "../expression/__tests__"
import { testBuiltin } from "../builtin/__tests__"
import { testModifier } from "../modifier/__tests__"

describe("str", () => {
    describe("str", testStr)
    describe("expression", testExpression)
    describe("builtin", testBuiltin)
    describe("modifier", testModifier)
})
