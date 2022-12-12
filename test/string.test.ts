import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import type { Node } from "../exports.js"
import { type } from "../exports.js"
import { buildUnterminatedEnclosedMessage } from "../src/parse/shift/operand/enclosed.js"
import {
    buildExpressionExpectedMessage,
    buildUnresolvableMessage
} from "../src/parse/shift/operand/unenclosed.js"

describe("string", () => {
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

describe("regex intersections", () => {
    test("distinct strings", () => {
        attest(type("/a/&/b/").root).snap({
            string: {
                regex: { a: true, b: true }
            }
        })
    })
    test("identical strings", () => {
        attest(type("/a/&/a/").root).snap({
            string: {
                regex: "a"
            }
        })
    })
    test("string and list", () => {
        const expected = { a: true, b: true, c: true } as const
        attest(type(["/a/", "&", "/b/&/c/"]).root).snap({
            string: { regex: expected }
        })
        attest(type(["/a/&/b/", "&", "/c/"]).root).snap({
            string: { regex: expected }
        })
    })
    test("redundant string and list", () => {
        const expected: Node = {
            string: {
                regex: { a: true, b: true, c: true }
            }
        }
        attest(type(["/a/", "&", "/a/&/b/&/c/"]).root).equals(expected)
        attest(type(["/a/&/b/&/c/", "&", "/c/"]).root).equals(expected)
    })
    test("distinct lists", () => {
        attest(type(["/a/&/b/", "&", "/c/&/d/"]).root).snap({
            string: {
                regex: { a: true, b: true, c: true, d: true }
            }
        })
    })
    test("overlapping lists", () => {
        attest(type(["/a/&/b/", "&", "/c/&/b/"]).root).snap({
            string: {
                regex: { a: true, b: true, c: true }
            }
        })
    })
    test("identical lists", () => {
        attest(type(["/a/&/b/", "&", "/b/&/a/"]).root).snap({
            string: {
                regex: { a: true, b: true }
            }
        })
    })
})
