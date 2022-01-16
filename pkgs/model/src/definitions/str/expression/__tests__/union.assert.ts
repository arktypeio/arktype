import { assert } from "@re-/assert"
import { define } from "./internal.js"

export const testUnion = () => {
    describe("type", () => {
        test("two types", () => {
            assert(define("number|string").type).typed as string | number
        })
        test("several types", () => {
            assert(define("false|null|undefined|0|''").type).typed as
                | number
                | false
                | ""
                | null
                | undefined
        })
        describe("errors", () => {
            test("bad reference", () => {
                // @ts-expect-error
                assert(() => define("number|sting")).throwsAndHasTypeError(
                    "Unable to determine the type of 'sting'."
                )
            })
            test("double pipes", () => {
                // @ts-expect-error
                assert(() => define("boolean||null")).throwsAndHasTypeError(
                    "Unable to determine the type of ''."
                )
            })
        })
    })
}
