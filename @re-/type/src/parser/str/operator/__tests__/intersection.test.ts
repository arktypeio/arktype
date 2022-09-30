import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../api.js"
import { Unenclosed } from "../../operand/unenclosed.js"
import { scanner } from "../../state/scanner.js"

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
                    Unenclosed.unresolvableMessage("tru")
                )
            })
            test("double and", () => {
                // @ts-expect-error
                assert(() => type("boolean&&true")).throwsAndHasTypeError(
                    scanner.expressionExpectedMessage("&true")
                )
            })
        })
    })
})
