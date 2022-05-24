import { assert } from "@re-/assert"
import { model } from "@re-/model"
import { definitionTypeErrorTemplate } from "../../internal.js"

describe("root definition", () => {
    test("bad type def type", () => {
        // @ts-expect-error
        assert(() => model({ bad: Symbol() })).throwsAndHasTypeError(
            definitionTypeErrorTemplate
        )
        // @ts-expect-error
        assert(() => model({ bad: () => ({}) })).throwsAndHasTypeError(
            definitionTypeErrorTemplate
        )
    })
})
