import { assert } from "@re-/assert"
import { define } from "@re-/model"

export const testBigintLiteral = () => {
    describe("type", () => {
        test("positive", () => {
            assert(define("999999999999999n").type).typed as bigint
        })
        test("negative", () => {
            assert(define("-1n").type).typed as bigint
        })
        describe("errors", () => {
            test("decimal", () => {
                // @ts-expect-error
                assert(() => define("99999.99n")).throwsAndHasTypeError(
                    "Unable to determine the type of '99999.99n'."
                )
            })
        })
    })
    describe("validation", () => {})
    describe("generation", () => {})
}
