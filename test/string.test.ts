import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { type } from "../exports.js"
import { buildUnterminatedEnclosedMessage } from "../src/parse/shift/operand/enclosed.js"
import {
    buildExpressionExpectedMessage,
    buildUnresolvableMessage
} from "../src/parse/shift/operand/unenclosed.js"

describe("string", () => {
    describe("regex", () => {
        test("intersection", () => {
            attest(type("'bob'&/bob/").root).snap({
                type: "string",
                subtype: "bob"
            })
        })
    })
    test("errors on empty string", () => {
        // @ts-expect-error
        attest(() => type("")).throwsAndHasTypeError(
            buildExpressionExpectedMessage("")
        )
    })
    test("ignores whitespace between identifiers/operators", () => {
        const modelWithWhitespace = type("     string  | boolean    []   ")
        attest(modelWithWhitespace.infer).typed as string | boolean[]
    })
    test("errors on bad whitespace", () => {
        attest(() =>
            // @ts-expect-error
            type("string | boo lean[]")
        ).throwsAndHasTypeError(buildUnresolvableMessage("boo"))
    })
    test("unterminated string", () => {
        // @ts-expect-error
        attest(() => type("'bob")).throwsAndHasTypeError(
            buildUnterminatedEnclosedMessage("bob", "'")
        )
    })
})
