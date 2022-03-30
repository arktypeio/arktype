import { assert } from "@re-/assert"
import { create } from "@re-/model"

export const testUnion = () => {
    describe("type", () => {
        test("two types", () => {
            assert(create("number|string").type).typed as string | number
        })
        test("several types", () => {
            assert(create("false|null|undefined|0|''").type).typed as
                | number
                | false
                | ""
                | null
                | undefined
        })
        describe("errors", () => {
            test("bad reference", () => {
                // @ts-expect-error
                assert(() => create("number|sting")).throwsAndHasTypeError(
                    "Unable to determine the type of 'sting'."
                )
            })
            test("double pipes", () => {
                // @ts-expect-error
                assert(() => create("boolean||null")).throwsAndHasTypeError(
                    "Unable to determine the type of ''."
                )
            })
        })
    })
    describe("validation", () => {
        test("two types", () => {
            assert(create("true|false").validate(false).errors).is(undefined)
        })
        test("several types", () => {
            assert(
                create("0|false|undefined|null|'zero'|void").validate("zero")
                    .errors
            ).is(undefined)
        })
        describe("errors", () => {
            test("two types", () => {
                assert(create("'yes'|'no'").validate("maybe").errors).snap(`
"'maybe' is not assignable to any of 'yes'|'no':
{'yes': ''maybe' is not assignable to 'yes'.', 'no': ''maybe' is not assignable to 'no'.'}"
`)
            })
            test("several types", () => {
                assert(create("2|4|6|8").validate(5).errors).snap(`
"5 is not assignable to any of 2|4|6|8:
{2: '5 is not assignable to 2.', 4: '5 is not assignable to 4.', 6: '5 is not assignable to 6.', 8: '5 is not assignable to 8.'}"
`)
            })
        })
    })
    describe("generation", () => {
        test("prefers simple values", () => {
            assert(create("undefined|string").generate()).is(undefined)
            assert(create("number|false|function").generate() as any).is(false)
            assert(create("symbol|object").generate()).equals({})
        })
        test("prefers simple aliases", () => {
            const space = {
                resolutions: {
                    five: 5,
                    duck: "'duck'",
                    func: "function"
                }
            } as const
            assert(create("func|five|duck", { space }).generate() as any).is(5)
            assert(create("duck|func", { space }).generate() as any).is("duck")
        })
        test("generates onCycle values if needed", () => {
            assert(
                create("a|b", {
                    space: {
                        resolutions: {
                            a: { b: "b" },
                            b: { a: "a" }
                        }
                    }
                }).generate({ onRequiredCycle: "cycle" }) as any
            ).equals({ b: { a: "cycle" } })
        })
        test("avoids required cycles if possible", () => {
            assert(
                create("a|b|safe", {
                    space: {
                        resolutions: {
                            a: { b: "b" },
                            b: { a: "a" },
                            safe: "false"
                        }
                    }
                }).generate()
            ).is(false)
        })
    })
}
