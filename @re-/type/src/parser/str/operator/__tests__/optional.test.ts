import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../api.js"
import { Unenclosed } from "../../operand/unenclosed.js"
import { OptionalOperator } from "../optional.js"

describe("parse optional", () => {
    test("valid", () => {
        assert(type("object?").ast).narrowedValue(["object", "?"])
    })
    describe("errors", () => {
        test("bad inner type", () => {
            // @ts-expect-error
            assert(() => type("nonexistent?")).throwsAndHasTypeError(
                Unenclosed.buildUnresolvableMessage("nonexistent")
            )
        })
        test("non-suffix", () => {
            // @ts-expect-error
            assert(() => type("number?|string?")).throwsAndHasTypeError(
                OptionalOperator.nonTerminatingMessage
            )
        })
        test("multiple suffix", () => {
            // @ts-expect-error
            assert(() => type("boolean??")).throwsAndHasTypeError(
                OptionalOperator.nonTerminatingMessage
            )
        })
    })
})
