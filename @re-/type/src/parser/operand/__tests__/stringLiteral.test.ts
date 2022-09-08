import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../index.js"
import { unterminatedEnclosedMessage } from "../index.js"

describe("stringLiteral", () => {
    describe("type", () => {
        test("single quotes", () => {
            assert(type("'hello'").infer).typed as "hello"
        })
        test("double quotes", () => {
            assert(type('"goodbye"').infer).typed as "goodbye"
        })
        test("single-quoted literal", () => {
            assert(type(`"'single-quoted'"`).infer).typed as "'single-quoted'"
        })
        test("double-quoted literal", () => {
            assert(type(`'"double-quoted"'`).infer).typed as '"double-quoted"'
        })
        test("with spaces", () => {
            assert(type("'this has spaces'").infer).typed as "this has spaces"
        })
        describe("errors", () => {
            test("unclosed quotes", () => {
                // @ts-expect-error
                assert(() => type("'mismatched")).throwsAndHasTypeError(
                    unterminatedEnclosedMessage("'mismatched", "'")
                )
            })
        })
    })
    describe("validation", () => {
        test("matching literal", () => {
            assert(type("'dursurdo'").check("dursurdo").errors).is(undefined)
        })
        describe("errors", () => {
            test("mismatched literal", () => {
                assert(
                    type("'dursurdo'").check("durrrrrr").errors?.summary
                ).snap(`"durrrrrr" is not assignable to 'dursurdo'.`)
            })
        })
    })
    describe("generation", () => {
        test("matching literal", () => {
            assert(type("'generated'").create()).is("generated")
        })
    })
})
