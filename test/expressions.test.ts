import { describe, it } from "mocha"
import { intersection, union } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("expressions", () => {
    it("intersection", () => {
        const t = intersection({ a: "string" }, { b: "boolean" })
        attest(t.infer).typed as {
            a: string
            b: boolean
        }
        attest(t.node).snap({
            object: { props: { a: "string", b: "boolean" } }
        })
    })
    it("union", () => {
        const t = union({ a: "string" }, { b: "boolean" })
        attest(t.infer).typed as
            | {
                  a: string
              }
            | {
                  b: boolean
              }
        attest(t.node).snap({
            object: [{ props: { a: "string" } }, { props: { b: "boolean" } }]
        })
    })
})
