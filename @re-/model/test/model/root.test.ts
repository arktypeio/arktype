import { assert } from "@re-/assert"
import { eager } from "../../src/index.js"

describe("root definition", () => {
    it("bad type def type", () => {
        // @ts-expect-error
        assert(() => eager({ bad: Symbol() })).throwsAndHasTypeError(
            /[Vv]alues of type symbol are not valid definitions/
        )
        // @ts-expect-error
        assert(() => eager({ bad: () => ({}) })).throwsAndHasTypeError(
            /[Vv]alues of type function are not valid definitions/
        )
    })
})
