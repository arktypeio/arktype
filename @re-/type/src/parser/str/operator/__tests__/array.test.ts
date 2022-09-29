import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../api.js"
import { incompleteTokenMessage } from "../array.js"

describe("parse array", () => {
    test("parse", () => {
        assert(type("string[]").ast).narrowedValue(["string", "[]"])
    })
    describe("errors", () => {
        test("incomplete token", () => {
            // @ts-expect-error
            assert(() => type("string[")).throwsAndHasTypeError(
                incompleteTokenMessage
            )
        })
    })
})
