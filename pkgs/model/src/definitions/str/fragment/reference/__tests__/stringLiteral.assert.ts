import { assert } from "@re-/assert"
import { create } from "@re-/model"

export const testStringLiteral = () => {
    describe("type", () => {
        test("single quotes", () => {
            assert(create("'hello'").type).typed as "hello"
        })
        test("double quotes", () => {
            assert(create('"goodbye"').type).typed as "goodbye"
        })
        test("single-quoted literal", () => {
            assert(create(`"'single-quoted'"`).type).typed as "'single-quoted'"
        })
        test("double-quoted literal", () => {
            assert(create(`'"double-quoted"'`).type).typed as '"double-quoted"'
        })
        test("with spaces", () => {
            assert(create("'this has spaces'").type).typed as "this has spaces"
        })
        describe("errors", () => {
            test("unclosed quotes", () => {
                // @ts-expect-error
                assert(() => create("'mismatched")).throwsAndHasTypeError(
                    "Unable to determine the type of ''mismatched'."
                )
            })
            test("mismatched quotes", () => {
                // @ts-expect-error
                assert(() => create(`"mismatched'`)).throwsAndHasTypeError(
                    /Unable to determine the type of[\s\S]*mismatched'/
                )
            })
            test("extraneous single quotes", () => {
                assert(() =>
                    // @ts-expect-error
                    create(`'this isn't allowed'`)
                ).throwsAndHasTypeError(
                    /Unable to determine the type of[\s\S]*allowed'/
                )
            })
            test("nested double quote pair", () => {
                assert(() =>
                    // @ts-expect-error
                    create(`"not "ok""`)
                ).throwsAndHasTypeError(
                    /Unable to determine the type of[\s\S]*ok/
                )
            })
        })
    })
    describe("validation", () => {
        test("matching literal", () => {
            assert(create("'dursurdo'").validate("dursurdo").error).is(
                undefined
            )
        })
        describe("errors", () => {
            test("mismatched literal", () => {
                assert(create("'dursurdo'").validate("durrrrrr").error).snap(
                    `"'durrrrrr' is not assignable to 'dursurdo'."`
                )
            })
        })
    })
    describe("generation", () => {
        test("matching literal", () => {
            assert(create("'generated'").generate()).is("generated")
        })
    })
}
