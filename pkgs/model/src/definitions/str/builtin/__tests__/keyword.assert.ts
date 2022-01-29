import { assert } from "@re-/assert"
import { define } from "@re-/model"

export const testKeyword = () => {
    describe("type", () => {
        test("string", () => {
            assert(define("string").type).typed as string
        })
        test("number", () => {
            assert(define("number").type).typed as number
        })
        test("boolean", () => {
            assert(define("boolean").type).typed as boolean
        })
        test("true", () => {
            assert(define("true").type).typed as true
        })
        test("false", () => {
            assert(define("false").type).typed as false
        })
        test("bigint", () => {
            assert(define("bigint").type).typed as bigint
        })
        test("symbol", () => {
            assert(define("symbol").type).typed as symbol
        })
        test("function", () => {
            assert(define("function").type).typed as (...args: any[]) => any
        })
        test("object", () => {
            assert(define("object").type).typed as object
        })
        test("undefined", () => {
            assert(define("undefined").type).typed as undefined
        })
        test("null", () => {
            assert(define("null").type).typed as null
        })
        test("void", () => {
            assert(define("void").type).typed as void
        })
        test("any", () => {
            assert(define("any").type).typed as any
        })
        test("unknown", () => {
            // TODO: Fixo
            assert(define("unknown").type).typed as unknown
        })
        test("never", () => {
            // @ts-expect-error
            assert(define("never").type).typed as never
        })
        describe("errors", () => {})
    })
    describe("validation", () => {})
    describe("generation", () => {})
}
