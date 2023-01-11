import { describe, it } from "mocha"
import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import { buildUnresolvableMessage } from "../src/parse/string/shift/operand/unenclosed.ts"
import { buildDuplicateAliasMessage } from "../src/scope.ts"

describe("scope", () => {
    it("base definition", () => {
        const types = scope({ a: "string" }).compile()
        attest(types.a.infer).typed as string
        attest(() =>
            // @ts-expect-error
            scope({ a: "strong" }).compile()
        ).throwsAndHasTypeError(buildUnresolvableMessage("strong"))
    })
    it("type definition", () => {
        const types = scope({ a: type("string") }).compile()
        attest(types.a.infer).typed as string
        attest(() =>
            // @ts-expect-error
            scope({ a: type("strong") })
        ).throwsAndHasTypeError(buildUnresolvableMessage("strong"))
    })
    it("thunk definition", () => {
        const $ = scope({ a: () => $.type("string") })
        const types = $.compile()
        attest(types.a.infer).typed as string
        attest(() => {
            // @ts-expect-error
            const types = scope({ a: () => types.type("strong") })
            types.compile()
        }).throwsAndHasTypeError(buildUnresolvableMessage("strong"))
    })
    // we can't catch this in validation without breaking inference
    it("bad thunk inferred as never", () => {
        attest(() => {
            const types = scope({ a: () => true }).compile()
            attest(types).typed as { a: never }
        })
    })
    it("interdependent", () => {
        const types = scope({
            a: "string>5",
            b: "email<=10",
            c: "a&b"
        }).compile()
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
        const types = scope({ a: { b: "b" }, b: { a: "a" } }).compile()
        attest(types.a.root).snap({
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
        attest(scope({ a: "string", b: [{ c: "a" }] }).infer.b).typed as [
            {
                c: string
            }
        ]
    })
    it("doesn't try to validate any in scope", () => {
        const $ = scope({ a: {} as any })
        attest($.type(["number", "a"]).infer).typed as [number, never]
    })
    describe("extension", () => {
        it("base", () => {
            const $ = scope({ definedInScope: "boolean" }).extend({
                a: "string[]",
                b: "a[]",
                c: "definedInScope"
            })
            attest($.infer).typed as {
                a: string[]
                b: string[][]
                c: boolean
            }
            const types = $.compile()
            attest(types.a.root).snap({
                object: { subdomain: ["Array", "string"] }
            })
            attest(types.b.root).snap({
                object: { subdomain: ["Array", "a"] }
            })
            attest(types.c.root).snap({ boolean: true })
        })
        describe("errors", () => {
            it("duplicate alias", () => {
                attest(() => {
                    // @ts-expect-error
                    scope({ a: "string" }).extend({ a: "number" })
                }).throwsAndHasTypeError(buildDuplicateAliasMessage("a"))
            })
        })
    })
})
