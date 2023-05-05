import { describe, it } from "mocha"
import { type } from "../../src/main.js"
import { attest } from "../attest/main.js"

describe("record", () => {
    it("empty", () => {
        const o = type({})
        attest(o.root).equals(type("object").root)
    })
    it("required", () => {
        const o = type({ a: "string", b: "boolean[]" })
        attest(o.infer).typed as { a: string; b: boolean[] }
    })
    it("optional keys", () => {
        const o = type({ "a?": "string", b: "boolean[]" })
        attest(o.infer).typed as { a?: string; b: boolean[] }
        attest(o.root.key).snap(
            '((typeof $arkIn === "object" && $arkIn !== null) || typeof $arkIn === "function") && !(\'a\' in $arkIn) || typeof $arkIn.a === "string" && $arkIn.b instanceof Array'
        )
    })
    it("traverse optional", () => {
        const o = type({ "a?": "string" }, { keys: "strict" })
        attest(o({ a: "a" }).data).snap({ a: "a" })
        attest(o({}).data).snap({})
        attest(o({ a: 1 }).problems?.summary).snap(
            "a must be a string (was number)"
        )
    })
    it("invalid union", () => {
        const o = type([{ a: "string" }, "|", { b: "boolean" }], {
            keys: "strict"
        })
        // attest(o({ a: 2 }).problems?.summary).snap(
        //     'a must be a string or removed (was {"a":2})'
        // )
    })
    it("intersection", () => {
        const t = type({ a: "number" }).and({ b: "boolean" })
        // Should be simplified from {a: number} & {b: boolean} to {a: number, b: boolean}
        attest(t.infer).types.toString.snap("{ a: number; b: boolean; }")
    })
    it("escaped optional token", () => {
        const t = type({ "a\\?": "string" })
        attest(t.infer).typed as { "a?": string }
    })
    it("multiple bad strict", () => {
        const t = type({ a: "string", b: "boolean" }, { keys: "strict" })
        attest(t({ a: 1, b: 2 }).problems?.summary).snap(
            "a must be a string (was number)\nb must be boolean (was number)"
        )
    })
})
