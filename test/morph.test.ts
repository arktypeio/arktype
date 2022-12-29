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
            it("unresolvable keys", () => {
                const t = type("string", {
                    scope: scope({
                        a: "string"
                    }),
                    from: {
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
