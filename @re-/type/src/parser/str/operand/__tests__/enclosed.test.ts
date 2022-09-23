import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../type.js"
import { unterminatedEnclosedMessage } from "../enclosed.js"

// TODO: Fix string literal quote types
describe("parse enclosed", () => {
    test("with spaces", () => {
        assert(type("'this has spaces'").infer).typed as "this has spaces"
    })
    test("isolated", () => {
        assert(type('"alone"').ast).narrowedValue('"alone"')
    })
    test("with neighbors", () => {
        assert(type("'foo'|/.*/[]").ast).narrowedValue([
            '"foo"',
            "|",
            ["/.*/", "[]"]
        ])
    })
    describe("errors", () => {
        describe("unterminated", () => {
            test("regex", () => {
                // @ts-expect-error
                assert(() => type("/.*")).throwsAndHasTypeError(
                    unterminatedEnclosedMessage("/.*", "/")
                )
            })
            test("single-quote", () => {
                // @ts-expect-error
                assert(() => type("'.*")).throwsAndHasTypeError(
                    unterminatedEnclosedMessage("'.*", "'")
                )
            })
            test("double-quote", () => {
                // @ts-expect-error
                assert(() => type('".*')).throwsAndHasTypeError(
                    unterminatedEnclosedMessage('".*', '"')
                )
            })
        })
    })
    test("single-quoted", () => {
        assert(type("'hello'").ast).narrowedValue("hello")
    })
    test("double-quoted", () => {
        assert(type('"goodbye"').ast).narrowedValue("goodbye")
    })
    test("regex literal", () => {
        assert(type("/.*/").ast).narrowedValue("/.*/")
    })
    test("invalid regex", () => {
        assert(() => type("/[/")).throws.snap(
            `SyntaxError: Invalid regular expression: /[/: Unterminated character class`
        )
    })
    test("mixed quote types", () => {
        assert(type(`"'single-quoted'"`).ast).typed as "'single-quoted'"
        assert(type(`'"double-quoted"'`).ast).typed as '"double-quoted"'
    })
    test("ignores enclosed tokens", () => {
        assert(type('"yes|no|maybe"').ast).typed as '"yes|no|maybe"'
    })
    test("mix of enclosed and unenclosed tokens", () => {
        assert(type("'yes|no'|'true|false'").ast).narrowedValue([
            '"yes|no"',
            "|",
            '"true|false"'
        ])
    })
})
