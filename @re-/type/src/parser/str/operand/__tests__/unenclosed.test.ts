import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { space } from "../../../../space.js"
import { type } from "../../../../type.js"
import { buildMalformedNumericLiteralMessage } from "../numeric.js"
import { Unenclosed } from "../unenclosed.js"

describe("parse unenclosed", () => {
    describe("identifier", () => {
        test("keyword", () => {
            assert(type("string").toAst()).narrowedValue("string")
        })
        test("alias", () => {
            assert(space({ a: "string" }).$.type("a").toAst()).narrowedValue(
                "a"
            )
        })
        describe("errors", () => {
            test("unresolvable", () => {
                // @ts-expect-error
                assert(() => type("HUH")).throwsAndHasTypeError(
                    Unenclosed.buildUnresolvableMessage("HUH")
                )
            })
        })
    })
    describe("number", () => {
        describe("positive", () => {
            test("whole", () => {
                assert(type("4").toAst()).narrowedValue("4")
            })
            test("decimal", () => {
                assert(type("3.14159").toAst()).narrowedValue("3.14159")
            })
            test("decimal with zero whole portion", () => {
                assert(type("0.5").toAst()).narrowedValue("0.5")
            })
        })
        describe("negative", () => {
            test("whole", () => {
                assert(type("-12").toAst()).narrowedValue("-12")
            })
            test("decimal", () => {
                assert(type("-1.618").toAst()).narrowedValue("-1.618")
            })
            test("decimal with zero whole portion", () => {
                assert(type("-0.001").toAst()).narrowedValue("-0.001")
            })
        })
        test("zero", () => {
            assert(type("0").toAst()).narrowedValue("0")
        })
        describe("errors", () => {
            test("multiple decimals", () => {
                // @ts-expect-error
                assert(() => type("127.0.0.1")).throwsAndHasTypeError(
                    Unenclosed.buildUnresolvableMessage("127.0.0.1")
                )
            })
            test("with alpha", () => {
                // @ts-expect-error
                assert(() => type("13three7")).throwsAndHasTypeError(
                    Unenclosed.buildUnresolvableMessage("13three7")
                )
            })

            test("leading zeroes", () => {
                // @ts-expect-error
                assert(() => type("010")).throwsAndHasTypeError(
                    buildMalformedNumericLiteralMessage("010", "number")
                )
            })
            test("trailing zeroes", () => {
                // @ts-expect-error
                assert(() => type("4.0")).throwsAndHasTypeError(
                    buildMalformedNumericLiteralMessage("4.0", "number")
                )
            })
            test("negative zero", () => {
                // @ts-expect-error
                assert(() => type("-0")).throwsAndHasTypeError(
                    buildMalformedNumericLiteralMessage("-0", "number")
                )
            })
        })
    })
    describe("bigint", () => {
        test("positive", () => {
            // Is prime :D
            assert(type("12345678910987654321n").toAst()).narrowedValue(
                "12345678910987654321n"
            )
        })
        test("negative", () => {
            assert(type("-9801n").toAst()).narrowedValue("-9801n")
        })
        test("zero", () => {
            assert(type("0n").toAst()).narrowedValue("0n")
        })
        describe("errors", () => {
            test("decimal", () => {
                // @ts-expect-error
                assert(() => type("999.1n")).throwsAndHasTypeError(
                    Unenclosed.buildUnresolvableMessage("999.1n")
                )
            })

            test("leading zeroes", () => {
                // TS currently doesn't try to infer this as bigint even
                // though it matches our rules for a "malformed" integer.
                // @ts-expect-error
                assert(() => type("007n"))
                    .throws(
                        buildMalformedNumericLiteralMessage("007n", "bigint")
                    )
                    .type.errors(Unenclosed.buildUnresolvableMessage("007n"))
            })
            test("negative zero", () => {
                // @ts-expect-error
                assert(() => type("-0n")).throwsAndHasTypeError(
                    buildMalformedNumericLiteralMessage("-0n", "bigint")
                )
            })
        })
    })
})
