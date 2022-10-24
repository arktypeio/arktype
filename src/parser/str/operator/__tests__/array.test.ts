import { describe, test } from "mocha"
import { type } from "../../../../api.js"
import { ArrayOperator } from "../array.js"
import { assert } from "#testing"

describe("parse array", () => {
    test("parse", () => {
        assert(type("string[]").ast).narrowedValue(["string", "[]"])
    })
    describe("errors", () => {
        test("incomplete token", () => {
            // @ts-expect-error
            assert(() => type("string[")).throwsAndHasTypeError(
                ArrayOperator.incompleteTokenMessage
            )
        })
    })
})
