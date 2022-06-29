import { assert } from "@re-/assert"
import { eager, model, space } from "../../src/index.js"

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
        it("verbose validation", () => {
            assert(
                space({
                    a: "b|c",
                    b: "d|e",
                    c: "f|g",
                    d: 0,
                    e: 1,
                    f: 2,
                    g: 3
                }).models.a.validate(4, { verbose: true }).error?.message
            ).snap(`4 is not assignable to any of b|c.
b: 4 is not assignable to any of d|e.
d: 4 is not assignable to 0.
e: 4 is not assignable to 1.
c: 4 is not assignable to any of f|g.
f: 4 is not assignable to 2.
g: 4 is not assignable to 3.`)
        })
        describe("errors", () => {
            it("two types", () => {
                assert(
                    model("'yes'|'no'").validate("maybe").error?.message
                ).snap(`"maybe" is not assignable to any of 'yes'|'no'.`)
            })
            it("several types", () => {
                assert(model("2|4|6|8").validate(5).error?.message).snap(
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
            const mySpace = space({
                five: 5,
                duck: "'duck'",
                nested: {}
            })
            assert(mySpace.create("nested|five|duck").generate()).is(5)
            assert(mySpace.create("duck|nested").generate()).is("duck")
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
