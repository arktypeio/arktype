import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("keyof", () => {
    it("object literal", () => {
        const t = type(["keyof", { a: "123", b: "123" }])
        attest(t.node).snap({ object: { value: ["a", "b"] } })
    })
    // it("non object error", () => {
    //     attest(() =>
    //         //@ts-expect-error
    //         type(["keyof", "number"])
    //     ).throwsAndHasTypeError()
    // })
    it("scope intersection", () => {
        const t = scope({
            a: { first: "number" },
            b: { second: "number" },
            ab: "a&b",
            keys: ["keyof", "ab"]
        })
        attest(t).snap()
    })
    it("scope union", () => {
        const t = scope({
            a: { first: "number" },
            b: { second: "123" },
            ab: "a|b",
            keys: ["keyof", "ab"]
        })
        attest(t).snap()
    })
})
