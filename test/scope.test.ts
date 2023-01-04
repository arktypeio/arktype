import { describe, it } from "mocha"
import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import { buildUnresolvableMessage } from "../src/parse/string/shift/operand/unenclosed.ts"

describe("scope", () => {
    it("base definition", () => {
        const types = scope({ a: "string" })
        attest(types.a.infer).typed as string
        attest(() =>
            // @ts-expect-error
            scope({ a: "strong" })
        ).throwsAndHasTypeError(buildUnresolvableMessage("strong"))
    })
    it("type definition", () => {
        const types = scope({ a: type("string") })
        attest(types.a.infer).typed as string
        attest(() =>
            // @ts-expect-error
            scope({ a: type("strong") })
        ).throwsAndHasTypeError(buildUnresolvableMessage("strong"))
    })
    it("thunk definition", () => {
        const types = scope({ a: () => types.$.type("string") })
        attest(types.a.infer).typed as string
        attest(() => {
            // @ts-expect-error
            const types = scope({ a: () => types.$.type("strong") })
        }).throwsAndHasTypeError(buildUnresolvableMessage("strong"))
    })
    // we can't catch this in validation without breaking inference
    it("bad thunk inferred as never", () => {
        attest(() => {
            const types = scope({ a: () => true })
            attest([types.a]).typed as never[]
        })
    })
    it("interdependent", () => {
        const types = scope({ a: "string>5", b: "email<=10", c: "a&b" })
        attest(types.c.infer).typed as string
        attest(types.c.root).equals({
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
        const types = scope({ a: { b: "b" }, b: { a: "a" } })
        attest(types.a.root).snap({
            object: { props: { b: "b" } }
        })
        // Type hint displays as any on hitting cycle
        attest(types.a.infer).typed as {
            b: {
                a: {
                    b: {
                        a: any
                    }
                }
            }
        }
        // But still yields correct types when properties are accessed
        attest(types.$.infer.b.a.b.a.b.a.b.a).typed as {
            b: {
                a: any
            }
        }
        // @ts-expect-error
        attest(types.$.infer.a.b.a.b.c).type.errors.snap(
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
        const types = scope({ a: {} as any })
        attest(types.$.type(["number", "a"]).infer).typed as [number, never]
    })
    describe("extension", () => {
        it("base", () => {
            const types = scope({ definedInScope: "boolean" }).$.extend({
                a: "string[]",
                b: "a[]",
                c: "definedInScope"
            })
            attest(types.$.infer).typed as {
                a: string[]
                b: string[][]
                c: boolean
            }
            attest(types.a.root).snap({
                object: { subdomain: ["Array", "string"] }
            })
            attest(types.b.root).snap({
                object: { subdomain: ["Array", "a"] }
            })
            attest(types.c.root).snap({ boolean: true })
        })
    })
})
