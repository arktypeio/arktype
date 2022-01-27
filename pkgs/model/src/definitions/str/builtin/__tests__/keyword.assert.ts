import { assert } from "@re-/assert"
import { define } from "@re-/model"

export const testKeyword = () => {
    describe("type", () => {
        test("basic", () => {
            assert(define("string").type).typed as string
        })
        describe("errors", () => {})
    })
    describe("validation", () => {})
    describe("generation", () => {})
}
