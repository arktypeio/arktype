import { describe, it } from "mocha"
import { type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import {
    writeIndivisibleMessage,
    writeUnboundableMessage
} from "../src/parse/string/ast.ts"

describe("semantics", () => {
    describe("bound", () => {
        it("number", () => {
            attest(type("number==-3.14159").infer).typed as number
        })
        it("string", () => {
            attest(type("string<=5").infer).typed as string
        })
        it("array", () => {
            attest(type("87<=boolean[]<89").infer).typed as boolean[]
        })
        it("any", () => {
            attest(type("any>5").infer).typed as any
        })
        describe("errors", () => {
            it("unboundable", () => {
                // @ts-expect-error
                attest(() => type("unknown<10")).throwsAndHasTypeError(
                    writeUnboundableMessage("unknown")
                )
            })
            // Note: Bounding a number literal results in a syntax error and is
            // tested alongside other bound parse errors
            it("string literal", () => {
                // @ts-expect-error
                attest(() => type("1<'foo'<10")).throwsAndHasTypeError(
                    writeUnboundableMessage("'foo'")
                )
            })
        })
    })
    describe("divisibility", () => {
        it("number", () => {
            attest(type("number%2").infer).typed as number
        })
        it("any", () => {
            attest(type("any%1").infer).typed as any
        })
        describe("errors", () => {
            it("indivisible", () => {
                // @ts-expect-error
                attest(() => type("unknown%2")).throwsAndHasTypeError(
                    writeIndivisibleMessage("unknown")
                )
            })
            it("number literal", () => {
                // @ts-expect-error
                attest(() => type("5%10")).throwsAndHasTypeError(
                    writeIndivisibleMessage("5")
                )
            })
        })
    })
})
