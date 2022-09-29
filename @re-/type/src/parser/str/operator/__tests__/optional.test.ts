import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../../api.js"
import { unresolvableMessage } from "../../../operand/unenclosed.js"
import { nonTerminatingOptionalMessage } from "../../optional.js"

describe("parse optional", () => {
    test("valid", () => {
        assert(type("object?").ast).narrowedValue(["object", "?"])
    })
    describe("errors", () => {
        test("bad inner type", () => {
            // @ts-expect-error
            assert(() => type("nonexistent?")).throwsAndHasTypeError(
                unresolvableMessage("nonexistent")
            )
        })
        test("non-suffix", () => {
            // @ts-expect-error
            assert(() => type("number?|string?")).throwsAndHasTypeError(
                nonTerminatingOptionalMessage
            )
        })
        test("multiple suffix", () => {
            // @ts-expect-error
            assert(() => type("boolean??")).throwsAndHasTypeError(
                nonTerminatingOptionalMessage
            )
        })
    })
})
