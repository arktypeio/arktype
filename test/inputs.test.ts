import { describe, it } from "mocha"
import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("inputs", () => {
    it("function", () => {
        const t = type("boolean", {
            in: (n: number) => !!n
        })
        attest(t.from(1).data).equals(true).typed as boolean | undefined
        attest(t.from("default", 1).data).equals(true).typed as
            | boolean
            | undefined
    })
    it("identifier", () => {
        const t = type("boolean", {
            in: {
                number: (n) => !!n
            }
        })
        attest(t.from("number", 1).data).equals(true).typed as
            | boolean
            | undefined
    })
    it("non-identifier", () => {
        const t = type("boolean", {
            in: {
                explicit: (input: number) => !!input,
                implicit: (input) => input
            }
        })
        attest(t.from("explicit", 1).data).equals(true).typed as
            | boolean
            | undefined
        attest(() => {
            // @ts-expect-error
            t.from("implicit", 1)
        }).type.errors(
            "Argument of type 'number' is not assignable to parameter of type 'never'."
        )
    })
})
