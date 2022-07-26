import { assert } from "@re-/assert"
import { describe, test } from "vitest"
import { space, type } from "../../src/index.js"

describe("union", () => {
    describe("type", () => {
        test("two types", () => {
            assert(type("number|string").infer).typed as string | number
        })
        test("several types", () => {
            assert(type("false|null|undefined|0|''").infer).typed as
                | number
                | false
                | ""
                | null
                | undefined
        })
        describe("errors", () => {
            test("bad reference", () => {
                // @ts-expect-error
                assert(() => type("number|sting")).throwsAndHasTypeError(
                    "Unable to determine the type of 'sting'."
                )
            })
            test("double pipes", () => {
                // @ts-expect-error
                assert(() => type("boolean||null")).throwsAndHasTypeError(
                    "Expected an expression after 'boolean|'."
                )
            })
            test("ends with |", () => {
                // @ts-expect-error
                assert(() => type("boolean|")).throwsAndHasTypeError(
                    "Expected an expression after 'boolean|'."
                )
            })
            test("long missing |", () => {
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
        test("two types", () => {
            assert(type("true|false").validate(false).error).is(undefined)
        })
        test("several types", () => {
            assert(
                type("0|false|undefined|null|'zero'|void").validate("zero")
                    .error
            ).is(undefined)
        })
        test("verbose validation", () => {
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
            test("two types", () => {
                assert(
                    type("'yes'|'no'").validate("maybe").error?.message
                ).snap(`"maybe" is not assignable to any of 'yes'|'no'.`)
            })
            test("several types", () => {
                assert(type("2|4|6|8").validate(5).error?.message).snap(
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
            assert(created).value.equals({
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
            assert(created).value.equals(false)
        })
    })
    describe("integration", () => {
        test("union of literals", () => {
            const unionOfLiterals = type("'yes'|'no'|'maybe'")
            assert(unionOfLiterals.infer).typed as "yes" | "no" | "maybe"
            assert(unionOfLiterals.validate("no").error).equals(undefined)
            assert(
                unionOfLiterals.validate("yes|no|maybe").error?.message
            ).snap(
                `"yes|no|maybe" is not assignable to any of 'yes'|'no'|'maybe'.`
            )
        })
        test("literal of union", () => {
            const literalOfUnion = type('"yes|no|maybe"')
            assert(literalOfUnion.infer).typed as "yes|no|maybe"
            assert(literalOfUnion.validate("yes|no|maybe").error).equals(
                undefined
            )
            assert(literalOfUnion.validate("yes").error?.message).snap(
                `"yes" is not assignable to "yes|no|maybe".`
            )
        })
        test("union of literals of unions", () => {
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
