import { describe, it } from "mocha"
import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("morph", () => {
    describe("in", () => {
        it("base", () => {
            const t = type("string", {
                from: {
                    number: (n) => `${n}`
                },
                to: {
                    symbol: (s) => Symbol(s),
                    number: (s) => parseFloat(s)
                }
            })
            attest(t.infer).typed as string
            t("foo").to("symbol")
        })
        it("additional args", () => {
            const t = type("number", {
                from: {
                    string: (s, radix: number) => parseInt(s, radix)
                },
                to: {
                    string: (s, radix: number) => s.toString(radix)
                }
            })
            attest(t.infer).typed as number
            t(5).to("string", 5)
        })
        it("out morphs", () => {
            const t = type("boolean", {
                to: {
                    string: (data) => `${data}`
                }
            })
            // TODO: to should continue chaining data/problems as a final result.
            const { data } = t(true).to("string")
            attest(data).equals("true").typed as string | undefined
        })
        it("in scope", () => {
            const $ = scope({
                a: () =>
                    $.type("string", {
                        from: {
                            b: (n) => `${n}`
                        },
                        to: {
                            b: (s) => parseInt(s)
                        }
                    }),
                b: () =>
                    $.type("number", {
                        to: {
                            c: (n) => n !== 0
                        }
                    }),
                c: "boolean"
            })
            const types = $.compile()
            types.a("foo").to("b").to("c")
            types.a
        })
        describe("errors", () => {
            it("untyped additional args", () => {
                const t = type("string", {
                    to: { number: (n, radix) => parseInt(n, radix) }
                })
                // @ts-expect-error
                attest(t("foo").to("number", 10)).type.errors(
                    "Argument of type 'number' is not assignable to parameter of type 'never'."
                )
            })
            it("unresolvable keys", () => {
                scope({ a: "string" }).type("string", {
                    from: {
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
