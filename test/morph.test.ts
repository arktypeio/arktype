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
                    number: (s) => parseFloat(s)
                }
            })
            attest(t.infer).typed as string
        })
    })
})
