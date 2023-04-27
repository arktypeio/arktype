import { describe, it } from "mocha"
import { type } from "../../src/main.js"
import { writeUnterminatedEnclosedMessage } from "../../src/parse/string/shift/operand/enclosed.js"
import {
    writeExpressionExpectedMessage,
    writeUnresolvableMessage
} from "../../src/parse/string/shift/operand/unenclosed.js"
import { attest } from "../attest/main.js"

describe("string", () => {
    it("errors on empty string", () => {
        // @ts-expect-error
        attest(() => type("")).throws(writeExpressionExpectedMessage(""))
    })
    it("ignores whitespace between identifiers/operators", () => {
        const t = type(`  \n   string  |
        boolean    []   `)
        attest(t.infer).typed as string | boolean[]
        attest(t.root.toString()).snap()
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
        const t = type("/a/&/b/")
        // attest(t.node).snap({
        //     string: {
        //         regex: ["a", "b"]
        //     }
        // })
    })
    it("identical strings", () => {
        const t = type("/a/&/a/")
        // attest(t.node).snap({
        //     string: {
        //         regex: "a"
        //     }
        // })
    })
    it("string and list", () => {
        const left = type(["/a/", "&", "/b/&/c/"])
        // attest(left).snap({
        //     string: { regex: ["b", "c", "a"] }
        // })
        const right = type(["/a/", "&", "/b/&/c/"])
        // attest(right.node).snap({
        //     string: { regex: ["a", "b", "c"] }
        // })
    })
    it("redundant string and list", () => {
        // const expected: ResolvedNode = {
        //     string: {
        //         regex: ["a", "b", "c"]
        //     }
        // }
        const leftString = type(["/a/", "&", "/a/&/b/&/c/"])
        const rightString = type(["/a/&/b/&/c/", "&", "/c/"])
        // attest().equals(expected)
        // attest().equals(expected)
    })
    it("distinct lists", () => {
        const t = type(["/a/&/b/", "&", "/c/&/d/"])
        // attest(t.node).snap({
        //     string: {
        //         regex: ["a", "b", "c", "d"]
        //     }
        // })
    })
    it("overlapping lists", () => {
        const t = type(["/a/&/b/", "&", "/c/&/b/"])
        // attest(t.node).snap({
        //     string: {
        //         regex: ["a", "b", "c"]
        //     }
        // })
    })
    it("identical lists", () => {
        const t = type(["/a/&/b/", "&", "/b/&/a/"])
        // attest(t.node).snap({
        //     string: {
        //         regex: ["a", "b"]
        //     }
        // })
    })
})
