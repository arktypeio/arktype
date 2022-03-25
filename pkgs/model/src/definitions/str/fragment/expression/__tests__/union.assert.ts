import { assert } from "@re-/assert"
import { define } from "@re-/model"

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
    describe("validation", () => {
        test("two types", () => {
            assert(define("true|false").validate(false).errors).is(undefined)
        })
        test("several types", () => {
            assert(
                define("0|false|undefined|null|'zero'|void").validate("zero")
                    .errors
            ).is(undefined)
        })
        describe("errors", () => {
            test("two types", () => {
                assert(define("'yes'|'no'").validate("maybe").errors).snap(`
"'maybe' is not assignable to any of 'yes'|'no':
{'yes': ''maybe' is not assignable to 'yes'.', 'no': ''maybe' is not assignable to 'no'.'}"
`)
            })
            test("several types", () => {
                assert(define("2|4|6|8").validate(5).errors).snap(`
"5 is not assignable to any of 2|4|6|8:
{2: '5 is not assignable to 2.', 4: '5 is not assignable to 4.', 6: '5 is not assignable to 6.', 8: '5 is not assignable to 8.'}"
`)
            })
        })
    })
    describe("generation", () => {
        test("prefers simple values", () => {
            assert(define("undefined|string").generate()).is(undefined)
            assert(define("number|false|function").generate() as any).is(false)
            assert(define("symbol|object").generate()).equals({})
        })
        test("prefers simple aliases", () => {
            const space = {
                five: 5,
                duck: "'duck'",
                func: "function"
            } as const
            assert(define("func|five|duck", { space }).generate() as any).is(5)
            assert(define("duck|func", { space }).generate() as any).is("duck")
        })
        test("generates onCycle values if needed", () => {
            assert(
                define("a|b", {
                    space: {
                        a: { b: "b" },
                        b: { a: "a" }
                    }
                }).generate({ onRequiredCycle: "cycle" }) as any
            ).equals({ b: { a: "cycle" } })
        })
        test("avoids required cycles if possible", () => {
            assert(
                define("a|b|safe", {
                    space: {
                        a: { b: "b" },
                        b: { a: "a" },
                        safe: "false"
                    }
                }).generate()
            ).is(false)
        })
    })
}
