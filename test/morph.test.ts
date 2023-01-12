import { describe, it } from "mocha"
import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("morph", () => {
    it("base", () => {
        const t = type(["boolean", "=>", (data) => `${data}`])
        attest(t.node).snap({ input: "boolean", morph: "<function>" })
    })
    it("mixed intersection", () => {
        const types = scope({
            a: ["number>0", "=>", (data) => data + 1],
            b: "number<=1",
            leftMorph: "a&b",
            rightMorph: "b&a"
        })
        attest(types.leftMorph.node).snap({
            input: {
                number: {
                    range: {
                        min: { limit: 0, exclusive: true },
                        max: { limit: 1 }
                    }
                }
            },
            morph: "<function>"
        })
        attest(types.rightMorph.node).snap({
            input: {
                number: {
                    range: {
                        min: { limit: 0, exclusive: true },
                        max: { limit: 1 }
                    }
                }
            },
            morph: "<function>"
        })
    })
    it("deep mixed intersection", () => {
        const types = scope({
            a: { a: ["number>0", "=>", (data) => data + 1] },
            b: { a: "1" },
            c: "a&b"
        })
        attest(types.c.infer)
    })
    it("shallow morph intersection", () => {
        attest(() => {
            const types = scope({
                a: ["boolean", "=>", (data) => `${data}`],
                b: ["boolean", "=>", (data) => `${data}!!!`],
                // @ts-expect-error
                c: "a&b"
            })
        }).throwsAndHasTypeError(
            // TODO: Add paths to these errors
            "An intersection must have at least one non-morph operand."
        )
    })
    it("deep morph intersection", () => {
        attest(() => {
            const types = scope({
                a: { a: ["boolean", "=>", (data) => `${data}`] },
                b: { a: ["boolean", "=>", (data) => `${data}!!!`] },
                // @ts-expect-error
                c: "a&b"
            })
        }).throwsAndHasTypeError(
            // TODO: Add paths to these errors
            "An intersection must have at least one non-morph operand."
        )
    })

    // it("function", () => {
    //     const t = type("boolean", {
    //         out: (data) => `${data}`
    //     })
    //     const { out, data } = t(true)
    //     attest(data).equals(true).typed as boolean | undefined
    //     attest(out).equals("true").typed as string | undefined
    // })
    // it("identifier", () => {
    //     const t = type("boolean", {
    //         out: {
    //             string: (data) => `${data}` as const
    //         }
    //     })
    //     const { string } = t(true)
    //     attest(string).equals("true").typed as "true" | "false" | undefined
    // })
    // it("mismatched identifier", () => {
    //     attest(() => {
    //         type("boolean", {
    //             out: {
    //                 // @ts-expect-error
    //                 number: (data) => `${data}`
    //             }
    //         })
    //     }).type.errors("Type 'string' is not assignable to type 'number'.")
    // })
    // it("non-identifier", () => {
    //     const t = type("boolean", {
    //         out: {
    //             bit: (data) => (data ? 1 : 0)
    //         }
    //     })
    //     const { bit } = t(true)
    //     attest(bit).equals(1).typed as 1 | 0 | undefined
    // })
    // it("scoped", () => {
    //     const $ = scope({
    //         a: () =>
    //             $.type("string", {
    //                 in: {
    //                     b: (n) => `${n}`
    //                 },
    //                 out: {
    //                     b: (s) => parseInt(s)
    //                 }
    //             }),
    //         b: "number"
    //     })
    //     const types = $.compile()
    //     attest(types.a.from("b", 5).data).equals("5").typed as
    //         | string
    //         | undefined
    //     attest(types.a("5").b).equals(5).typed as number | undefined
    // })
    // it("scoped cyclic", () => {
    //     const $ = scope({
    //         a: () =>
    //             $.type("string", {
    //                 out: {
    //                     b: (s) => parseInt(s)
    //                 }
    //             }),
    //         b: () =>
    //             $.type("number", {
    //                 out: {
    //                     a: (n) => `${n}`
    //                 }
    //             })
    //     })
    // })
    // describe("inputs", () => {
    //     it("function", () => {
    //         const t = type("boolean", {
    //             in: (n: number) => !!n
    //         })
    //         attest(t.from(1).data).equals(true).typed as boolean | undefined
    //         attest(t.from("default", 1).data).equals(true).typed as
    //             | boolean
    //             | undefined
    //     })
    //     it("identifier", () => {
    //         const t = type("boolean", {
    //             in: {
    //                 number: (n) => !!n
    //             }
    //         })
    //         attest(t.from("number", 1).data).equals(true).typed as
    //             | boolean
    //             | undefined
    //     })
    //     it("non-identifier", () => {
    //         const t = type("boolean", {
    //             in: {
    //                 explicit: (input: number) => !!input,
    //                 implicit: (input) => input
    //             }
    //         })
    //         attest(t.from("explicit", 1).data).equals(true).typed as
    //             | boolean
    //             | undefined
    //         attest(() => {
    //             // @ts-expect-error
    //             t.from("implicit", 1)
    //         }).type.errors(
    //             "Argument of type 'number' is not assignable to parameter of type 'never'."
    //         )
    //     })
    // })
})
