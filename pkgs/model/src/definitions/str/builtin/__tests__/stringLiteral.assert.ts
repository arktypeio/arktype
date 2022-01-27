import { assert } from "@re-/assert"
import { define } from "@re-/model"

export const testStringLiteral = () => {
    describe("type", () => {
        test("single quotes", () => {
            assert(define("'hello'").type).typed as "hello"
        })
        test("double quotes", () => {
            assert(define('"goodbye"').type).typed as "goodbye"
        })
        describe("errors", () => {})
    })
    describe("validation", () => {})
    describe("generation", () => {})
}
