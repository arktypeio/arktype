import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { space, type } from "../../../../index.js"

describe("union", () => {
    describe("type", () => {
        test("two types", () => {
            assert(type("number|string").infer).typed as string | number
        })
        test("several types", () => {
            assert(type("false|null|undefined|0|''").infer).typed as
                | 0
                | false
                | ""
                | null
                | undefined
        })
        describe("errors", () => {
            test("bad reference", () => {
                // @ts-expect-error
                assert(() => type("number|sting")).throwsAndHasTypeError(
                    "'sting' is not a builtin type and does not exist in your space."
                )
            })
            test("double pipes", () => {
                // @ts-expect-error
                assert(() => type("boolean||null")).throwsAndHasTypeError(
                    "Expected an expression (got '|null')."
                )
            })
            test("ends with |", () => {
                // @ts-expect-error
                assert(() => type("boolean|")).throwsAndHasTypeError(
                    "Expected an expression."
                )
            })
            test("long missing union member", () => {
                assert(() =>
                    // @ts-expect-error
                    type("boolean[]|(string|number|)|object")
                ).throwsAndHasTypeError(
                    "Expected an expression (got ')|object')."
                )
            })
        })
    })
    describe("validation", () => {
        test("two types", () => {
            assert(type("true|false").check(false).errors).is(undefined)
        })
        test("several types", () => {
            assert(
                type("0|false|undefined|null|'zero'|void").check("zero").errors
            ).is(undefined)
        })

        test("expand summary", () => {
            assert(
                space({
                    a: "b|c",
                    b: "d|e",
                    c: "f|g",
                    d: "0",
                    e: "1",
                    f: "2",
                    g: "3"
                }).a.check(4, { diagnostics: { Union: { expand: true } } })
                    .errors?.summary
            ).snap(`4 is not assignable to any of b|c:
b: 4 is not assignable to any of d|e:
d: 4 is not assignable to 0.
e: 4 is not assignable to 1.
c: 4 is not assignable to any of f|g:
f: 4 is not assignable to 2.
g: 4 is not assignable to 3.`)
        })
        describe("errors", () => {
            test("two types", () => {
                assert(type("'yes'|'no'").check("maybe").errors?.summary).snap(
                    `"maybe" is not assignable to any of "yes"|"no".`
                )
            })
            test("several types", () => {
                assert(type("2|4|6|8").check(5).errors?.summary).snap(
                    `5 is not assignable to any of 2|4|6|8.`
                )
            })
        })
    })
    describe("creation", () => {
        test("prefers simple values", () => {
            assert(type("undefined|string").create()).is(undefined)
            assert(type("number|false|bigint").create() as any).is(false)
            assert(type("symbol|object").create()).equals({})
        })
        test("avoids ungeneratable", () => {
            assert(type("object|function").create()).equals({})
            assert(type("never|number|boolean").create()).equals(false)
        })
        test("prefers simple aliases", () => {
            const mySpace = space({
                five: "5",
                duck: "'duck'",
                nested: {}
            })
            assert(mySpace.$root.type("nested|five|duck").create()).is(5)
            assert(mySpace.$root.type("duck|nested").create()).is("duck")
        })
        test("creates onCycle values if needed", () => {
            const models = space({ a: { b: "b" }, b: { a: "a" } })
            const aOrB = models.$root.type("a|b")
            const created = aOrB.create({ onRequiredCycle: "cycle" })
            assert(created).unknown.equals({
                b: { a: "cycle" }
            })
        })
        test("avoids required cycles if possible", () => {
            const models = space({
                a: { b: "b" },
                b: { a: "a" },
                safe: "false"
            })
            const aOrBOrSafe = models.$root.type("a|b|safe")
            const created = aOrBOrSafe.create()
            assert(created).unknown.equals(false)
        })
    })

    describe("integration", () => {
        test("union of literals", () => {
            const unionOfLiterals = type("'yes'|'no'|'maybe'")
            assert(unionOfLiterals.infer).typed as "yes" | "no" | "maybe"
            assert(unionOfLiterals.check("no").errors).equals(undefined)
            assert(unionOfLiterals.check("yes|no|maybe").errors?.summary).snap(
                `"yes|no|maybe" is not assignable to any of "yes"|"no"|"maybe".`
            )
        })
        test("literal of union", () => {
            const literalOfUnion = type('"yes|no|maybe"')
            assert(literalOfUnion.infer).typed as "yes|no|maybe"
            assert(literalOfUnion.check("yes|no|maybe").errors).equals(
                undefined
            )
            assert(literalOfUnion.check("yes").errors?.summary).snap(
                `"yes" is not assignable to "yes|no|maybe".`
            )
        })
        test("union of literals of unions", () => {
            const unionOfLiteralsOfUnions = type("'yes|no'|'true|false'")
            assert(unionOfLiteralsOfUnions.infer).typed as
                | "yes|no"
                | "true|false"
            assert(unionOfLiteralsOfUnions.check("true|false").errors).equals(
                undefined
            )
            assert(
                unionOfLiteralsOfUnions.check("yes|no'|'true|false").errors
                    ?.summary
            ).snap(
                `"yes|no'|'true|false" is not assignable to any of "yes|no"|"true|false".`
            )
        })
    })
})
