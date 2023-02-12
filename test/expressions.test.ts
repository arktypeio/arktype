import { describe, it } from "mocha"
import { intersection, union } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import { arrayOf, keyOf } from "../src/scopes/standard.ts"

// TODO: add tests in scope
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
    it("array", () => {
        const t = arrayOf({ a: "string" })
        attest(t.infer).typed as {
            a: string
        }[]
        attest(t.node).snap({
            object: {
                class: "Array",
                props: { "[index]": { object: { props: { a: "string" } } } }
            }
        })
    })
    it("keyof", () => {
        const t = keyOf({ a: "string" })
        attest(t.infer).typed as "a"
        attest(t.node).snap({ string: { value: "a" } })
    })
})
