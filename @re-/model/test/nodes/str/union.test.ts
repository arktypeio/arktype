import { assert } from "@re-/assert"
import { narrow } from "@re-/tools"
import { eager, model } from "@re-/model"

describe("union", () => {
    describe("type", () => {
        it("two types", () => {
            assert(model("number|string").type).typed as string | number
        })
        it("several types", () => {
            assert(model("false|null|undefined|0|''").type).typed as
                | number
                | false
                | ""
                | null
                | undefined
        })
        describe("errors", () => {
            it("bad reference", () => {
                // @ts-expect-error
                assert(() => eager("number|sting")).throwsAndHasTypeError(
                    "Unable to determine the type of 'sting'."
                )
            })
            it("double pipes", () => {
                // @ts-expect-error
                assert(() => eager("boolean||null")).throwsAndHasTypeError(
                    "Unable to determine the type of ''."
                )
            })
        })
    })
    describe("validation", () => {
        it("two types", () => {
            assert(model("true|false").validate(false).error).is(undefined)
        })
        it("several types", () => {
            assert(
                model("0|false|undefined|null|'zero'|void").validate("zero")
                    .error
            ).is(undefined)
        })
        describe("errors", () => {
            it("two types", () => {
                assert(model("'yes'|'no'").validate("maybe").error).snap(
                    `'maybe' is not assignable to any of 'yes'|'no'.`
                )
            })
            it("several types", () => {
                assert(model("2|4|6|8").validate(5).error).snap(
                    `5 is not assignable to any of 2|4|6|8.`
                )
            })
        })
    })
    describe("generation", () => {
        it("prefers simple values", () => {
            assert(model("undefined|string").generate()).is(undefined)
            assert(model("number|false|bigint").generate() as any).is(false)
            assert(model("symbol|object").generate()).equals({})
        })
        it("avoids ungeneratable", () => {
            assert(model("object|function").generate()).equals({})
            assert(model("never|number|boolean").generate()).equals(false)
        })
        it("prefers simple aliases", () => {
            const space = narrow({
                dictionary: {
                    five: 5,
                    duck: "'duck'",
                    nested: {}
                }
            })
            assert(model("nested|five|duck", { space }).generate() as any).is(5)
            assert(model("duck|nested", { space }).generate() as any).is("duck")
        })
        it("generates onCycle values if needed", () => {
            // assert(
            //     model(
            //         "a|b",
            //         narrow({
            //             space: {
            //                 dictionary: {
            //                     a: { b: "b" },
            //                     b: { a: "a" }
            //                 }
            //             }
            //         })
            //     ).generate({ onRequiredCycle: "cycle" }) as any
            // ).equals({ b: { a: "cycle" } })
        })
        // it("avoids required cycles if possible", () => {
        //     assert(
        //         model(
        //             "a|b|safe",
        //             narrow({
        //                 space: {
        //                     dictionary: {
        //                         a: { b: "b" },
        //                         b: { a: "a" },
        //                         safe: "false"
        //                     }
        //                 }
        //             })
        //         ).generate()
        //     ).is(false)
        // })
    })
})
