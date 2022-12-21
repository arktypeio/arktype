import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { type } from "../exports.js"

describe("morph", () => {
    test("functional", () => {
        const t = type(["string", "=>", "number", (s) => s.length])
        attest(t.infer).typed as number
        attest(t.root).snap({ number: true })
    })
    test("distributed", () => {
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
        attest(t.root).snap()
    })
})
