import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { type } from "../exports.js"
import {
    buildIndivisibleMessage,
    buildUnboundableMessage
} from "../src/parse/string/ast.js"

describe("semantics", () => {
    describe("bound", () => {
        test("number", () => {
            attest(type("number==-3.14159").infer).typed as number
        })
        test("string", () => {
            attest(type("string<=5").infer).typed as string
        })
        test("array", () => {
            attest(type("87<=boolean[]<89").infer).typed as boolean[]
        })
        test("any", () => {
            attest(type("any>5").infer).typed as any
        })
        describe("errors", () => {
            test("unboundable", () => {
                // @ts-expect-error
                attest(() => type("unknown<10")).throwsAndHasTypeError(
                    buildUnboundableMessage("unknown")
                )
            })
            // Note: Bounding a number literal results in a syntax error and is
            // tested alongside other bound parse errors
            test("string literal", () => {
                // @ts-expect-error
                attest(() => type("1<'foo'<10")).throwsAndHasTypeError(
                    buildUnboundableMessage("'foo'")
                )
            })
        })
    })
    describe("divisibility", () => {
        test("number", () => {
            attest(type("number%2").infer).typed as number
        })
        test("any", () => {
            attest(type("any%1").infer).typed as any
        })
        describe("errors", () => {
            test("indivisible", () => {
                // @ts-expect-error
                attest(() => type("unknown%2")).throwsAndHasTypeError(
                    buildIndivisibleMessage("unknown")
                )
            })
            test("number literal", () => {
                // @ts-expect-error
                attest(() => type("5%10")).throwsAndHasTypeError(
                    buildIndivisibleMessage("5")
                )
            })
        })
    })
})
