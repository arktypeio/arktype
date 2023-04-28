import { describe, it } from "mocha"
import { type } from "#arktype"
import { attest } from "#attest"

describe("record", () => {
    it("required", () => {
        const o = type({ a: "string", b: "boolean[]" })
        attest(o.infer).typed as { a: string; b: boolean[] }
        attest(o.node).snap({
            object: {
                props: {
                    a: "string",
                    b: {
                        object: {
                            class: "(function Array)",
                            props: { "[index]": "boolean" }
                        }
                    }
                }
            }
        })
    })
    it("optional keys", () => {
        const o = type({ "a?": "string", b: "boolean[]" })
        attest(o.infer).typed as { a?: string; b: boolean[] }
        attest(o.node).snap({
            object: {
                props: {
                    a: ["?", "string"],
                    b: {
                        object: {
                            class: "(function Array)",
                            props: { "[index]": "boolean" }
                        }
                    }
                }
            }
        })
    })
    it("data traversed optional", () => {
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
        attest(o({ a: 2 }).problems?.summary).snap(
            'a must be a string or removed (was {"a":2})'
        )
    })
    it("escaped optional token", () => {
        const t = type({ "a\\?": "string" })
        attest(t.infer).typed as { "a?": string }
        attest(t.node).equals({
            object: {
                props: { "a?": "string" }
            }
        })
    })
    it("multiple bad strict", () => {
        const t = type({ a: "string", b: "boolean" }, { keys: "strict" })
        attest(t({ a: 1, b: 2 }).problems?.summary).snap(
            "a must be a string (was number)\nb must be boolean (was number)"
        )
    })
})
