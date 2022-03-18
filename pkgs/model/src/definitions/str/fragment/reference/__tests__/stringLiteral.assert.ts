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
        test("single-quoted literal", () => {
            assert(define(`"'single-quoted'"`).type).typed as "'single-quoted'"
        })
        test("double-quoted literal", () => {
            assert(define(`'"double-quoted"'`).type).typed as '"double-quoted"'
        })
        describe("errors", () => {
            test("unclosed quotes", () => {
                // @ts-expect-error
                assert(() => define("'mismatched")).throwsAndHasTypeError(
                    "Unable to determine the type of ''mismatched'."
                )
            })
            test("mismatched quotes", () => {
                // @ts-expect-error
                assert(() => define(`"mismatched'`)).throwsAndHasTypeError(
                    /Unable to determine the type of[\s\S]*mismatched'/
                )
            })
        })
    })
    describe("validation", () => {
        test("matching literal", () => {
            assert(define("'dursurdo'").validate("dursurdo").errors).is(
                undefined
            )
        })
        describe("errors", () => {
            test("mismatched literal", () => {
                assert(define("'dursurdo'").validate("durrrrrr").errors).snap(
                    `"'durrrrrr' is not assignable to 'dursurdo'."`
                )
            })
        })
    })
    describe("generation", () => {
        test("matching literal", () => {
            assert(define("'generated'").generate()).is("generated")
        })
    })
}
