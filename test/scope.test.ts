import { describe, it } from "mocha"
import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import { buildUnresolvableMessage } from "../src/parse/string/shift/operand/unenclosed.ts"

describe("scope", () => {
    it("base definition", () => {
        const io = scope({ a: "string" })
        attest(io.a.infer).typed as string
        attest(() =>
            // @ts-expect-error
            scope({ a: "strong" })
        ).throwsAndHasTypeError(buildUnresolvableMessage("strong"))
    })
    it("type definition", () => {
        const io = scope({ a: type("string") })
        attest(io.a.infer).typed as string
        attest(() =>
            // @ts-expect-error
            scope({ a: type("strong") })
        ).throwsAndHasTypeError(buildUnresolvableMessage("strong"))
    })
    it("thunk definition", () => {
        const io = scope({ a: () => io.$.type("string") })
        attest(io.a.infer).typed as string
        attest(() => {
            // @ts-expect-error
            const io = scope({ a: () => io.$.type("strong") })
        }).throwsAndHasTypeError(buildUnresolvableMessage("strong"))
    })
    // we can't catch this in validation without breaking inference
    it("bad thunk inferred as never", () => {
        attest(() => {
            const io = scope({ a: () => true })
            attest([io.a]).typed as never[]
        })
    })
    it("interdependent", () => {
        const io = scope({ a: "string>5", b: "email<=10", c: "a&b" })
        attest(io.c.infer).typed as string
        attest(io.c.root).equals({
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
        const io = scope({ a: { b: "b" }, b: { a: "a" } })
        attest(io.a.root).snap({
            object: { props: { b: "b" } }
        })
        // Type hint displays as any on hitting cycle
        attest(io.a.infer).typed as {
            b: {
                a: {
                    b: {
                        a: any
                    }
                }
            }
        }
        // But still yields correct types when properties are accessed
        attest(io.$.infer.b.a.b.a.b.a.b.a).typed as {
            b: {
                a: any
            }
        }
        // @ts-expect-error
        attest(io.$.meta.infer.a.b.a.b.c).type.errors.snap(
            `Property 'c' does not exist on type '{ a: { b: ...; }; }'.`
        )
    })
    it("object array", () => {
        attest(scope({ a: "string", b: [{ c: "a" }] }).$.infer.b).typed as [
            {
                c: string
            }
        ]
    })
    it("doesn't try to validate any in scope", () => {
        const io = scope({ a: {} as any })
        attest(io.$.type(["number", "a"]).infer).typed as [number, never]
    })
    describe("extension", () => {
        it("base", () => {
            const io = scope({ definedInScope: "boolean" }).$.extend({
                a: "string[]",
                b: "a[]",
                c: "definedInScope"
            })
            attest(io.$.infer).typed as {
                a: string[]
                b: string[][]
                c: boolean
            }
            attest(io.a.root).snap({
                object: { subdomain: ["Array", "string"] }
            })
            attest(io.b.root).snap({
                object: { subdomain: ["Array", "a"] }
            })
            attest(io.c.root).snap({ boolean: true })
        })
    })
})
