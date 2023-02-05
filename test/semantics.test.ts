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

        describe("errors", () => {
            it("unboundable", () => {
                // @ts-expect-error
                attest(() => type("unknown<10")).throwsAndHasTypeError(
                    writeUnboundableMessage("'unknown'")
                )
            })
            it("any", () => {
                // @ts-expect-error
                attest(() => type("any>10")).throwsAndHasTypeError(
                    writeUnboundableMessage("'any'")
                )
            })
            it("overlapping", () => {
                // @ts-expect-error
                attest(() => type("1<(number|boolean)<10")).throws.snap(
                    'Error: Bounded expression {"number":true,"boolean":true} must be a number, string or array'
                )
            })
        })
    })
    describe("divisibility", () => {
        it("number", () => {
            attest(type("number%2").infer).typed as number
        })
        describe("errors", () => {
            it("indivisible", () => {
                // @ts-expect-error
                attest(() => type("unknown%2")).throwsAndHasTypeError(
                    writeIndivisibleMessage("'unknown'")
                )
            })
            it("indivisible", () => {
                // @ts-expect-error
                attest(() => type("any%1")).throwsAndHasTypeError(
                    writeIndivisibleMessage("'any'")
                )
            })
            it("overlapping", () => {
                // @ts-expect-error
                attest(() => type("(number|string)%10")).throws.snap(
                    'Error: Divisibility operand {"number":true,"string":true} must be a number'
                )
            })
        })
    })
})
