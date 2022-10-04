import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../type.js"
import { Enclosed } from "../enclosed.js"

describe("parse enclosed", () => {
    test("with spaces", () => {
        assert(type("'this has spaces'").infer).typed as "this has spaces"
    })
    test("isolated", () => {
        assert(type('"alone"').ast).narrowedValue('"alone"')
    })
    test("with neighbors", () => {
        assert(type("'foo'|/.*/[]").ast).narrowedValue([
            "'foo'",
            "|",
            ["/.*/", "[]"]
        ])
    })
    describe("errors", () => {
        describe("unterminated", () => {
            test("regex", () => {
                // @ts-expect-error
                assert(() => type("/.*")).throwsAndHasTypeError(
                    Enclosed.buildUnterminatedMessage("/.*", "/")
                )
            })
            test("single-quote", () => {
                // @ts-expect-error
                assert(() => type("'.*")).throwsAndHasTypeError(
                    Enclosed.buildUnterminatedMessage("'.*", "'")
                )
            })
            test("double-quote", () => {
                // @ts-expect-error
                assert(() => type('".*'))
                    .throws(Enclosed.buildUnterminatedMessage('".*', '"'))
                    .type.errors('\\".* requires a closing \\".')
            })
        })
    })
    test("single-quoted", () => {
        assert(type("'hello'").ast).narrowedValue("'hello'")
    })
    test("double-quoted", () => {
        assert(type('"goodbye"').ast).narrowedValue('"goodbye"')
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
        assert(type(`"'single-quoted'"`).ast).narrowedValue(
            "\"'single-quoted'\""
        )
        assert(type(`'"double-quoted"'`).ast).narrowedValue(
            "'\"double-quoted\"'"
        )
    })
    test("ignores enclosed tokens", () => {
        assert(type("'yes|no|maybe'").ast).narrowedValue("'yes|no|maybe'")
    })
    test("mix of enclosed and unenclosed tokens", () => {
        assert(type("'yes|no'|'true|false'").ast).narrowedValue([
            "'yes|no'",
            "|",
            "'true|false'"
        ])
    })
})
