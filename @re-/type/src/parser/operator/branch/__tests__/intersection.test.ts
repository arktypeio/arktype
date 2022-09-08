import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../../index.js"

describe("intersection", () => {
    describe("type", () => {
        test("two types", () => {
            assert(type("boolean&true").infer).typed as true
        })
        test("several types", () => {
            assert(type("unknown&boolean&false").infer).typed as false
        })
        test("empty intersection", () => {
            // @ts-ignore
            assert(type("number&string").infer).typed as never
        })
        describe("errors", () => {
            test("bad reference", () => {
                // @ts-expect-error
                assert(() => type("boolean&tru")).throwsAndHasTypeError(
                    "'tru' is not a builtin type and does not exist in your space."
                )
            })
            test("double and", () => {
                // @ts-expect-error
                assert(() => type("boolean&&true")).throwsAndHasTypeError(
                    "Expected an expression (got '&true')."
                )
            })
        })
    })
    describe("validation", () => {
        test("two types", () => {
            assert(type("boolean&true").check(true).errors).is(undefined)
        })
        test("several types", () => {
            assert(
                type("unknown&boolean&false").check(false).errors?.summary
            ).is(undefined)
        })
        test("keyword specifiers", () => {
            assert(type("integer&number").check(7).errors?.summary).is(
                undefined
            )
        })
        describe("errors", () => {
            test("empty intersection", () => {
                assert(type("number&string").check("5").errors?.summary).snap(
                    `"5" is not assignable to number.`
                )
            })
            test("two types", () => {
                assert(type("boolean&true").check(false).errors?.summary).snap(
                    `false is not assignable to true.`
                )
            })
            test("several types", () => {
                assert(
                    type("unknown&true&boolean").check(false).errors?.summary
                ).snap(`false is not assignable to true.`)
            })
            test("bad keyword specifiers", () => {
                assert(type("number&integer").check(7.5).errors?.summary).snap(
                    `7.5 is not assignable to integer.`
                )
            })
        })
    })
    describe("generation", () => {
        test("unsupported", () => {
            assert(() => type("boolean&true").create()).throws.snap(
                `Error: Unable to generate a value for 'boolean&true': Intersection generation is unsupported.`
            )
        })
    })
})
