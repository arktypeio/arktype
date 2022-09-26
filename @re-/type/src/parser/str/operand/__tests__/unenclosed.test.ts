import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { space } from "../../../../space/root.js"
import { type } from "../../../../type.js"
import { unresolvableMessage } from "../unenclosed.js"

describe("parse unenclosed", () => {
    describe("identifier", () => {
        test("keyword", () => {
            assert(type("string").ast).narrowedValue("string")
        })
        test("alias", () => {
            assert(space({ a: "string" }).$root.type("a").ast).narrowedValue(
                "a"
            )
        })
        describe("errors", () => {
            test("unresolvable", () => {
                // @ts-expect-error
                assert(() => type("HUH")).throwsAndHasTypeError(
                    unresolvableMessage("HUH")
                )
            })
        })
    })
    describe("number", () => {
        describe("positive", () => {
            test("whole", () => {
                assert(type("4").ast).narrowedValue("4")
            })
            test("decimal", () => {
                assert(type("3.14159").ast).narrowedValue("3.14159")
            })
            test("decimal with zero whole portion", () => {
                assert(type("0.5").ast).narrowedValue("0.5")
            })
        })
        describe("negative", () => {
            test("whole", () => {
                assert(type("-12").ast).narrowedValue("-12")
            })
            test("decimal", () => {
                assert(type("-1.618").ast).narrowedValue("-1.618")
            })
            test("decimal with zero whole portion", () => {
                assert(type("-0.001").ast).narrowedValue("-0.001")
            })
        })
        test("zero", () => {
            assert(type("0").ast).narrowedValue("0")
        })
        describe("errors", () => {
            test("multiple decimals", () => {
                // @ts-expect-error
                assert(() => type("127.0.0.1")).throwsAndHasTypeError(
                    unresolvableMessage("127.0.0.1")
                )
            })
            test("with alpha", () => {
                // @ts-expect-error
                assert(() => type("13three7")).throwsAndHasTypeError(
                    unresolvableMessage("13three7")
                )
            })
            test("negative zero", () => {
                // TS won't complain about this, but it also won't infer the literal correctly, so we throw.
                assert(() => type("-0")).throws(unresolvableMessage("-0"))
            })
        })
    })
    describe("bigint", () => {
        test("positive", () => {
            // Is prime :D
            assert(type("12345678910987654321n").ast).narrowedValue(
                "12345678910987654321n"
            )
        })
        test("negative", () => {
            assert(type("-9801n").ast).narrowedValue("-9801n")
        })
        test("zero", () => {
            assert(type("0n").ast).narrowedValue("0n")
        })
        describe("errors", () => {
            test("decimal", () => {
                // @ts-expect-error
                assert(() => type("999.1n")).throwsAndHasTypeError(
                    unresolvableMessage("999.1n")
                )
            })
            test("negative zero", () => {
                // TS won't complain about this, but it also won't infer the literal correctly, so we throw.
                assert(() => type("-0n")).throws(unresolvableMessage("-0n"))
            })
        })
    })
})
