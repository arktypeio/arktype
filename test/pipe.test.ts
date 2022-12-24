import { describe, it } from "mocha"
import { attest } from "../dev/attest/api.ts"
import { type } from "../api.ts"

describe("pipe", () => {
    it("functional", () => {
        const t = type(["string", "|>", (s) => s.trim()])
        attest(t.infer).typed as "string"
    })
    it("distributed", () => {
        const validateInferredAsTrue = (input: true) => input
        const t = type([
            "'foo'|true",
            "|>",
            {
                boolean: (b) => validateInferredAsTrue(b),
                // Piping to another domain within the type is allowed
                string: (s) => (s === "foo" ? true : "foo")
            }
        ])
        attest(t.infer).typed as "foo" | true
        attest(t.root).snap({})
    })
    it("multiple", () => {
        const t = type(["string", "|>", (s) => s.trim(), (s) => s + "!"])
        attest(t.infer).typed as string
    })
    describe("errors", () => {
        it("zero operands", () => {
            attest(() => {
                // @ts-expect-error
                type(["string", "|>"])
            })
        })
    })
})
