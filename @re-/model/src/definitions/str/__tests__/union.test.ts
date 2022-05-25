import { assert } from "@re-/assert"
import { model } from "@re-/model"
import { narrow } from "@re-/tools"

describe("union", () => {
    describe("type", () => {
        test("two types", () => {
            assert(model("number|string").type).typed as string | number
        })
        test("several types", () => {
            assert(model("false|null|undefined|0|''").type).typed as
                | number
                | false
                | ""
                | null
                | undefined
        })
        describe("errors", () => {
            test("bad reference", () => {
                // @ts-expect-error
                assert(() => model("number|sting")).throwsAndHasTypeError(
                    "Unable to determine the type of 'sting'."
                )
            })
            test("double pipes", () => {
                // @ts-expect-error
                assert(() => model("boolean||null")).throwsAndHasTypeError(
                    "Unable to determine the type of ''."
                )
            })
        })
    })
    describe("validation", () => {
        test("two types", () => {
            assert(model("true|false").validate(false).error).is(undefined)
        })
        test("several types", () => {
            assert(
                model("0|false|undefined|null|'zero'|void").validate("zero")
                    .error
            ).is(undefined)
        })
        describe("errors", () => {
            test("two types", () => {
                assert(model("'yes'|'no'").validate("maybe").error).snap(
                    `"'maybe' is not assignable to any of 'yes'|'no'."`
                )
            })
            test("several types", () => {
                assert(model("2|4|6|8").validate(5).error).snap(
                    `5 is not assignable to any of 2|4|6|8.`
                )
            })
        })
    })
    describe("generation", () => {
        test("prefers simple values", () => {
            assert(model("undefined|string").generate()).is(undefined)
            assert(model("number|false|function").generate() as any).is(false)
            assert(model("symbol|object").generate()).equals({})
        })
        test("prefers simple aliases", () => {
            const space = narrow({
                dictionary: {
                    five: 5,
                    duck: "'duck'",
                    func: "function"
                }
            })
            assert(model("func|five|duck", { space }).generate() as any).is(5)
            assert(model("duck|func", { space }).generate() as any).is("duck")
        })
        test("generates onCycle values if needed", () => {
            assert(
                model(
                    "a|b",
                    narrow({
                        space: {
                            dictionary: {
                                a: { b: "b" },
                                b: { a: "a" }
                            }
                        }
                    })
                ).generate({ onRequiredCycle: "cycle" }) as any
            ).equals({ b: { a: "cycle" } })
        })
        test("avoids required cycles if possible", () => {
            assert(
                model(
                    "a|b|safe",
                    narrow({
                        space: {
                            dictionary: {
                                a: { b: "b" },
                                b: { a: "a" },
                                safe: "false"
                            }
                        }
                    })
                ).generate()
            ).is(false)
        })
    })
})
