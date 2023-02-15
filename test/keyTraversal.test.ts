import { describe, it } from "mocha"
import { type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("key traversal", () => {
    const getExtraneousB = () => ({ a: "ok", b: "why?" })
    it("loose by default", () => {
        const t = type({
            a: "string"
        })
        attest(t.flat).snap([
            ["domain", "object"],
            ["requiredProp", ["a", "string"]]
        ])
        attest(t(getExtraneousB()).data).snap({ a: "ok", b: "why?" })
    })
    it("distilled type", () => {
        const t = type(
            {
                a: "string"
            },
            { keys: "distilled" }
        )
        attest(t.flat).snap([
            [
                "config",
                {
                    config: [["keys", "distilled"]],
                    node: [
                        ["domain", "object"],
                        [
                            "distilledProps",
                            { required: { a: "string" }, optional: {} }
                        ]
                    ]
                }
            ]
        ])
        attest(t({ a: "ok" }).data).equals({ a: "ok" })
        attest(t(getExtraneousB()).data).snap({ a: "ok" })
    })
    it("strict type", () => {
        const t = type(
            {
                a: "string"
            },
            { keys: "strict" }
        )
        attest(t.flat).snap([
            [
                "config",
                {
                    config: [["keys", "strict"]],
                    node: [
                        ["domain", "object"],
                        [
                            "strictProps",
                            { required: { a: "string" }, optional: {} }
                        ]
                    ]
                }
            ]
        ])
        attest(t({ a: "ok" }).data).equals({ a: "ok" })
        attest(t(getExtraneousB()).problems?.summary).snap("b must be removed")
    })
})
