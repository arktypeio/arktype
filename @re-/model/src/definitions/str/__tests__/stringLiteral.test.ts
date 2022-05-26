import { assert } from "@re-/assert"
import { model } from "@re-/model"

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
                assert(() => model("'mismatched")).throwsAndHasTypeError(
                    "Unable to determine the type of ''mismatched'."
                )
            })
            it("mismatched quotes", () => {
                // @ts-expect-error
                assert(() => model(`"mismatched'`)).throwsAndHasTypeError(
                    /Unable to determine the type of[\S\s]*mismatched'/
                )
            })
            it("extraneous single quotes", () => {
                assert(() =>
                    // @ts-expect-error
                    model(`'this isn't allowed'`)
                ).throwsAndHasTypeError(
                    /Unable to determine the type of[\S\s]*allowed'/
                )
            })
            it("nested double quote pair", () => {
                assert(() =>
                    // @ts-expect-error
                    model(`"not "ok""`)
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
                assert(model("'dursurdo'").validate("durrrrrr").error).snap(
                    "'durrrrrr' is not assignable to 'dursurdo'."
                )
            })
        })
    })
    describe("generation", () => {
        it("matching literal", () => {
            assert(model("'generated'").generate()).is("generated")
        })
    })
})
