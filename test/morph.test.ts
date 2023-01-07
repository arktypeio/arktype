import { describe, it } from "mocha"
import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("morph", () => {
    describe("in", () => {
        it("base", () => {
            const t = type("string", {
                in: {
                    number: (n) => `${n}`
                },
                out: {
                    symbol: (s) => Symbol(s),
                    number: (s) => parseFloat(s)
                }
            })
            attest(t.infer).typed as string
            const { number } = t("5.7")
            if (number) {
                const result = number
            }
        })
        it("additional args", () => {
            const t = type("number", {
                in: {
                    string: (s, radix: number) => parseInt(s, radix)
                },
                out: {
                    string: (s, radix: number) => s.toString(radix)
                }
            })
            attest(t.infer).typed as number
            t(5).string?.(5)
        })
        it("out morphs", () => {
            const t = type("boolean", {
                out: {
                    string: (data) => `${data}`
                }
            })
            const { string } = t(true)
            attest(string).equals("true").typed as string | undefined
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
            // types.a("foo").out("b").out("c")
            // types.a
        })
        describe("errors", () => {
            it("untyped additional args", () => {
                const t = type("string", {
                    out: { number: (n, radix) => parseInt(n, radix) }
                })
                // @ts-expect-error
                attest(t("foo").out("number", 10)).type.errors(
                    "Argument of type 'number' is not assignable to parameter of type 'never'."
                )
            })
            it("unresolvable keys", () => {
                scope({ a: "string" }).type("string", {
                    in: {
                        number: (n) => `${n}`,
                        a: (data) => `${data}`,
                        // @ts-expect-error
                        foo: (bar) => bar
                    }
                })
            })
        })
    })
})
