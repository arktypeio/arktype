import { assert } from "@re-/assert"
import { eager, space, type } from "../../src/index.js"

describe("union", () => {
    describe("type", () => {
        it("two types", () => {
            assert(type("number|string").infer).typed as string | number
        })
        it("several types", () => {
            assert(type("false|null|undefined|0|''").infer).typed as
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
                    "Expected an expression after 'boolean|'."
                )
            })
            it("ends with |", () => {
                // @ts-expect-error
                assert(() => eager("boolean|")).throwsAndHasTypeError(
                    "Expected an expression after 'boolean|'."
                )
            })
            it("long missing |", () => {
                assert(() =>
                    // @ts-expect-error
                    type("boolean[]|(string|number|)|object")
                ).throwsAndHasTypeError(
                    "Expected an expression after 'string|number|'."
                )
            })
        })
    })
    describe("validation", () => {
        it("two types", () => {
            assert(type("true|false").validate(false).error).is(undefined)
        })
        it("several types", () => {
            assert(
                type("0|false|undefined|null|'zero'|void").validate("zero")
                    .error
            ).is(undefined)
        })
        it("verbose validation", () => {
            assert(
                space({
                    a: "b|c",
                    b: "d|e",
                    c: "f|g",
                    d: "0",
                    e: "1",
                    f: "2",
                    g: "3"
                }).a.validate(4, { verbose: true }).error?.message
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
                    type("'yes'|'no'").validate("maybe").error?.message
                ).snap(`"maybe" is not assignable to any of 'yes'|'no'.`)
            })
            it("several types", () => {
                assert(type("2|4|6|8").validate(5).error?.message).snap(
                    `5 is not assignable to any of 2|4|6|8.`
                )
            })
        })
    })
    describe("creation", () => {
        it("prefers simple values", () => {
            assert(type("undefined|string").create()).is(undefined)
            assert(type("number|false|bigint").create() as any).is(false)
            assert(type("symbol|object").create()).equals({})
        })
        it("avoids ungeneratable", () => {
            assert(type("object|function").create()).equals({})
            assert(type("never|number|boolean").create()).equals(false)
        })
        it("prefers simple aliases", () => {
            const mySpace = space({
                five: "5",
                duck: "'duck'",
                nested: {}
            })
            assert(mySpace.$meta.type("nested|five|duck").create()).is(5)
            assert(mySpace.$meta.type("duck|nested").create()).is("duck")
        })
        it("creates onCycle values if needed", () => {
            const models = space({ a: { b: "b" }, b: { a: "a" } })
            const aOrB = models.$meta.type("a|b")
            const created = aOrB.create({ onRequiredCycle: "cycle" })
            assert(created).value.equals({
                b: { a: "cycle" }
            })
        })
        it("avoids required cycles if possible", () => {
            const models = space({
                a: { b: "b" },
                b: { a: "a" },
                safe: "false"
            })
            const aOrBOrSafe = models.$meta.type("a|b|safe")
            const created = aOrBOrSafe.create()
            assert(created).value.equals(false)
        })
    })
    describe("integration", () => {
        it("union of literals", () => {
            const unionOfLiterals = type("'yes'|'no'|'maybe'")
            assert(unionOfLiterals.infer).typed as "yes" | "no" | "maybe"
            assert(unionOfLiterals.validate("no").error).equals(undefined)
            assert(
                unionOfLiterals.validate("yes|no|maybe").error?.message
            ).snap(
                `"yes|no|maybe" is not assignable to any of 'yes'|'no'|'maybe'.`
            )
        })
        it("literal of union", () => {
            const literalOfUnion = type('"yes|no|maybe"')
            assert(literalOfUnion.infer).typed as "yes|no|maybe"
            assert(literalOfUnion.validate("yes|no|maybe").error).equals(
                undefined
            )
            assert(literalOfUnion.validate("yes").error?.message).snap(
                `"yes" is not assignable to "yes|no|maybe".`
            )
        })
        it("union of literals of unions", () => {
            const unionOfLiteralsOfUnions = type("'yes|no'|'true|false'")
            assert(unionOfLiteralsOfUnions.infer).typed as
                | "yes|no"
                | "true|false"
            assert(unionOfLiteralsOfUnions.validate("true|false").error).equals(
                undefined
            )
            assert(
                unionOfLiteralsOfUnions.validate("yes|no'|'true|false'").error
                    ?.message
            ).snap(
                `"yes|no'|'true|false'" is not assignable to any of 'yes|no'|'true|false'.`
            )
        })
    })
})
