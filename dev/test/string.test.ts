import { attest } from "@arktype/attest"
import { type } from "arktype"
import { suite, test } from "mocha"
import { writeUnterminatedEnclosedMessage } from "../../src/parser/string/shift/operand/enclosed.js"
import {
    writeExpressionExpectedMessage,
    writeUnresolvableMessage
} from "../../src/parser/string/shift/operand/unenclosed.js"

suite("string", () => {
    test("errors on empty string", () => {
        // @ts-expect-error
        attest(() => type("")).throws(writeExpressionExpectedMessage(""))
    })
    test("ignores whitespace between identifiers/operators", () => {
        const t = type(`  \n   string  |
        boolean    []   `)
        attest(t.infer).typed as string | boolean[]
        attest(t.condition).equals(type("string|boolean[]").condition)
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
    test("shallow single autocomplete", () => {
        // @ts-expect-error
        attest(() => type("str")).types.errors(
            `Argument of type '"str"' is not assignable to parameter of type '"string"'`
        )
    })
    test("shallow multi autocomplete", () => {
        // @ts-expect-error
        attest(() => type("s")).types.errors(`"string" | "symbol" | "semver"`)
    })
    test("post-operator autocomplete", () => {
        // @ts-expect-error
        attest(() => type("string|num")).types.errors(`"string|number"`)
    })
})
