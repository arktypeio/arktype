import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../api.js"

describe("struct", () => {
    test("record", () => {
        const o = type({ a: "string", b: "boolean[]" })
        attest(o.infer).typed as { a: string; b: boolean[] }
        attest(o.attributes).snap({
            type: "dictionary",
            props: {
                a: { type: "string" },
                b: { type: "array", baseProp: { type: "boolean" } }
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
                b: { type: "array", baseProp: { type: "boolean" } }
            },
            requiredKeys: { b: true }
        })
    })
})
