import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("keyof", () => {
    it("object literal", () => {
        const t = type(["keyof", { a: "123", b: "123" }])
        attest(t.node).snap({ string: [{ value: "a" }, { value: "b" }] })
    })
    it("node tuple union", () => {
        const t = type(["keyof", [{ a: "number" }, "|", { b: "number" }]])
        attest(t.node).snap({ string: [] })
    })
    it("node tuple intersection", () => {
        const t = type(["keyof", [{ a: "number" }, "&", { b: "number" }]])
        attest(t.node).snap({ string: [{ value: "a" }, { value: "b" }] })
    })
    it("scope intersection", () => {
        const space = scope({
            a: { first: "number" },
            b: { second: "number" },
            ab: "a&b",
            keys: ["keyof", "ab"]
        }).compile()
        attest(space.keys.node).snap({
            string: [{ value: "first" }, { value: "second" }]
        })
    })
    it("scope union", () => {
        const space = scope({
            a: { first: "number" },
            b: { second: "123" },
            ab: "a|b",
            keys: ["keyof", "ab"]
        }).compile()
        attest(space.keys.node).snap({ string: [] })
    })
})
