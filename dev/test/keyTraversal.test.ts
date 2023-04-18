import { describe, it } from "mocha"
import { type } from "../../src/main.js"
import { attest } from "../attest/main.js"

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
        const dataWithExtraneousB = getExtraneousB()
        attest(t(dataWithExtraneousB).data).equals(dataWithExtraneousB)
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
    it("distilled array", () => {
        const t = type(
            {
                a: "email[]"
            },
            { keys: "distilled" }
        )
        attest(
            t({
                a: ["testing@example.com"],
                c: ["other@example.com", "test@example.com"]
            }).data
        ).snap({
            a: ["testing@example.com"]
        })
    })
    it("strict array", () => {
        const t = type(
            {
                a: "email[]"
            },
            { keys: "strict" }
        )
        attest(
            t({
                a: ["testing@example.com"]
            }).data
        ).snap({
            a: ["testing@example.com"]
        })
    })
    it("strict array with extraneous keys", () => {
        const t = type(
            {
                a: "email[]",
                "b?": "1<email[]<=10"
            },
            { keys: "strict" }
        )
        attest(
            t({
                c: ["testing@example.com"]
            }).problems?.summary
        ).snap("c must be removed\na must be defined")
    })
    it("distilled union", () => {
        const o = type([{ a: "string" }, "|", { b: "boolean" }], {
            keys: "distilled"
        })
        // can distill to first branch
        attest(o({ a: "to", z: "bra" }).data).snap({ a: "to" })
        // can distill to second branch
        attest(o({ b: true, c: false }).data).snap({ b: true })
        // can handle missing keys
        attest(o({ a: 2 }).problems?.summary).snap(
            'a must be a string or b must be defined (was {"a":2})'
        )
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
