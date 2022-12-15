import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import type { TypeNode } from "../exports.js"
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
                regex: ["a", "b"]
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
    // TODO: Use set comparisons https://github.com/arktypeio/arktype/issues/557
    test("string and list", () => {
        attest(type(["/a/", "&", "/b/&/c/"]).root).snap({
            string: { regex: ["b", "c", "a"] }
        })
        attest(type(["/a/&/b/", "&", "/c/"]).root).snap({
            string: { regex: ["a", "b", "c"] }
        })
    })
    test("redundant string and list", () => {
        const expected: TypeNode = {
            string: {
                regex: ["a", "b", "c"]
            }
        }
        attest(type(["/a/", "&", "/a/&/b/&/c/"]).root).equals(expected)
        attest(type(["/a/&/b/&/c/", "&", "/c/"]).root).equals(expected)
    })
    test("distinct lists", () => {
        attest(type(["/a/&/b/", "&", "/c/&/d/"]).root).snap({
            string: {
                regex: ["a", "b", "c", "d"]
            }
        })
    })
    test("overlapping lists", () => {
        attest(type(["/a/&/b/", "&", "/c/&/b/"]).root).snap({
            string: {
                regex: ["a", "b", "c"]
            }
        })
    })
    test("identical lists", () => {
        attest(type(["/a/&/b/", "&", "/b/&/a/"]).root).snap({
            string: {
                regex: ["a", "b"]
            }
        })
    })
})
