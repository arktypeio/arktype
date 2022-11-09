import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { scope, type } from "../api.js"
import { buildUnresolvableMessage } from "../parse/operand/unenclosed.js"

describe("scope", () => {
    test("single", () => {
        attest(scope({ a: "string" }).$.infer.a).typed as string
        attest(() =>
            // @ts-expect-error
            scope({ a: "strig" })
        ).throwsAndHasTypeError(buildUnresolvableMessage("strig"))
    })
    test("interdependent", () => {
        const types = scope({ a: "string>5", b: "email<=10", c: "a&b" })
        attest(types.c.attributes).equals({
            type: "string",
            regex: "/^(.+)@(.+)\\.(.+)$/",
            bounds: ">5<=10"
        })
        attest(types.$.infer.c).typed as string
    })
    test("cyclic", () => {
        const cyclicSpace = scope({ a: { b: "b" }, b: { a: "a" } })
        attest(cyclicSpace.a.attributes).snap({
            type: "dictionary",
            props: {
                b: { type: "dictionary", props: { a: { alias: "a" } } }
            }
        })
        // Type hint displays as any on hitting cycle
        attest(cyclicSpace.$.infer.a).typed as {
            b: {
                a: {
                    b: {
                        a: any
                    }
                }
            }
        }
        // But still yields correct types when properties are accessed
        attest(cyclicSpace.$.infer.b.a.b.a.b.a.b.a).typed as {
            b: {
                a: any
            }
        }
        // @ts-expect-error
        attest(cyclicSpace.$.infer.a.b.a.b.c).type.errors.snap(
            `Property 'c' does not exist on type '{ a: { b: ...; }; }'.`
        )
    })
    test("object array", () => {
        attest(scope({ a: "string", b: [{ c: "a" }] }).$.infer.b).typed as [
            {
                c: string
            }
        ]
    })
    test("doesn't try to validate any in scope", () => {
        attest(type(["number", "a"], { scope: scope({ a: {} as any }) }).infer)
            .typed as [number, unknown]
    })
    test("parent scope", () => {
        const s = scope(
            { a: "string[]", b: "a[]", d: "definedInScope" },
            { scope: scope({ definedInScope: "boolean" }) }
        )
        attest(s.$.infer).typed as {
            a: string[]
            b: string[][]
            d: boolean
        }
        attest(s.$.attributes).snap({
            a: { type: "array", props: { "*": { type: "string" } } },
            b: {
                type: "array",
                props: {
                    "*": { type: "array", props: { "*": { type: "string" } } }
                }
            },
            d: { type: "boolean" }
        })
    })
})
