import { describe, it } from "mocha"
import { type } from "../../src/main.ts"
import { attest } from "../attest/main.ts"

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
                            class: "Array",
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
                            class: "Array",
                            props: { "[index]": "boolean" }
                        }
                    }
                }
            }
        })
    })
    it("strict optional", () => {
        const o = type({ "a?": "string" }, { keys: "strict" })
        attest(o({ a: "string" }).data).snap({ a: "string" })
    })
    it("fail fast non valid union strictly", () => {
        const o = type([{ a: "string" }, "|", { b: "boolean" }], {
            keys: "strict"
        })
        attest(o({ a: 2 }).problems?.summary).snap(
            'a must be a string or removed (was {"a":2})'
        )
    })
    it("fail fast non valid union distilled", () => {
        const o = type([{ a: "string" }, "|", { b: "boolean" }], {
            keys: "distilled"
        })
        attest(o({ a: 2 }).problems?.summary).snap()
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
})
