import { describe, it } from "mocha"
import { attest } from "../dev/attest/exports.ts"
import type { TypeNode } from "../exports.ts"
import { type } from "../exports.ts"
import { buildUnterminatedEnclosedMessage } from "../src/parse/string/shift/operand/enclosed.ts"
import {
    buildExpressionExpectedMessage,
    buildUnresolvableMessage
} from "../src/parse/string/shift/operand/unenclosed.ts"

describe("string", () => {
    it("errors on empty string", () => {
        // @ts-expect-error
        attest(() => type("")).throwsAndHasTypeError(
            buildExpressionExpectedMessage("")
        )
    })
    it("ignores whitespace between identifiers/operators", () => {
        const modelWithWhitespace = type("     string  | boolean    []   ")
        attest(modelWithWhitespace.infer).typed as string | boolean[]
    })
    it("errors on bad whitespace", () => {
        attest(() =>
            // @ts-expect-error
            type("string | boo lean[]")
        ).throwsAndHasTypeError(buildUnresolvableMessage("boo"))
    })
    it("unterminated string", () => {
        // @ts-expect-error
        attest(() => type("'bob")).throwsAndHasTypeError(
            buildUnterminatedEnclosedMessage("bob", "'")
        )
    })
})

describe("regex intersections", () => {
    it("distinct strings", () => {
        attest(type("/a/&/b/").root).snap({
            string: {
                regex: ["a", "b"]
            }
        })
    })
    it("identical strings", () => {
        attest(type("/a/&/a/").root).snap({
            string: {
                regex: "a"
            }
        })
    })
    // TODO: Use set comparisons https://github.com/arktypeio/arktype/issues/557
    it("string and list", () => {
        attest(type(["/a/", "&", "/b/&/c/"]).root).snap({
            string: { regex: ["b", "c", "a"] }
        })
        attest(type(["/a/&/b/", "&", "/c/"]).root).snap({
            string: { regex: ["a", "b", "c"] }
        })
    })
    it("redundant string and list", () => {
        const expected: TypeNode = {
            string: {
                regex: ["a", "b", "c"]
            }
        }
        attest(type(["/a/", "&", "/a/&/b/&/c/"]).root).equals(expected)
        attest(type(["/a/&/b/&/c/", "&", "/c/"]).root).equals(expected)
    })
    it("distinct lists", () => {
        attest(type(["/a/&/b/", "&", "/c/&/d/"]).root).snap({
            string: {
                regex: ["a", "b", "c", "d"]
            }
        })
    })
    it("overlapping lists", () => {
        attest(type(["/a/&/b/", "&", "/c/&/b/"]).root).snap({
            string: {
                regex: ["a", "b", "c"]
            }
        })
    })
    it("identical lists", () => {
        attest(type(["/a/&/b/", "&", "/b/&/a/"]).root).snap({
            string: {
                regex: ["a", "b"]
            }
        })
    })
})
