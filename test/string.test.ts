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
        test("same regex", () => {
            attest(type("/hello/&/hello/").root).snap({
                type: "string",
                regex: "hello"
            })
        })
        test("multiple regex", () => {
            attest(type("/hello/&/notHello/&/goodbye/").root).snap({
                type: "string",
                regex: ["hello", "notHello", "goodbye"]
            })
        })
        test("tuple expression regex", () => {
            attest(type(["/regex/", "&", "/string/"]).root).snap({
                type: "string",
                regex: ["regex", "string"]
            })
        })
        test("two lists of regex", () => {
            attest(type(["/def/&/abc/", "&", "/xyz/&/def/"]).root).snap({
                type: "string",
                regex: ["def", "abc", "xyz"]
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
