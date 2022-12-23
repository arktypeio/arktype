import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.ts"
import { type } from "../exports.ts"

describe("record", () => {
    test("required", () => {
        const o = type({ a: "string", b: "boolean[]" })
        attest(o.infer).typed as { a: string; b: boolean[] }
        attest(o.root).snap({
            object: {
                props: {
                    a: "string",
                    b: { object: { subdomain: ["Array", "boolean"] } }
                }
            }
        })
    })
    test("optional keys", () => {
        const o = type({ "a?": "string", b: "boolean[]" })
        attest(o.infer).typed as { a?: string; b: boolean[] }
        attest(o.root).snap({
            object: {
                props: {
                    a: ["?", "string"],
                    b: { object: { subdomain: ["Array", "boolean"] } }
                }
            }
        })
    })
    test("escaped optional token", () => {
        const t = type({ "a\\?": "string" })
        attest(t.infer).typed as { "a?": string }
        attest(t.root).equals({
            object: {
                props: { "a?": "string" }
            }
        })
    })
})
