import { describe, it } from "mocha"
import { TypeNode } from "../../src/main.js"
import { arrayIndexInput } from "../../src/nodes/props.js"
import { attest, getTsVersionUnderTest } from "../attest/main.js"

describe("node definitions", () => {
    describe("basis", () => {
        it("domain", () => {
            const t = TypeNode.from({
                basis: "string"
            })
            attest(t).typed as TypeNode<string>
        })
        it("class", () => {
            const t = TypeNode.from({
                basis: Date
            })
            attest(t).typed as TypeNode<Date>
        })
        it("value", () => {
            const t = TypeNode.from({
                basis: ["===", 3.14159 as const]
            })
            attest(t).typed as TypeNode<3.14159>
        })
    })
    it("optional props", () => {
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
    it("arrays", () => {
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
    it("tuples", () => {
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
    it("branches", () => {
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
    it("morph", () => {
        const t = TypeNode.from({
            basis: "string",
            morph: (s: string) => s.length
        })
        attest(t).typed as TypeNode<(In: string) => number>
    })
    it("never", () => {
        const t = TypeNode.from()
        attest(t).typed as TypeNode<never>
    })
    it("errors on rule in wrong domain", () => {
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
        ).throws.snap()
    })
    it("errors on filter literal", () => {
        if (getTsVersionUnderTest() === "4.9") {
            return
        }
        attest(() =>
            TypeNode.from({
                basis: ["===", true as const],
                // @ts-expect-error
                filter: (b: boolean) => b === true
            })
        ).throws.snap()
    })
})
