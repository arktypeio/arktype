import { describe, it } from "mocha"
import { type } from "../../src/main.js"
import type { ResolvedNode } from "../../src/nodes/node.js"
import { writeUnterminatedEnclosedMessage } from "../../src/parse/string/shift/operand/enclosed.js"
import {
    writeExpressionExpectedMessage,
    writeUnresolvableMessage
} from "../../src/parse/string/shift/operand/unenclosed.js"
import { attest } from "arktype-attest"

describe("string", () => {
    it("errors on empty string", () => {
        // @ts-expect-error
        attest(() => type("")).throws(writeExpressionExpectedMessage(""))
    })
    it("ignores whitespace between identifiers/operators", () => {
        const t = type("     string  | boolean    []   ")
        attest(t.infer).typed as string | boolean[]
    })
    it("errors on bad whitespace", () => {
        attest(() =>
            // @ts-expect-error
            type("string | boo lean[]")
        )
            .throws(writeUnresolvableMessage("boo"))
            .type.errors("string | boolean")
    })
    it("unterminated string", () => {
        // @ts-expect-error
        attest(() => type("'bob")).throwsAndHasTypeError(
            writeUnterminatedEnclosedMessage("bob", "'")
        )
    })
})

describe("regex intersections", () => {
    it("distinct strings", () => {
        attest(type("/a/&/b/").node).snap({
            string: {
                regex: ["a", "b"]
            }
        })
    })
    it("identical strings", () => {
        attest(type("/a/&/a/").node).snap({
            string: {
                regex: "a"
            }
        })
    })
    it("string and list", () => {
        attest(type(["/a/", "&", "/b/&/c/"]).node).snap({
            string: { regex: ["b", "c", "a"] }
        })
        attest(type(["/a/&/b/", "&", "/c/"]).node).snap({
            string: { regex: ["a", "b", "c"] }
        })
    })
    it("redundant string and list", () => {
        const expected: ResolvedNode = {
            string: {
                regex: ["a", "b", "c"]
            }
        }
        attest(type(["/a/", "&", "/a/&/b/&/c/"]).node).equals(expected)
        attest(type(["/a/&/b/&/c/", "&", "/c/"]).node).equals(expected)
    })
    it("distinct lists", () => {
        attest(type(["/a/&/b/", "&", "/c/&/d/"]).node).snap({
            string: {
                regex: ["a", "b", "c", "d"]
            }
        })
    })
    it("overlapping lists", () => {
        attest(type(["/a/&/b/", "&", "/c/&/b/"]).node).snap({
            string: {
                regex: ["a", "b", "c"]
            }
        })
    })
    it("identical lists", () => {
        attest(type(["/a/&/b/", "&", "/b/&/a/"]).node).snap({
            string: {
                regex: ["a", "b"]
            }
        })
    })
})
