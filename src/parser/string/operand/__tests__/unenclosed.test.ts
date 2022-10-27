import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { space } from "../../../../space.js"
import { type } from "../../../../type.js"
import { buildMalformedNumericLiteralMessage } from "../numeric.js"
import { Unenclosed } from "../unenclosed.js"

describe("parse unenclosed", () => {
    describe("identifier", () => {
        test("keyword", () => {
            attest(type("string").ast).narrowedValue("string")
        })
        test("alias", () => {
            const types = space({ a: "string" })
            const a = type("a", { space: types })
            attest(a.ast).narrowedValue("a")
        })
        describe("errors", () => {
            test("unresolvable", () => {
                // @ts-expect-error
                attest(() => type("HUH")).throwsAndHasTypeError(
                    Unenclosed.buildUnresolvableMessage("HUH")
                )
            })
        })
    })
    describe("number", () => {
        describe("positive", () => {
            test("whole", () => {
                attest(type("4").ast).narrowedValue(4)
            })
            test("decimal", () => {
                attest(type("3.14159").ast).narrowedValue(3.14159)
            })
            test("decimal with zero whole portion", () => {
                attest(type("0.5").ast).narrowedValue(0.5)
            })
        })
        describe("negative", () => {
            test("whole", () => {
                attest(type("-12").ast).narrowedValue(-12)
            })
            test("decimal", () => {
                attest(type("-1.618").ast).narrowedValue(-1.618)
            })
            test("decimal with zero whole portion", () => {
                attest(type("-0.001").ast).narrowedValue(-0.001)
            })
        })
        test("zero", () => {
            attest(type("0").ast).narrowedValue(0)
        })
        describe("errors", () => {
            test("multiple decimals", () => {
                // @ts-expect-error
                attest(() => type("127.0.0.1")).throwsAndHasTypeError(
                    Unenclosed.buildUnresolvableMessage("127.0.0.1")
                )
            })
            test("with alpha", () => {
                // @ts-expect-error
                attest(() => type("13three7")).throwsAndHasTypeError(
                    Unenclosed.buildUnresolvableMessage("13three7")
                )
            })

            test("leading zeroes", () => {
                // @ts-expect-error
                attest(() => type("010")).throwsAndHasTypeError(
                    buildMalformedNumericLiteralMessage("010", "number")
                )
            })
            test("trailing zeroes", () => {
                // @ts-expect-error
                attest(() => type("4.0")).throwsAndHasTypeError(
                    buildMalformedNumericLiteralMessage("4.0", "number")
                )
            })
            test("negative zero", () => {
                // @ts-expect-error
                attest(() => type("-0")).throwsAndHasTypeError(
                    buildMalformedNumericLiteralMessage("-0", "number")
                )
            })
        })
    })
    describe("bigint", () => {
        test("positive", () => {
            // Is prime :D
            attest(type("12345678910987654321n").ast).narrowedValue(
                12345678910987654321n
            )
        })
        test("negative", () => {
            attest(type("-9801n").ast).narrowedValue(-9801n)
        })
        test("zero", () => {
            attest(type("0n").ast).narrowedValue(0n)
        })
        describe("errors", () => {
            test("decimal", () => {
                // @ts-expect-error
                attest(() => type("999.1n")).throwsAndHasTypeError(
                    Unenclosed.buildUnresolvableMessage("999.1n")
                )
            })

            test("leading zeroes", () => {
                // TS currently doesn't try to infer this as bigint even
                // though it matches our rules for a "malformed" integer.
                // @ts-expect-error
                attest(() => type("007n"))
                    .throws(
                        buildMalformedNumericLiteralMessage("007n", "bigint")
                    )
                    .type.errors(Unenclosed.buildUnresolvableMessage("007n"))
            })
            test("negative zero", () => {
                // @ts-expect-error
                attest(() => type("-0n")).throwsAndHasTypeError(
                    buildMalformedNumericLiteralMessage("-0n", "bigint")
                )
            })
        })
    })
})
