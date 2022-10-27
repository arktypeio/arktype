import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../../../type.js"
import { Enclosed } from "../enclosed.js"

describe("parse enclosed", () => {
    test("with spaces", () => {
        attest(type("'this has spaces'").infer).typed as "this has spaces"
    })
    test("isolated", () => {
        attest(type('"alone"').ast).narrowedValue('"alone"')
    })
    test("with neighbors", () => {
        attest(type("'foo'|/.*/[]").ast).narrowedValue([
            "'foo'",
            "|",
            ["/.*/", "[]"]
        ])
    })
    describe("errors", () => {
        describe("unterminated", () => {
            test("regex", () => {
                // @ts-expect-error
                attest(() => type("/.*")).throwsAndHasTypeError(
                    Enclosed.buildUnterminatedMessage("/.*", "/")
                )
            })
            test("single-quote", () => {
                // @ts-expect-error
                attest(() => type("'.*")).throwsAndHasTypeError(
                    Enclosed.buildUnterminatedMessage("'.*", "'")
                )
            })
            test("double-quote", () => {
                // @ts-expect-error
                attest(() => type('".*')).throwsAndHasTypeError(
                    Enclosed.buildUnterminatedMessage('".*', '"')
                )
            })
        })
    })
    test("single-quoted", () => {
        attest(type("'hello'").ast).narrowedValue("'hello'")
    })
    test("double-quoted", () => {
        attest(type('"goodbye"').ast).narrowedValue('"goodbye"')
    })
    test("regex literal", () => {
        attest(type("/.*/").ast).narrowedValue("/.*/")
    })
    test("invalid regex", () => {
        attest(() => type("/[/")).throws.snap(
            `SyntaxError: Invalid regular expression: /[/: Unterminated character class`
        )
    })
    test("mixed quote types", () => {
        attest(type(`"'single-quoted'"`).ast).narrowedValue(
            "\"'single-quoted'\""
        )
        attest(type(`'"double-quoted"'`).ast).narrowedValue(
            "'\"double-quoted\"'"
        )
    })
    test("ignores enclosed tokens", () => {
        attest(type("'yes|no|maybe'").ast).narrowedValue("'yes|no|maybe'")
    })
    test("mix of enclosed and unenclosed tokens", () => {
        attest(type("'yes|no'|'true|false'").ast).narrowedValue([
            "'yes|no'",
            "|",
            "'true|false'"
        ])
    })
})
