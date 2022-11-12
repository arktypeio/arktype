import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { scope, type } from "../api.js"
import { buildUnresolvableMessage } from "../src/parse/shift/operand/unenclosed.js"
import { buildMalformedNumericLiteralMessage } from "../src/utils/numericLiterals.js"

describe("parse unenclosed", () => {
    describe("identifier", () => {
        test("keyword", () => {
            attest(type("string").infer).typed as "string"
        })
        test("alias", () => {
            const a = type("a", { scope: scope({ a: "string" }) })
            attest(a.infer).typed as string
        })
        describe("errors", () => {
            test("unresolvable", () => {
                // @ts-expect-error
                attest(() => type("HUH")).throwsAndHasTypeError(
                    buildUnresolvableMessage("HUH")
                )
            })
        })
    })
    describe("number", () => {
        describe("positive", () => {
            test("whole", () => {
                attest(type("4").infer).typed as 4
            })
            test("decimal", () => {
                attest(type("3.14159").infer).typed as 3.14159
            })
            test("decimal with zero whole portion", () => {
                attest(type("0.5").infer).typed as 0.5
            })
        })
        describe("negative", () => {
            test("whole", () => {
                attest(type("-12").infer).typed as -12
            })
            test("decimal", () => {
                attest(type("-1.618").infer).typed as -1.618
            })
            test("decimal with zero whole portion", () => {
                attest(type("-0.001").infer).typed as -0.001
            })
        })
        test("zero", () => {
            attest(type("0").infer).typed as 0
        })
        describe("errors", () => {
            test("multiple decimals", () => {
                // @ts-expect-error
                attest(() => type("127.0.0.1")).throwsAndHasTypeError(
                    buildUnresolvableMessage("127.0.0.1")
                )
            })
            test("with alpha", () => {
                // @ts-expect-error
                attest(() => type("13three7")).throwsAndHasTypeError(
                    buildUnresolvableMessage("13three7")
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
            attest(type("12345678910987654321n").infer)
                .typed as 12345678910987654321n
        })
        test("negative", () => {
            attest(type("-9801n").infer).typed as -9801n
        })
        test("zero", () => {
            attest(type("0n").infer).typed as 0n
        })
        describe("errors", () => {
            test("decimal", () => {
                // @ts-expect-error
                attest(() => type("999.1n")).throwsAndHasTypeError(
                    buildUnresolvableMessage("999.1n")
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
                    .type.errors(buildUnresolvableMessage("007n"))
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
