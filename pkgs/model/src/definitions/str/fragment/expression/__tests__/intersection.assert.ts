import { assert } from "@re-/assert"
import { define } from "@re-/model"

type z = unknown & boolean & true

export const testIntersection = () => {
    describe("type", () => {
        test("two types", () => {
            assert(define("boolean&true").type).typed as true
        })
        test("several types", () => {
            assert(define("unknown&boolean&false").type).typed as false
        })
        test("empty intersection", () => {
            // @ts-ignore
            assert(define("number&string").type).typed as never
        })
        describe("errors", () => {
            test("bad reference", () => {
                // @ts-expect-error
                assert(() => define("boolean&tru")).throwsAndHasTypeError(
                    "Unable to determine the type of 'tru'."
                )
            })
            test("double and", () => {
                // @ts-expect-error
                assert(() => define("boolean&&true")).throwsAndHasTypeError(
                    "Unable to determine the type of ''."
                )
            })
        })
    })
    describe("validation", () => {
        test("two types", () => {
            assert(define("boolean&true").validate(true).errors).is(undefined)
        })
        test("several types", () => {
            assert(define("unknown&boolean&false").validate(false).errors).is(
                undefined
            )
        })
        test("keyword specifiers", () => {
            assert(define("integer&nonNegative").validate(-7).errors).is(
                undefined
            )
        })
        describe("errors", () => {
            test("empty intersection", () => {
                // @ts-ignore
                assert(define("number&string").validate("5").errors).snap()
            })
            test("two types", () => {
                assert(define("boolean&true").validate("false").errors).snap()
            })
            test("several types", () => {
                assert(
                    define("unknown&true&boolean").validate(false).errors
                ).snap()
            })
            test("bad keyword specifiers", () => {
                assert(define("integer&positive").validate(7.5).errors).snap()
            })
        })
    })
    describe("generation", () => {
        test("unsupported", () => {
            assert(() => define("boolean&true").generate()).throws.snap()
        })
    })
}
