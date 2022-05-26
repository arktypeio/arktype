import { assert } from "@re-/assert"
import { model } from "@re-/model"

describe("stringLiteral", () => {
    describe("type", () => {
        test("single quotes", () => {
            assert(model("'hello'").type).typed as "hello"
        })
        test("double quotes", () => {
            assert(model('"goodbye"').type).typed as "goodbye"
        })
        test("single-quoted literal", () => {
            assert(model(`"'single-quoted'"`).type).typed as "'single-quoted'"
        })
        test("double-quoted literal", () => {
            assert(model(`'"double-quoted"'`).type).typed as '"double-quoted"'
        })
        test("with spaces", () => {
            assert(model("'this has spaces'").type).typed as "this has spaces"
        })
        describe("errors", () => {
            test("unclosed quotes", () => {
                // @ts-expect-error
                assert(() => model("'mismatched")).throwsAndHasTypeError(
                    "Unable to determine the type of ''mismatched'."
                )
            })
            test("mismatched quotes", () => {
                // @ts-expect-error
                assert(() => model(`"mismatched'`)).throwsAndHasTypeError(
                    /Unable to determine the type of[\S\s]*mismatched'/
                )
            })
            test("extraneous single quotes", () => {
                assert(() =>
                    // @ts-expect-error
                    model(`'this isn't allowed'`)
                ).throwsAndHasTypeError(
                    /Unable to determine the type of[\S\s]*allowed'/
                )
            })
            test("nested double quote pair", () => {
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
        test("matching literal", () => {
            assert(model("'dursurdo'").validate("dursurdo").error).is(undefined)
        })
        describe("errors", () => {
            test("mismatched literal", () => {
                assert(model("'dursurdo'").validate("durrrrrr").error).snap(
                    "'durrrrrr' is not assignable to 'dursurdo'."
                )
            })
        })
    })
    describe("generation", () => {
        test("matching literal", () => {
            assert(model("'generated'").generate()).is("generated")
        })
    })
})
