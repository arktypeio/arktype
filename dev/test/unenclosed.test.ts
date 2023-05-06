import { suite, test } from "mocha"
import { scope, type } from "../../src/main.js"
import { writeUnresolvableMessage } from "../../src/parse/string/shift/operand/unenclosed.js"
import { writeMalformedNumericLiteralMessage } from "../../src/utils/numericLiterals.js"
import { attest } from "../attest/main.js"

suite("parse unenclosed", () => {
    suite("identifier", () => {
        test("keyword", () => {
            attest(type("string").infer).typed as string
        })
        test("alias", () => {
            const a = scope({ a: "string" }).type("a")
            attest(a.infer).typed as string
        })
        suite("errors", () => {
            test("unresolvable", () => {
                // @ts-expect-error
                attest(() => type("HUH")).throwsAndHasTypeError(
                    writeUnresolvableMessage("HUH")
                )
            })
        })
    })
    suite("number", () => {
        suite("positive", () => {
            test("whole", () => {
                const four = type("4")
                attest(four.infer).typed as 4
                // attest(four.node).snap({ number: { value: 4 } })
            })
            test("decimal", () => {
                attest(type("3.14159").infer).typed as 3.14159
            })
            test("decimal with zero whole portion", () => {
                attest(type("0.5").infer).typed as 0.5
            })
        })
        suite("negative", () => {
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
        suite("errors", () => {
            test("multiple decimals", () => {
                // @ts-expect-error
                attest(() => type("127.0.0.1")).throwsAndHasTypeError(
                    writeUnresolvableMessage("127.0.0.1")
                )
            })
            test("with alpha", () => {
                // @ts-expect-error
                attest(() => type("13three7")).throwsAndHasTypeError(
                    writeUnresolvableMessage("13three7")
                )
            })
            test("leading zeroes", () => {
                // @ts-expect-error
                attest(() => type("010")).throwsAndHasTypeError(
                    writeMalformedNumericLiteralMessage("010", "number")
                )
            })
            test("trailing zeroes", () => {
                // @ts-expect-error
                attest(() => type("4.0")).throws(
                    writeMalformedNumericLiteralMessage("4.0", "number")
                )
            })
            test("negative zero", () => {
                // @ts-expect-error
                attest(() => type("-0")).throws(
                    writeMalformedNumericLiteralMessage("-0", "number")
                )
            })
        })
    })
    suite("bigint", () => {
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
        suite("errors", () => {
            test("decimal", () => {
                // @ts-expect-error
                attest(() => type("999.1n")).throwsAndHasTypeError(
                    writeUnresolvableMessage("999.1n")
                )
            })

            test("leading zeroes", () => {
                // TS currently doesn't try to infer this as bigint even
                // though it matches our rules for a "malformed" integer.
                // @ts-expect-error
                attest(() => type("007n"))
                    .throws(
                        writeMalformedNumericLiteralMessage("007n", "bigint")
                    )
                    .types.errors(writeUnresolvableMessage("007n"))
            })
            test("negative zero", () => {
                // @ts-expect-error
                attest(() => type("-0n")).throwsAndHasTypeError(
                    writeMalformedNumericLiteralMessage("-0n", "bigint")
                )
            })
        })
    })
})
