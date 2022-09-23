import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../index.js"
import { incompleteTokenMessage } from "../list.js"

describe("parse list", () => {
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
