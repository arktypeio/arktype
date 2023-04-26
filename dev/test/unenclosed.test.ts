import { describe, it } from "mocha"
import { scope, type } from "../../src/main.js"
import { writeUnresolvableMessage } from "../../src/parse/string/shift/operand/unenclosed.js"
import { writeMalformedNumericLiteralMessage } from "../../src/utils/numericLiterals.js"
import { attest } from "../attest/main.js"

describe("parse unenclosed", () => {
    describe("identifier", () => {
        it("keyword", () => {
            attest(type("string").infer).typed as string
        })
        it("alias", () => {
            const a = scope({ a: "string" }).type("a")
            attest(a.infer).typed as string
        })
        describe("errors", () => {
            it("unresolvable", () => {
                // @ts-expect-error
                attest(() => type("HUH")).throwsAndHasTypeError(
                    writeUnresolvableMessage("HUH")
                )
            })
        })
    })
    describe("number", () => {
        describe("positive", () => {
            it("whole", () => {
                const four = type("4")
                attest(four.infer).typed as 4
                // attest(four.node).snap({ number: { value: 4 } })
            })
            it("decimal", () => {
                attest(type("3.14159").infer).typed as 3.14159
            })
            it("decimal with zero whole portion", () => {
                attest(type("0.5").infer).typed as 0.5
            })
        })
        describe("negative", () => {
            it("whole", () => {
                attest(type("-12").infer).typed as -12
            })
            it("decimal", () => {
                attest(type("-1.618").infer).typed as -1.618
            })
            it("decimal with zero whole portion", () => {
                attest(type("-0.001").infer).typed as -0.001
            })
        })
        it("zero", () => {
            attest(type("0").infer).typed as 0
        })
        describe("errors", () => {
            it("multiple decimals", () => {
                // @ts-expect-error
                attest(() => type("127.0.0.1")).throwsAndHasTypeError(
                    writeUnresolvableMessage("127.0.0.1")
                )
            })
            it("with alpha", () => {
                // @ts-expect-error
                attest(() => type("13three7")).throwsAndHasTypeError(
                    writeUnresolvableMessage("13three7")
                )
            })
            it("leading zeroes", () => {
                // @ts-expect-error
                attest(() => type("010")).throwsAndHasTypeError(
                    writeMalformedNumericLiteralMessage("010", "number")
                )
            })
            it("trailing zeroes", () => {
                // @ts-expect-error
                attest(() => type("4.0")).throws(
                    writeMalformedNumericLiteralMessage("4.0", "number")
                )
            })
            it("negative zero", () => {
                // @ts-expect-error
                attest(() => type("-0")).throws(
                    writeMalformedNumericLiteralMessage("-0", "number")
                )
            })
        })
    })
    describe("bigint", () => {
        it("positive", () => {
            // Is prime :D
            attest(type("12345678910987654321n").infer)
                .typed as 12345678910987654321n
        })
        it("negative", () => {
            attest(type("-9801n").infer).typed as -9801n
        })
        it("zero", () => {
            attest(type("0n").infer).typed as 0n
        })
        describe("errors", () => {
            it("decimal", () => {
                // @ts-expect-error
                attest(() => type("999.1n")).throwsAndHasTypeError(
                    writeUnresolvableMessage("999.1n")
                )
            })

            it("leading zeroes", () => {
                // TS currently doesn't try to infer this as bigint even
                // though it matches our rules for a "malformed" integer.
                // @ts-expect-error
                attest(() => type("007n"))
                    .throws(
                        writeMalformedNumericLiteralMessage("007n", "bigint")
                    )
                    .type.errors(writeUnresolvableMessage("007n"))
            })
            it("negative zero", () => {
                // @ts-expect-error
                attest(() => type("-0n")).throws(
                    writeMalformedNumericLiteralMessage("-0n", "bigint")
                )
            })
        })
    })
})
