import { describe, it } from "mocha"
import { scope } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("discriminate", () => {
    const places = scope.lazy({
        ocean: { wet: "true", blue: "true", isOcean: "true" },
        sky: { wet: "false", blue: "true", isSky: "true" },
        rainforest: { wet: "true", blue: "false", isRainforest: "true" },
        desert: { wet: "false", blue: "false", isDesert: "true" },
        anywhereWet: { wet: "true" }
    })
    it("binary", () => {
        const t = places.$.type("ocean|sky")
        attest(t.node).snap({
            object: [
                { props: { wet: "true", blue: "true", isOcean: "true" } },
                { props: { wet: "false", blue: "true", isSky: "true" } }
            ]
        })
        attest(t.flat).snap([
            ["domain", "object"],
            [
                "cases",
                {
                    path: "",
                    kind: "domain",
                    cases: {
                        "0": {
                            "1": {
                                wet: {
                                    kind: "value",
                                    operands: [true, { value: false }]
                                }
                            }
                        }
                    }
                }
            ]
        ] as any)
    })
    it("n-ary", () => {
        const t = places.$.type("ocean|sky|rainforest|desert")
        attest(t.flat as any).snap([
            ["domain", "object"],
            [
                "cases",
                {
                    path: "",
                    kind: "domain",
                    cases: {
                        wet: {
                            value: {
                                true: { "0": true, "2": true },
                                '{"value":"false"}': { "1": true, "3": true },
                                false: { "1": true },
                                '{"value":"true"}': { "2": true }
                            }
                        },
                        blue: {
                            value: {
                                true: { "0": true, "1": true },
                                '{"value":"false"}': { "2": true, "3": true }
                            }
                        }
                    }
                }
            ]
        ])
    })
})
