import { describe, it } from "mocha"
import { type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("morph", () => {
    it("functional", () => {
        const t = type(["string", "=>", "number", (s) => s.length])
        attest(t.infer).typed as number
        attest(t.root).snap({ number: true })
    })
    it("distributed", () => {
        const validateInferredAsZeroOrOne = (input: "zero" | "one") =>
            input === "zero" ? 0 : 1
        const t = type([
            "'zero'|'one'|boolean",
            "=>",
            "0|1",
            {
                boolean: (b) => (b ? 1 : 0),
                string: (s) => validateInferredAsZeroOrOne(s)
            }
        ])
        attest(t.infer).typed as 0 | 1
        attest(t.root).snap({ number: [{ value: 0 }, { value: 1 }] })
    })
})
