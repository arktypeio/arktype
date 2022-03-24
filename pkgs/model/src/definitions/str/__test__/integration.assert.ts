import { assert } from "@re-/assert"
import { define } from "@re-/model"
import { typeDefProxy } from "../internal.js"

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
        test("literal of unions", () => {
            assert(define('"yes|no|maybe"').type).typed as "yes|no|maybe"
        })
    })
    test("model props", () => {
        const a = define("a", {
            space: { a: "true" }
        })
        expect(a.definition).toBe("a")
        expect(a.space).toStrictEqual({ a: "true" })
        expect(a.validate(true).errors).toBeFalsy()
        expect(() => a.assert(false)).toThrow()
        expect(a.generate()).toBe(true)
        expect(a.type).toBe(typeDefProxy)
    })
}
