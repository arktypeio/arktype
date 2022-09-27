import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../../api.js"
import { unresolvableMessage } from "../../../operand/unenclosed.js"
import { expressionExpectedMessage } from "../../../state/state.js"

describe("intersection", () => {
    describe("parse", () => {
        test("two types", () => {
            const booleanAndTrue = type("boolean&true")
            assert(booleanAndTrue.ast).narrowedValue(["boolean", "&", "true"])
        })
        test("several types", () => {
            assert(type("unknown&boolean&false").ast).narrowedValue([
                ["unknown", "&", "boolean"],
                "&",
                "false"
            ])
        })
        describe("errors", () => {
            test("bad reference", () => {
                // @ts-expect-error
                assert(() => type("boolean&tru")).throwsAndHasTypeError(
                    unresolvableMessage("tru")
                )
            })
            test("double and", () => {
                // @ts-expect-error
                assert(() => type("boolean&&true")).throwsAndHasTypeError(
                    expressionExpectedMessage("&true")
                )
            })
        })
    })
})
