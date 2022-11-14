import { attest } from "../dev/attest/exports.js"
import { describe, test } from "mocha"
import { type } from "../arktype.js"

describe("struct", () => {
    test("record", () => {
        const o = type({ a: "string", b: "boolean[]" })
        attest(o.infer).typed as { a: string; b: boolean[] }
        attest(o.attributes).snap({
            type: "dictionary",
            props: {
                a: { type: "string" },
                b: { type: "array", props: { "*": { type: "boolean" } } }
            },
            requiredKeys: { a: true, b: true }
        })
    })
    test("optional keys", () => {
        const o = type({ "a?": "string", b: "boolean[]" })
        attest(o.infer).typed as { a?: string | undefined; b: boolean[] }
        attest(o.attributes).snap({
            type: "dictionary",
            props: {
                a: { type: "string" },
                b: { type: "array", props: { "*": { type: "boolean" } } }
            },
            requiredKeys: { b: true }
        })
    })
})
