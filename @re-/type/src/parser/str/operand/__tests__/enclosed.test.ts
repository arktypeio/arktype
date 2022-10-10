import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../type.js"
import { Enclosed } from "../enclosed.js"

describe("parse enclosed", () => {
    test("with spaces", () => {
        assert(type("'this has spaces'").infer).typed as "this has spaces"
    })
    test("isolated", () => {
        assert(type('"alone"').toAst()).narrowedValue('"alone"')
    })
    test("with neighbors", () => {
        assert(type("'foo'|/.*/[]").toAst()).narrowedValue([
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
        assert(type("'hello'").toAst()).narrowedValue("'hello'")
    })
    test("double-quoted", () => {
        assert(type('"goodbye"').toAst()).narrowedValue('"goodbye"')
    })
    test("regex literal", () => {
        assert(type("/.*/").toAst()).narrowedValue("/.*/")
    })
    test("invalid regex", () => {
        assert(() => type("/[/")).throws.snap(
            `SyntaxError: Invalid regular expression: /[/: Unterminated character class`
        )
    })
    test("mixed quote types", () => {
        assert(type(`"'single-quoted'"`).toAst()).narrowedValue(
            "\"'single-quoted'\""
        )
        assert(type(`'"double-quoted"'`).toAst()).narrowedValue(
            "'\"double-quoted\"'"
        )
    })
    test("ignores enclosed tokens", () => {
        assert(type("'yes|no|maybe'").toAst()).narrowedValue("'yes|no|maybe'")
    })
    test("mix of enclosed and unenclosed tokens", () => {
        assert(type("'yes|no'|'true|false'").toAst()).narrowedValue([
            "'yes|no'",
            "|",
            "'true|false'"
        ])
    })
})
