import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { scope, type } from "../exports.js"

describe("union/discriminate", () => {
    const places = scope.lazy({
        ocean: { wet: "true", blue: "true", isOcean: "true" },
        sky: { wet: "false", blue: "true", isSky: "true" },
        rainforest: { wet: "true", blue: "false", isRainforest: "true" },
        desert: { wet: "false", blue: "false", isDesert: "true" },
        anywhereWet: { wet: "true" }
    })
    test("discriminate", () => {
        attest(
            type("ocean|sky|rainforest|desert", { scope: places }).attributes
        ).snap({
            type: "dictionary",
            props: { wet: { type: "boolean" }, blue: { type: "boolean" } },
            requiredKeys: { wet: true, blue: true },
            branches: [
                "|",
                [
                    {
                        props: {
                            wet: { value: "true" },
                            blue: { value: "true" },
                            isOcean: { value: "true", type: "boolean" }
                        },
                        requiredKeys: { isOcean: true }
                    },
                    {
                        props: {
                            wet: { value: "false" },
                            blue: { value: "true" },
                            isSky: { value: "true", type: "boolean" }
                        },
                        requiredKeys: { isSky: true }
                    },
                    {
                        props: {
                            wet: { value: "true" },
                            blue: { value: "false" },
                            isRainforest: { value: "true", type: "boolean" }
                        },
                        requiredKeys: { isRainforest: true }
                    },
                    {
                        props: {
                            wet: { value: "false" },
                            blue: { value: "false" },
                            isDesert: { value: "true", type: "boolean" }
                        },
                        requiredKeys: { isDesert: true }
                    }
                ]
            ]
        })
    })
    test("prune", () => {
        attest(
            type("ocean|sky|rainforest|desert|anywhereWet", { scope: places })
                .attributes
        ).snap()
    })
})
