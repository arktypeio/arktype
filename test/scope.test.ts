import { describe, it } from "mocha"
import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import { writeUnresolvableMessage } from "../src/parse/string/shift/operand/unenclosed.ts"
import { writeDuplicateAliasMessage } from "../src/scope.ts"

describe("scope", () => {
    it("base definition", () => {
        const types = scope({ a: "string" }).compile()
        attest(types.a.infer).typed as string
        attest(() =>
            // @ts-expect-error
            scope({ a: "strong" }).compile()
        ).throwsAndHasTypeError(writeUnresolvableMessage("strong"))
    })
    it("type definition", () => {
        const types = scope({ a: type("string") }).compile()
        attest(types.a.infer).typed as string
        attest(() =>
            // @ts-expect-error
            scope({ a: type("strong") })
        ).throwsAndHasTypeError(writeUnresolvableMessage("strong"))
    })
    it("interdependent", () => {
        const types = scope({
            a: "string>5",
            b: "email<=10",
            c: "a&b"
        }).compile()
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
        const types = scope({ a: { b: "b" }, b: { a: "a" } }).compile()
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
        const types = scope({ a: "string", b: [{ c: "a" }] }).compile()
        attest(types.b.infer).typed as [
            {
                c: string
            }
        ]
    })
    it("doesn't try to validate any in scope", () => {
        const $ = scope({ a: {} as any })
        attest($.infer).typed as { a: never }
        attest($.type(["number", "a"]).infer).typed as [number, never]
    })
    describe("extension", () => {
        it("base", () => {
            const $ = scope(
                {
                    a: "string[]",
                    b: "a[]",
                    c: "definedInScope"
                },
                { includes: [scope({ definedInScope: "boolean" })] }
            )
            attest($.infer).typed as {
                a: string[]
                b: string[][]
                c: boolean
            }
            const types = $.compile()
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
                    scope(
                        // @ts-expect-error
                        { a: "string" },
                        { includes: [scope({ a: "string" })] }
                    )
                }).throwsAndHasTypeError(writeDuplicateAliasMessage("a"))
            })
        })
    })
})
