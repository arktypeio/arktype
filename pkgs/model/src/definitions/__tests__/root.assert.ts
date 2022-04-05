import { assert } from "@re-/assert"
import { create } from "@re-/model"
import { definitionTypeErrorTemplate } from "../internal.js"
import { testObj } from "../obj/__tests__/index.js"
import { testPrimitive } from "../primitive/__tests__/index.js"
import { testStr } from "../str/__test__/index.js"

describe("root", () => {
    describe("str", testStr)
    describe("literal", testPrimitive)
    describe("obj", testObj)
    test("bad type def type", () => {
        // @ts-expect-error
        assert(() => create({ bad: Symbol() })).throwsAndHasTypeError(
            definitionTypeErrorTemplate
        )
        // @ts-expect-error
        assert(() => create({ bad: () => {} })).throwsAndHasTypeError(
            definitionTypeErrorTemplate
        )
    })
})
