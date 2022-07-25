import { assert } from "@re-/assert"
import { type } from "../../src/index.js"

describe("stringLiteral", () => {
    describe("type", () => {
        it("single quotes", () => {
            assert(type("'hello'").infer).typed as "hello"
        })
        it("double quotes", () => {
            assert(type('"goodbye"').infer).typed as "goodbye"
        })
        it("single-quoted literal", () => {
            assert(type(`"'single-quoted'"`).infer).typed as "'single-quoted'"
        })
        it("double-quoted literal", () => {
            assert(type(`'"double-quoted"'`).infer).typed as '"double-quoted"'
        })
        it("with spaces", () => {
            assert(type("'this has spaces'").infer).typed as "this has spaces"
        })
        describe("errors", () => {
            it("unclosed quotes", () => {
                // @ts-expect-error
                assert(() => type("'mismatched")).throwsAndHasTypeError(
                    "Unable to determine the type of ''mismatched'."
                )
            })
            it("mismatched quotes", () => {
                // @ts-expect-error
                assert(() => type(`"mismatched'`)).throwsAndHasTypeError(
                    /Unable to determine the type of[\S\s]*mismatched'/
                )
            })
            it("extraneous single quotes", () => {
                assert(() =>
                    // @ts-expect-error
                    type(`'this isn't allowed'`)
                ).throwsAndHasTypeError(
                    /Unable to determine the type of[\S\s]*allowed'/
                )
            })
            it("nested double quote pair", () => {
                assert(() =>
                    // @ts-expect-error
                    type(`"not "ok""`)
                ).throwsAndHasTypeError(
                    /Unable to determine the type of[\S\s]*ok/
                )
            })
        })
    })
    describe("validation", () => {
        it("matching literal", () => {
            assert(type("'dursurdo'").validate("dursurdo").error).is(undefined)
        })
        describe("errors", () => {
            it("mismatched literal", () => {
                assert(
                    type("'dursurdo'").validate("durrrrrr").error?.message
                ).snap(`"durrrrrr" is not assignable to 'dursurdo'.`)
            })
        })
    })
    describe("generation", () => {
        it("matching literal", () => {
            assert(type("'generated'").create()).is("generated")
        })
    })
})
