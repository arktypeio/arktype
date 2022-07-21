import { assert } from "@re-/assert"
import { eager, type } from "../../src/index.js"

describe("intersection", () => {
    describe("type", () => {
        it("two types", () => {
            assert(type("boolean&true").type).typed as true
        })
        it("several types", () => {
            assert(type("unknown&boolean&false").type).typed as false
        })
        it("empty intersection", () => {
            // @ts-ignore
            assert(type("number&string").type).typed as never
        })
        describe("errors", () => {
            it("bad reference", () => {
                // @ts-expect-error
                assert(() => eager("boolean&tru")).throwsAndHasTypeError(
                    "Unable to determine the type of 'tru'."
                )
            })
            it("double and", () => {
                // @ts-expect-error
                assert(() => eager("boolean&&true")).throwsAndHasTypeError(
                    "Unable to determine the type of ''."
                )
            })
        })
    })
    describe("validation", () => {
        it("two types", () => {
            assert(type("boolean&true").validate(true).error).is(undefined)
        })
        it("several types", () => {
            assert(
                type("unknown&boolean&false").validate(false).error?.message
            ).is(undefined)
        })
        it("keyword specifiers", () => {
            assert(type("integer&number").validate(7).error?.message).is(
                undefined
            )
        })
        describe("errors", () => {
            it("empty intersection", () => {
                assert(type("number&string").validate("5").error?.message).snap(
                    `"5" is not assignable to number.`
                )
            })
            it("two types", () => {
                assert(
                    type("boolean&true").validate(false).error?.message
                ).snap(`false is not assignable to true.`)
            })
            it("several types", () => {
                assert(
                    type("unknown&true&boolean").validate(false).error?.message
                ).snap(`false is not assignable to true.`)
            })
            it("bad keyword specifiers", () => {
                assert(
                    type("number&integer").validate(7.5).error?.message
                ).snap(`7.5 is not assignable to integer.`)
            })
        })
    })
    describe("generation", () => {
        it("unsupported", () => {
            assert(() => type("boolean&true").create()).throws.snap(
                `Error: Unable to generate a value for 'boolean&true': Intersection generation is unsupported.`
            )
        })
    })
})
