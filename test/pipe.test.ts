import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.ts"
import { type } from "../exports.ts"

describe("pipe", () => {
    test("functional", () => {
        const t = type(["string", "|>", (s) => s.trim()])
        attest(t.infer).typed as "string"
    })
    test("distributed", () => {
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
    test("multiple", () => {
        const t = type(["string", "|>", (s) => s.trim(), (s) => s + "!"])
        attest(t.infer).typed as string
    })
    describe("errors", () => {
        test("zero operands", () => {
            attest(() => {
                // @ts-expect-error
                type(["string", "|>"])
            })
        })
    })
})
