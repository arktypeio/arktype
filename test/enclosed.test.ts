import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { type } from "../exports.js"
import { buildUnterminatedEnclosedMessage } from "../src/parse/string/shift/operand/enclosed.js"

describe("parse enclosed", () => {
    test("with spaces", () => {
        attest(type("'this has spaces'").infer).typed as "this has spaces"
    })
    test("with neighbors", () => {
        attest(type("'foo'|/.*/[]").infer).typed as "foo" | string[]
    })
    describe("errors", () => {
        describe("unterminated", () => {
            test("regex", () => {
                // @ts-expect-error
                attest(() => type("/.*")).throwsAndHasTypeError(
                    buildUnterminatedEnclosedMessage(".*", "/")
                )
            })
            test("single-quote", () => {
                // @ts-expect-error
                attest(() => type("'.*")).throwsAndHasTypeError(
                    buildUnterminatedEnclosedMessage(".*", "'")
                )
            })
            test("double-quote", () => {
                // @ts-expect-error
                attest(() => type('".*')).throwsAndHasTypeError(
                    buildUnterminatedEnclosedMessage(".*", '"')
                )
            })
        })
    })
    test("single-quoted", () => {
        attest(type("'hello'").infer).typed as "hello"
    })
    test("double-quoted", () => {
        attest(type('"goodbye"').infer).typed as "goodbye"
    })
    test("regex literal", () => {
        attest(type("/.*/").infer).typed as string
    })
    test("invalid regex", () => {
        attest(() => type("/[/")).throws.snap(
            `SyntaxError: Invalid regular expression: /[/: Unterminated character class`
        )
    })
    test("mixed quote types", () => {
        attest(type(`"'single-quoted'"`).infer).typed as "'single-quoted'"

        attest(type(`'"double-quoted"'`).infer).typed as '"double-quoted"'
    })
    test("ignores enclosed tokens", () => {
        attest(type("'yes|no|maybe'").infer).typed as "yes|no|maybe"
    })
    test("mix of enclosed and unenclosed tokens", () => {
        attest(type("'yes|no'|'true|false'").infer).typed as
            | "yes|no"
            | "true|false"
    })
    test("escaped enclosing", () => {
        const t = type("'don\\'t'")
        attest(t.infer).typed as "don't"
        attest(type("'don\\'t'").root).equals({
            string: { value: "don't" }
        })
    })
})
