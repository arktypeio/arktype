import { suite, test } from "mocha"
import { type } from "../../src/main.js"
import { writeUnterminatedEnclosedMessage } from "../../src/parse/string/shift/operand/enclosed.js"
import { attest } from "../attest/main.js"

suite("parse enclosed", () => {
    test("with spaces", () => {
        attest(type("'this has spaces'").infer).typed as "this has spaces"
    })
    test("with neighbors", () => {
        attest(type("'foo'|/.*/[]").infer).typed as "foo" | string[]
    })
    suite("errors", () => {
        suite("unterminated", () => {
            test("regex", () => {
                // @ts-expect-error
                attest(() => type("/.*")).throwsAndHasTypeError(
                    writeUnterminatedEnclosedMessage(".*", "/")
                )
            })
            test("single-quote", () => {
                // @ts-expect-error
                attest(() => type("'.*")).throwsAndHasTypeError(
                    writeUnterminatedEnclosedMessage(".*", "'")
                )
            })
            test("double-quote", () => {
                // @ts-expect-error
                attest(() => type('".*')).throwsAndHasTypeError(
                    writeUnterminatedEnclosedMessage(".*", '"')
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
    test("ignores enclosed operators", () => {
        attest(type("'yes|no|maybe'").infer).typed as "yes|no|maybe"
    })
    test("mix of enclosed and unenclosed operators", () => {
        attest(type("'yes|no'|'true|false'").infer).typed as
            | "yes|no"
            | "true|false"
    })
    test("escaped enclosing", () => {
        const t = type("'don\\'t'")
        attest(t.infer).typed as "don't"
    })
})
