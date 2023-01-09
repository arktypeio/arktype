import { describe, it } from "mocha"
import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("morph", () => {
    describe("in", () => {
        it("base", () => {
            const t = type("string", {
                in: {
                    number: (n) => `${n}`,
                    strfing: (s: number) => `${s}`
                },
                out: {
                    symbol: (s) => Symbol(s),
                    number: (s) => parseFloat(s),
                    foo: (s) => s
                }
            })
            attest(t.infer).typed as string
            const { number, problems } = t("5.7")
            if (number !== undefined) {
                const result = number
            } else {
                problems.summary
            }
        })
        it("in scope", () => {
            const $ = scope({
                a: () =>
                    $.type("string", {
                        in: {
                            b: (n) => `${n}`
                        },
                        out: {
                            b: (s) => parseInt(s)
                        }
                    }),
                b: () =>
                    $.type("number", {
                        out: {
                            c: (n) => n !== 0
                        }
                    }),
                c: "boolean"
            })
            const types = $.compile()
        })
    })
    describe("out", () => {
        it("root function", () => {
            const t = type("boolean", {
                out: (data) => `${data}`
            })
            const { out, data } = t(true)
            attest(data).equals(true).typed as boolean | undefined
            attest(out).equals("true").typed as string | undefined
        })
        it("identifier", () => {
            const t = type("boolean", {
                out: {
                    string: (data) => `${data}` as const
                }
            })
            const { string } = t(true)
            attest(string).equals("true").typed as "true" | "false" | undefined
        })
        it("mismatched identifier", () => {
            attest(() => {
                type("boolean", {
                    out: {
                        // @ts-expect-error
                        number: (data) => `${data}`
                    }
                })
            }).type.errors("Type 'string' is not assignable to type 'number'.")
        })
        it("non-identifier", () => {
            const t = type("boolean", {
                out: {
                    bit: (data) => (data ? 1 : 0)
                }
            })
            const { bit } = t(true)
            attest(bit).equals(1).typed as 1 | 0 | undefined
        })
    })
})
