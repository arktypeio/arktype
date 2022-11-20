import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { scope, type } from "../exports.js"

describe("union/discriminate", () => {
    const places = scope.lazy({
        ocean: { wet: "true", blue: "true" },
        sky: { wet: "false", blue: "true" },
        rainforest: { wet: "true", blue: "false" },
        desert: { wet: "false", blue: "false" },
        anywhereWet: { wet: "true" }
    })
    test("discriminate", () => {
        attest(
            type("ocean|sky|rainforest|desert", { scope: places }).attributes
        ).snap({
            branches: [
                "?",
                "wet.value",
                {
                    true: {
                        branches: ["?", "blue.value", { true: {}, false: {} }]
                    },
                    false: {
                        branches: ["?", "blue.value", { true: {}, false: {} }]
                    }
                }
            ]
        })
    })
    test("prune", () => {
        attest(
            type("ocean|sky|rainforest|desert|anywhereWet", { scope: places })
                .attributes
        ).snap({
            branches: [
                "?",
                "wet.value",
                {
                    true: {},
                    false: {
                        branches: ["?", "blue.value", { true: {}, false: {} }]
                    }
                }
            ]
        })
    })
})
