import { assert } from "@re-/assert"
import { define } from "@re-/model"

export const testNumberLiteral = () => {
    describe("type", () => {
        // As of TS 4.5, I don't think it's possible to parse a number literal from a string type
        // Runtime functionality like "getDefault" and "validate" will still use the more specific
        // value, but the TS type is inferred as "number"
        test("integer", () => {
            assert(define("4").type).typed as number
        })
        test("decimal", () => {
            assert(define("1.234").type).typed as number
        })
        describe("errors", () => {})
    })
    describe("validation", () => {})
    describe("generation", () => {})
}
