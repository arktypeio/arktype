import { suite, test } from "mocha"
import { TypeNode } from "../../src/main.js"
import { arrayIndexInput } from "../../src/nodes/type.js"
import { attest, getTsVersionUnderTest } from "../attest/main.js"

suite("node definitions", () => {
    suite("basis", () => {
        test("domain", () => {
            const t = TypeNode.from({
                basis: "string"
            })
            attest(t).typed as TypeNode<string>
        })
        test("class", () => {
            const t = TypeNode.from({
                basis: Date
            })
            attest(t).typed as TypeNode<Date>
        })
        test("value", () => {
            const t = TypeNode.from({
                basis: ["===", 3.14159 as const]
            })
            attest(t).typed as TypeNode<3.14159>
        })
    })
    test("optional props", () => {
        const t = TypeNode.from({
            basis: "object",
            props: {
                a: {
                    kind: "required",
                    value: { basis: "string" }
                },
                b: {
                    kind: "optional",
                    value: { basis: "number" }
                }
            }
        })
        attest(t).typed as TypeNode<{
            a: string
            b?: boolean
        }>
    })
    test("arrays", () => {
        const t = TypeNode.from({
            basis: Array,
            props: [
                {},
                [
                    arrayIndexInput(),
                    {
                        basis: "object",
                        props: {
                            name: {
                                kind: "required",
                                value: { basis: "string" }
                            }
                        }
                    }
                ]
            ]
        })
        attest(t).typed as TypeNode<{ name: string }[]>
    })
    test("non-variadic tuple", () => {
        const t = TypeNode.from({
            basis: Array,
            props: {
                0: {
                    kind: "required",
                    value: {
                        basis: "object",
                        props: {
                            a: { kind: "required", value: { basis: "string" } },
                            b: { kind: "required", value: { basis: "boolean" } }
                        }
                    }
                },
                "1": {
                    kind: "required",
                    value: {
                        basis: ["===", "arktype" as const]
                    }
                },
                length: {
                    kind: "prerequisite",
                    value: { basis: ["===", 2 as const] }
                }
            }
        })
        attest(t).typed as TypeNode<
            [
                {
                    a: string
                    b: boolean
                },
                "arktype"
            ]
        >
    })
    test("branches", () => {
        const t = TypeNode.from(
            { basis: ["===", "foo" as const] },
            { basis: ["===", "bar" as const] },
            { basis: "number" },
            {
                basis: "object",
                props: { a: { kind: "required", value: { basis: "string" } } }
            }
        )
        attest(t).typed as TypeNode<number | object | "foo" | "bar">
    })
    test("narrow predicate", () => {
        const t = TypeNode.from({
            basis: "string",
            narrow: (s): s is "foo" => s === "foo"
        })
        attest(t).typed as TypeNode<"foo">
    })
    test("narrow predicate array", () => {
        const t = TypeNode.from({
            basis: "object",
            narrow: [
                (o): o is { a: string } => typeof o.a === "string",
                (o): o is { b: boolean } => typeof o.b === "boolean"
            ] as const
        })
        attest(t).typed as TypeNode<{
            a: string
            b: boolean
        }>
    })
    test("morph", () => {
        const t = TypeNode.from({
            basis: "string",
            morph: (s: string) => s.length
        })
        attest(t).typed as TypeNode<(In: string) => number>
    })
    test("morph list", () => {
        const t = TypeNode.from({
            basis: "string",
            morph: [(s: string) => s.length, (n: number) => ({ n })] as const
        })
        attest(t).typed as TypeNode<(In: string) => { n: number }>
    })
    test("never", () => {
        const t = TypeNode.from()
        attest(t).typed as TypeNode<never>
    })
    test("errors on rule in wrong domain", () => {
        if (getTsVersionUnderTest() === "4.9") {
            return
        }
        attest(() =>
            TypeNode.from({
                basis: "number",
                divisor: 5,
                // @ts-expect-error
                regex: "/.*/"
            })
        ).throws.snap(
            "Error: regex constraint may only be applied to a string (was number)"
        )
    })
    test("errors on filter literal", () => {
        if (getTsVersionUnderTest() === "4.9") {
            return
        }
        attest(() =>
            TypeNode.from({
                basis: ["===", true as const],
                // @ts-expect-error
                narrow: (b: boolean) => b === true
            })
        ).throws(
            "narrow constraint may only be applied to a non-literal type (was true)"
        )
    })
})
