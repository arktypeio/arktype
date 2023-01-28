import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("keyof", () => {
    it("object literal", () => {
        const t = type(["keyof", { a: "123", b: "123" }])
        attest(t.node).snap({})
    })
    it("non object error", () => {
        const t = type(["keyof", "number"])
        attest(t.node).snap({})
    })
    // it("keyof tuple union", () => {
    //     const t = type(["keyof", [{ a: 1 }, "|", { b: 1 }]])
    //     attest(t.node).snap()
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
    //TODO: hi david
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
