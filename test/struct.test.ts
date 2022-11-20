import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { type } from "../exports.js"

describe("struct", () => {
    test("record", () => {
        const o = type({ a: "string", b: "boolean[]" })
        attest(o.infer).typed as { a: string; b: boolean[] }
        attest(o.attributes).snap({
            type: "dictionary",
            props: {
                a: { type: "string", required: true },
                b: {
                    type: "array",
                    props: { "*": { type: "boolean" } },
                    required: true
                }
            }
        })
    })
    test("optional keys", () => {
        const o = type({ "a?": "string", b: "boolean[]" })
        attest(o.infer).typed as { a?: string | undefined; b: boolean[] }
        attest(o.attributes).snap({
            type: "dictionary",
            props: {
                a: { type: "string" },
                b: {
                    type: "array",
                    props: { "*": { type: "boolean" } },
                    required: true
                }
            }
        })
    })
})
