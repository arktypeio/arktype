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
            assert(define("unknown").type).typed as unknown
        })
        test("never", () => {
            // @ts-expect-error
            assert(define("never").type).typed as never
        })
    })
    describe("validation", () => {})
    describe("generation", () => {
        test("string", () => {
            assert(define("string").generate()).is("")
        })
        test("number", () => {
            assert(define("number").generate()).is(0)
        })
        test("boolean", () => {
            assert(define("boolean").generate()).is(false)
        })
        test("true", () => {
            assert(define("true").generate()).is(true)
        })
        test("false", () => {
            assert(define("false").generate()).is(false)
        })
        test("bigint", () => {
            assert(define("bigint").generate()).is(0n)
        })
        test("symbol", () => {
            assert(typeof define("symbol").generate()).is("symbol")
        })
        test("function", () => {
            const generated = define("function").generate()
            assert(typeof generated).is("function")
            assert(generated("irrelevant")).is(undefined)
        })
        test("object", () => {
            assert(define("object").generate()).equals({})
        })
        test("undefined", () => {
            assert(define("undefined").generate()).is(undefined)
        })
        test("null", () => {
            assert(define("null").generate()).is(null)
        })
        test("void", () => {
            assert(define("void").generate()).is(undefined)
        })
        test("any", () => {
            assert(define("any").generate()).is(undefined)
        })
        test("unknown", () => {
            assert(define("unknown").generate()).is(undefined)
        })
        test("never", () => {
            assert(() => define("never").generate()).throws(
                "Could not find a default value satisfying never."
            )
        })
    })
}
