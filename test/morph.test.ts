import { describe, it } from "mocha"
import { type } from "../api.ts"
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
            const result = t(true).to?.("string")
            attest(result).equals("true").typed as string | undefined
        })
        describe("errors", () => {
            it("untyped additional args", () => {
                // TODO: Error here
                type("string", {
                    out: { number: (n, radix) => parseInt(n, radix) }
                })
            })
        })
    })
})
