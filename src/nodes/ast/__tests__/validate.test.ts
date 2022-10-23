import { assert } from "@arktype/check"
import { describe, test } from "mocha"
import { type } from "../../../type.js"

import {
    buildIndivisibleMessage,
    buildUnboundableMessage
} from "../validate.js"

describe("validate", () => {
    describe("bound", () => {
        test("number", () => {
            assert(type("number==-3.14159").ast).narrowedValue([
                "number",
                "==",
                "-3.14159"
            ])
        })
        test("string", () => {
            assert(type("string<=5").ast).narrowedValue(["string", "<=", "5"])
        })
        test("array", () => {
            assert(type("87<=boolean[]<89").ast).narrowedValue([
                "87",
                "<=",
                [["boolean", "[]"], "<", "89"]
            ])
        })
        test("any", () => {
            assert(type("any>5").ast).narrowedValue(["any", ">", "5"])
        })
        describe("errors", () => {
            test("unboundable", () => {
                // @ts-expect-error
                assert(() => type("unknown<10")).throwsAndHasTypeError(
                    buildUnboundableMessage("unknown")
                )
            })
            // Note: Bounding a number literal results in a syntax error and is
            // tested alongside other bound parse errors
            test("string literal", () => {
                // @ts-expect-error
                assert(() => type("1<'foo'<10")).throwsAndHasTypeError(
                    buildUnboundableMessage("'foo'")
                )
            })
        })
    })
    describe("divisibility", () => {
        test("number", () => {
            assert(type("number%2").ast).narrowedValue(["number", "%", "2"])
        })
        test("any", () => {
            assert(type("any%1").ast).narrowedValue(["any", "%", "1"])
        })
        describe("errors", () => {
            test("indivisible", () => {
                // @ts-expect-error
                assert(() => type("unknown%2")).throwsAndHasTypeError(
                    buildIndivisibleMessage("unknown")
                )
            })
            test("number literal", () => {
                // @ts-expect-error
                assert(() => type("5%10")).throwsAndHasTypeError(
                    buildIndivisibleMessage("5")
                )
            })
        })
    })
})
