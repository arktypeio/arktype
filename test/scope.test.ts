import { describe, it } from "mocha"
import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import { buildUnresolvableMessage } from "../src/parse/string/shift/operand/unenclosed.ts"
import { buildDuplicateAliasMessage } from "../src/scope.ts"
import type { Type } from "../src/type.ts"

describe("scope", () => {
    it("base definition", () => {
        const types = scope({ a: "string" })
        attest(types.a.infer).typed as string
        attest(() =>
            // @ts-expect-error
            scope({ a: "strong" }).compile()
        ).throwsAndHasTypeError(buildUnresolvableMessage("strong"))
    })
    it("type definition", () => {
        // TODO: fix
        // const types = scope({ a: type("string") })
        // attest(types.a.infer).typed as string
        // attest(() =>
        //     // @ts-expect-error
        //     scope({ a: type("strong") })
        // ).throwsAndHasTypeError(buildUnresolvableMessage("strong"))
    })
    it("interdependent", () => {
        const types = scope({
            a: "string>5",
            b: "email<=10",
            c: "a&b"
        })
        attest(types.c.infer).typed as string
        attest(types.c.node).equals({
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
        attest(types.a.node).snap({
            object: { props: { b: "b" } }
        })
        // Type hint displays as "..." on hitting cycle (or any if "noErrorTruncation" is true)
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
        attest(types.b.infer.a.b.a.b.a.b.a).typed as {
            b: {
                a: any
            }
        }
        // @ts-expect-error
        attest(types.a.infer.b.a.b.c).type.errors.snap(
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
        attest(types.a).typed as Type
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
            attest(types.a.node).snap({
                object: { subdomain: ["Array", "string"] }
            })
            attest(types.b.node).snap({
                object: { subdomain: ["Array", "a"] }
            })
            attest(types.c.node).snap({ boolean: true })
        })
        describe("errors", () => {
            it("duplicate alias", () => {
                attest(() => {
                    // @ts-expect-error
                    scope({ a: "string" }).$.extend({ a: "number" })
                }).throwsAndHasTypeError(buildDuplicateAliasMessage("a"))
            })
        })
    })
})
