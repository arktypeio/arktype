import { describe, it } from "mocha"
import { scope } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import { buildUnresolvableMessage } from "../src/parse/string/shift/operand/unenclosed.ts"

describe("scope", () => {
    it("single", () => {
        const s = scope({ a: "string" })
        attest(s.infer).typed as { a: string }
        attest(s.types.a.infer).typed as string
        attest(() =>
            // @ts-expect-error
            scope({ a: "strng" })
        ).throwsAndHasTypeError(buildUnresolvableMessage("strng"))
    })
    it("interdependent", () => {
        const s = scope({ a: "string>5", b: "email<=10", c: "a&b" })
        attest(s.types.c.infer).typed as string
        attest(s.types.c.root).equals({
            string: {
                regex: "^(.+)@(.+)\\.(.+)$",
                range: {
                    min: {
                        limit: 5,
                        exclusive: true
                    },
                    max: { limit: 10 }
                }
            }
        })
    })
    it("cyclic", () => {
        const s = scope({ a: { b: "b" }, b: { a: "a" } })
        attest(s.types.a.root).snap({
            object: { props: { b: "b" } }
        })
        // Type hint displays as any on hitting cycle
        attest(s.infer.a).typed as {
            b: {
                a: {
                    b: {
                        a: any
                    }
                }
            }
        }
        // But still yields correct types when properties are accessed
        attest(s.infer.b.a.b.a.b.a.b.a).typed as {
            b: {
                a: any
            }
        }
        // @ts-expect-error
        attest(s.infer.a.b.a.b.c).type.errors.snap(
            `Property 'c' does not exist on type '{ a: { b: ...; }; }'.`
        )
    })
    it("object array", () => {
        attest(scope({ a: "string", b: [{ c: "a" }] }).infer.b).typed as [
            {
                c: string
            }
        ]
    })
    it("doesn't try to validate any in scope", () => {
        const s = scope({ a: {} as any })
        attest(s.type(["number", "a"]).infer).typed as [number, never]
    })
    it("parent scope", () => {
        const s = scope({ definedInScope: "boolean" }).extend({
            a: "string[]",
            b: "a[]",
            c: "definedInScope"
        })
        attest(s.infer).typed as {
            a: string[]
            b: string[][]
            c: boolean
        }
        attest(s.types.a.root).snap({
            object: { subdomain: ["Array", "string"] }
        })
        attest(s.types.b.root).snap({ object: { subdomain: ["Array", "a"] } })
        attest(s.types.c.root).snap({ boolean: true })
    })
})
