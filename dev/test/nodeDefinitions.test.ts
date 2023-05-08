import { suite, test } from "mocha"
import { TypeNode } from "../../src/main.js"
import { arrayIndexInput } from "../../src/nodes/props.js"
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
                    arrayIndexInput,
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
    test("tuples", () => {
        const t = TypeNode.from({
            basis: Array,
            props: [
                {
                    length: {
                        kind: "prerequisite",
                        value: { basis: ["===", 5 as const] }
                    }
                },
                [
                    arrayIndexInput,
                    {
                        basis: "string"
                    }
                ]
            ]
        })
        attest(t).typed as TypeNode<[string, string, string, string, string]>
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
    test("morph", () => {
        const t = TypeNode.from({
            basis: "string",
            morph: (s: string) => s.length
        })
        attest(t).typed as TypeNode<(In: string) => number>
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
            "Error: Domain must be string to apply a regex constraint (was number)"
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
                filter: (b: boolean) => b === true
            })
        ).throws.snap(
            "Error: filter constraint may only be applied to a non-literal type (was true)"
        )
    })
})
