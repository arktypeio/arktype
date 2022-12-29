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
        })
        it("additional args", () => {
            const t = type("number", {
                in: {
                    string: (s, radix) => parseInt(s, radix)
                },
                out: {
                    string: (s, radix) => s.toString(radix)
                }
            })
            attest(t.infer).typed as number
        })
        it("out morphs", () => {
            const t = type("boolean", {
                out: {
                    string: (data) => `${data}`
                }
            })
            // TODO: to should continue chaining data/problems as a final result.
            const { data } = t(true).to("string")
            attest(data).equals("true").typed as string | undefined
        })
        it("in scope", () => {
            const s = scope({
                a: [
                    "string",
                    ":",
                    {
                        // TODO: don't allow both sides of i/o mapping to be defined
                        out: {
                            b: (s) => parseInt(s)
                        }
                    }
                ],
                b: "number"
            })
            const { data } = s.types.a("5").to("b")
            attest(data).equals(5).typed as number
        })
        describe("errors", () => {
            it("untyped additional args", () => {
                // TODO: Error here
                type("string", {
                    out: { number: (n, radix) => parseInt(n, radix) }
                })
            })
            it("unresolvable keys", () => {
                const t = type("string", {
                    scope: scope({
                        a: "string"
                    }),
                    in: {
                        number: (n) => `${n}`,
                        a: (data) => `${data}`,
                        // @ts-expect-error
                        foo: (bar) => "baz"
                    }
                })
            })
        })
    })
})
