import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { scope, type } from "../exports.js"
import { buildUnresolvableMessage } from "../src/parse/shift/operand/unenclosed.js"

describe("scope", () => {
    test("single", () => {
        const s = scope({ a: "string" })
        attest(s.$.infer).typed as { a: string }
        attest(s.a.infer).typed as string
        attest(() =>
            // @ts-expect-error
            scope({ a: "strng" })
        ).throwsAndHasTypeError(buildUnresolvableMessage("strng"))
    })
    test("interdependent", () => {
        const s = scope({ a: "string>5", b: "email<=10", c: "a&b" })
        attest(s.c.infer).typed as string
        attest(s.c.root).equals({
            string: {
                regex: "^(.+)@(.+)\\.(.+)$",
                bounds: {
                    min: {
                        limit: 5,
                        exclusive: true
                    },
                    max: { limit: 10 }
                }
            }
        })
    })
    test("cyclic", () => {
        const s = scope({ a: { b: "b" }, b: { a: "a" } })
        attest(s.a.root).snap({
            object: {
                props: { b: "b" },
                requiredKeys: { b: true }
            }
        })
        // Type hint displays as any on hitting cycle
        attest(s.$.infer.a).typed as {
            b: {
                a: {
                    b: {
                        a: any
                    }
                }
            }
        }
        // But still yields correct types when properties are accessed
        attest(s.$.infer.b.a.b.a.b.a.b.a).typed as {
            b: {
                a: any
            }
        }
        // @ts-expect-error
        attest(s.$.infer.a.b.a.b.c).type.errors.snap(
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
            .typed as [number, never]
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
            a: {
                object: {
                    subtype: "array",
                    elements: { string: true }
                }
            },
            b: {
                object: {
                    subtype: "array",
                    elements: "a"
                }
            },
            d: { boolean: true }
        })
    })
})
