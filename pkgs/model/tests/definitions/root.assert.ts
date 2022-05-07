import { assert } from "@re-/assert"
import { model } from "@re-/model"
import { definitionTypeErrorTemplate } from "../../src/internal.js"
import { testObj } from "./obj/index.js"
import { testLiteral } from "./literal/index.js"
import { testStr } from "./str/index.js"

describe("root", () => {
    describe("str", testStr)
    describe("literal", testLiteral)
    describe("obj", testObj)
    test("bad type def type", () => {
        // @ts-expect-error
        assert(() => model({ bad: Symbol() })).throwsAndHasTypeError(
            definitionTypeErrorTemplate
        )
        // @ts-expect-error
        assert(() => model({ bad: () => {} })).throwsAndHasTypeError(
            definitionTypeErrorTemplate
        )
    })
})
