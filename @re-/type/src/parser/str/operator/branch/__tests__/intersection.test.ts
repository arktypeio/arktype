import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../../index.js"
import { expressionExpectedMessage } from "../../../operand/common.js"
import { unresolvableMessage } from "../../../operand/unenclosed.js"

describe("intersection", () => {
    describe("parse", () => {
        test("inference", () => {
            assert(type("boolean&true").infer).typed as true
            assert(type("number&1&unknown").infer).typed as 1
            assert(type("true&false").infer).typed as never
        })
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
