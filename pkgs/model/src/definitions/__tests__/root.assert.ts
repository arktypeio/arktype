import { assert } from "@re-/assert"
import { create as create } from "@re-/model"
import { definitionTypeErrorTemplate } from "../internal.js"
import { testObj } from "../obj/__tests__/index.js"
import { testPrimitive } from "../primitive/__tests__/index.js"
import { testStr } from "../str/__test__/index.js"

describe("root", () => {
    describe("str", testStr)
    describe("primitive", testPrimitive)
    describe("obj", testObj)
    test("bad type def type", () => {
        // @ts-expect-error
        assert(() => define({ bad: Symbol() })).throwsAndHasTypeError(
            definitionTypeErrorTemplate
        )
        // @ts-expect-error
        assert(() => define({ bad: () => {} })).throwsAndHasTypeError(
            definitionTypeErrorTemplate
        )
    })
})
