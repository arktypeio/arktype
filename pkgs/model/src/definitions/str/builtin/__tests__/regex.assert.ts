import { assert } from "@re-/assert"
import { define } from "@re-/model"

export const testRegex = () => {
    describe("type", () => {
        test("inferred as string", () => {
            assert(define("/.*/").type).typed as string
        })
    })
    describe("validation", () => {
        test("matching string", () => {
            assert(define("/.*/").validate("dursurdo").errors).is(undefined)
        })
        describe("errors", () => {
            test("bad string", () => {
                assert(define("/[0-9]*/").validate("durrrrrr").errors).snap()
            })
            test("non-string", () => {
                assert(define("/[0-9]*/").validate(5).errors).snap()
            })
        })
    })
    describe("generation", () => {
        // TODO: Add regex generation
    })
}
