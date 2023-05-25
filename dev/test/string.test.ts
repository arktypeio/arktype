import { suite, test } from "mocha"
import { type } from "../../src/main.js"
import { writeUnterminatedEnclosedMessage } from "../../src/parse/string/shift/operand/enclosed.js"
import {
    writeExpressionExpectedMessage,
    writeUnresolvableMessage
} from "../../src/parse/string/shift/operand/unenclosed.js"
import { attest } from "../attest/main.js"

suite("string", () => {
    test("errors on empty string", () => {
        // @ts-expect-error
        attest(() => type("")).throws(writeExpressionExpectedMessage(""))
    })
    test("ignores whitespace between identifiers/operators", () => {
        const t = type(`  \n   string  |
        boolean    []   `)
        attest(t.infer).typed as string | boolean[]
        attest(t.root.toString()).snap("[object Object]")
    })
    test("errors on bad whitespace", () => {
        attest(() =>
            // @ts-expect-error
            type("string | boo lean[]")
        )
            .throws(writeUnresolvableMessage("boo"))
            .types.errors("string | boolean")
    })
    test("unterminated string", () => {
        // @ts-expect-error
        attest(() => type("'bob")).throwsAndHasTypeError(
            writeUnterminatedEnclosedMessage("bob", "'")
        )
    })
})
