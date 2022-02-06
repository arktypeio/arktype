import { assert } from "@re-/assert"
import { define } from "@re-/model"

export const testIntegration = () => {
    describe("type", () => {
        test("precedence", () => {
            assert(define("(string|number[])=>void?").type).typed as
                | ((args_0: string | number[]) => void)
                | undefined
        })
        test("union of lists", () => {
            assert(define("boolean[]|number[]|null").type).typed as
                | boolean[]
                | number[]
                | null
        })
        test("union of literals", () => {
            assert(define("'yes'|'no'|'maybe'").type).typed as
                | "yes"
                | "no"
                | "maybe"
        })
        test("whitespace is ignored when parsing strings", () => {
            assert(define("    boolean      |    null       ").type).typed as
                | boolean
                | null
            assert(define("( string [] ) => boolean  ?").type).typed as
                | ((args_0: string[]) => boolean)
                | undefined
        })
    })
}
