import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { ArkType } from "../../../type.js"
import { buildUnterminatedEnclosedMessage } from "../enclosed.js"

describe("parse enclosed", () => {
    test("with spaces", () => {
        attest(ArkType("'this has spaces'").infer).typed as "this has spaces"
    })
    test("isolated", () => {
        attest(ArkType('"alone"').infer).typed as '"alone"'
    })
    test("with neighbors", () => {
        attest(ArkType("'foo'|/.*/[]").infer).typed as "foo" | string[]
    })
    describe("errors", () => {
        describe("unterminated", () => {
            test("regex", () => {
                // @ts-expect-error
                attest(() => ArkType("/.*")).throwsAndHasTypeError(
                    buildUnterminatedEnclosedMessage("/.*", "/")
                )
            })
            test("single-quote", () => {
                // @ts-expect-error
                attest(() => ArkType("'.*")).throwsAndHasTypeError(
                    buildUnterminatedEnclosedMessage("'.*", "'")
                )
            })
            test("double-quote", () => {
                // @ts-expect-error
                attest(() => ArkType('".*')).throwsAndHasTypeError(
                    buildUnterminatedEnclosedMessage('".*', '"')
                )
            })
        })
    })
    test("single-quoted", () => {
        attest(ArkType("'hello'").infer).typed as "'hello'"
    })
    test("double-quoted", () => {
        attest(ArkType('"goodbye"').infer).typed as '"goodbye"'
    })
    test("regex literal", () => {
        attest(ArkType("/.*/").infer).typed as string
    })
    test("invalid regex", () => {
        attest(() => ArkType("/[/")).throws.snap(
            `SyntaxError: Invalid regular expression: /[/: Unterminated character class`
        )
    })
    test("mixed quote types", () => {
        attest(ArkType(`"'single-quoted'"`).infer)
            .typed as "\"'single-quoted'\""

        attest(ArkType(`'"double-quoted"'`).infer)
            .typed as "'\"double-quoted\"'"
    })
    test("ignores enclosed tokens", () => {
        attest(ArkType("'yes|no|maybe'").infer).typed as "'yes|no|maybe'"
    })
    test("mix of enclosed and unenclosed tokens", () => {
        attest(ArkType("'yes|no'|'true|false'").infer).typed as
            | "yes|no"
            | "true|false"
    })
})
