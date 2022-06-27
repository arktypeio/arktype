import { assert } from "@re-/assert"
import { eager, model } from "../../../src/index.js"

describe("stringLiteral", () => {
    describe("type", () => {
        it("single quotes", () => {
            assert(model("'hello'").type).typed as "hello"
        })
        it("double quotes", () => {
            assert(model('"goodbye"').type).typed as "goodbye"
        })
        it("single-quoted literal", () => {
            assert(model(`"'single-quoted'"`).type).typed as "'single-quoted'"
        })
        it("double-quoted literal", () => {
            assert(model(`'"double-quoted"'`).type).typed as '"double-quoted"'
        })
        it("with spaces", () => {
            assert(model("'this has spaces'").type).typed as "this has spaces"
        })
        describe("errors", () => {
            it("unclosed quotes", () => {
                // @ts-expect-error
                assert(() => eager("'mismatched")).throwsAndHasTypeError(
                    "Unable to determine the type of ''mismatched'."
                )
            })
            it("mismatched quotes", () => {
                // @ts-expect-error
                assert(() => eager(`"mismatched'`)).throwsAndHasTypeError(
                    /Unable to determine the type of[\S\s]*mismatched'/
                )
            })
            it("extraneous single quotes", () => {
                assert(() =>
                    // @ts-expect-error
                    eager(`'this isn't allowed'`)
                ).throwsAndHasTypeError(
                    /Unable to determine the type of[\S\s]*allowed'/
                )
            })
            it("nested double quote pair", () => {
                assert(() =>
                    // @ts-expect-error
                    eager(`"not "ok""`)
                ).throwsAndHasTypeError(
                    /Unable to determine the type of[\S\s]*ok/
                )
            })
        })
    })
    describe("validation", () => {
        it("matching literal", () => {
            assert(model("'dursurdo'").validate("dursurdo").error).is(undefined)
        })
        describe("errors", () => {
            it("mismatched literal", () => {
                assert(
                    model("'dursurdo'").validate("durrrrrr").error?.message
                ).snap(`"durrrrrr" is not assignable to 'dursurdo'.`)
            })
        })
    })
    describe("generation", () => {
        it("matching literal", () => {
            assert(model("'generated'").generate()).is("generated")
        })
    })
})
