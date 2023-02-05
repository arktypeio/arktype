import { describe, it } from "mocha"
import type { Type } from "../api.ts"
import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import type { Out } from "../src/parse/tuple/morph.ts"

describe("node definitions", () => {
    it("base", () => {
        const t = type(["node", { string: true }])
        attest(t.node).snap({ string: true })
        attest(t.flat).snap("string")
    })
    it("alias", () => {
        const types = scope({
            a: ["node", { object: { props: { b: "b" } } }],
            b: "boolean"
        }).compile()
        attest(types.a).typed as Type<{ b: boolean }>
    })
    it("literals", () => {
        const t = type([
            "node",
            // for now, requires as const, downcast, or similar
            {
                string: { value: "foo" },
                number: { value: 3.14159 },
                object: { value: { k: "v" } }
            } as const
        ])
        attest(t.infer).typed as
            | "foo"
            | 3.14159
            | {
                  k: "v"
              }
    })
    it("optional props", () => {
        const t = type([
            "node",
            {
                object: {
                    props: {
                        a: "string",
                        b: ["?", "boolean"]
                    }
                }
            }
        ])
        attest(t.infer).typed as {
            a: string
            b?: boolean | undefined
        }
    })
    it("arrays", () => {
        const t = type([
            "node",
            {
                object: {
                    subdomain: [
                        "Array",
                        { object: { props: { name: "string" } } }
                    ]
                }
            }
        ])
        attest(t.infer).typed as { name: string }[]
    })
    it("tuples", () => {
        const t = type([
            "node",
            {
                object: {
                    subdomain: ["Array", "string"],
                    range: { limit: 5, comparator: "==" }
                }
            } as const
        ])
        attest(t.infer).typed as [string, string, string, string, string]
    })
    it("branches", () => {
        const t = type([
            "node",
            {
                string: [{ value: "foo" }, { value: "bar" }],
                boolean: true,
                object: [
                    { props: { a: "string" } },
                    { subdomain: ["Array", "number"] }
                ]
            } as const
        ])
        attest(t.infer).typed as
            | boolean
            | "foo"
            | "bar"
            | {
                  a: string
              }
            | number[]
    })
    it("morph", () => {
        const t = type([
            "node",
            {
                object: {
                    input: { props: { a: "string" } },
                    morph: (input: { a: string }) => ({
                        b: input.a.length
                    })
                }
            }
        ])
        attest(t).typed as Type<
            (In: { a: string }) => Out<{
                b: number
            }>
        >
    })
    it("bad shallow reference", () => {
        // @ts-expect-error
        attest(() => type(["node", "whoops"])).type.errors(
            `Type '"whoops"' is not assignable to type 'TypeNode<{}>'`
        )
    })
    it("bad prop reference", () => {
        attest(() =>
            type([
                "node",
                {
                    // @ts-expect-error
                    object: {
                        props: {
                            a: "whoops"
                        }
                    }
                }
            ])
        ).type.errors(`Type '"whoops"' is not assignable to type 'Prop<{}>'`)
    })
    it("rule in wrong domain", () => {
        attest(() =>
            type([
                "node",
                {
                    number: {
                        // @ts-expect-error
                        regex: "/.*/"
                    }
                }
            ])
        ).type.errors(
            `'regex' does not exist in type 'CollapsibleList<Branch<"number", PrecompiledDefaults>>'`
        )
    })
})
