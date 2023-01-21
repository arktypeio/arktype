import { describe, it } from "mocha"
import { scope } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("discriminate", () => {
    const places = scope.lazy({
        ocean: { climate: "'wet'", color: "'blue'", isOcean: "true" },
        sky: { climate: "'dry'", color: "'blue'", isSky: "true" },
        rainforest: {
            climate: "'wet'",
            color: "'green'",
            isRainforest: "true"
        },
        desert: { climate: "'dry'", color: "'brown'", isDesert: "true" },
        anywhereWet: { wet: "true" }
    })
    it("binary", () => {
        const t = places.$.type("ocean|sky")
        attest(t.node).snap()
        attest(t.flat as any).snap()
    })
    it("n-ary", () => {
        const t = places.$.type("ocean|sky|rainforest|desert")
        attest(t.flat as any).snap([
            ["domain", "object"],
            [
                "cases",
                {
                    blue: {
                        wet: {
                            props: {
                                climate: { string: { value: "wet" } },
                                color: { string: { value: "blue" } },
                                isOcean: "true"
                            }
                        },
                        dry: {
                            props: {
                                climate: { string: { value: "dry" } },
                                color: { string: { value: "blue" } },
                                isSky: "true"
                            }
                        }
                    },
                    green: {
                        props: {
                            climate: { string: { value: "wet" } },
                            color: { string: { value: "green" } },
                            isRainforest: "true"
                        }
                    },
                    brown: {
                        props: {
                            climate: { string: { value: "dry" } },
                            color: { string: { value: "brown" } },
                            isDesert: "true"
                        }
                    }
                }
            ]
        ])
    })
})
