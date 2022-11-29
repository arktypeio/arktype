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
            type("ocean|sky|rainforest|desert", { scope: places }).root
        ).snap({
            object: [
                {
                    props: {
                        wet: { boolean: { literal: true } },
                        blue: { boolean: { literal: true } },
                        isOcean: { boolean: { literal: true } }
                    },
                    requiredKeys: { wet: true, blue: true, isOcean: true }
                },
                {
                    props: {
                        wet: { boolean: { literal: false } },
                        blue: { boolean: { literal: true } },
                        isSky: { boolean: { literal: true } }
                    },
                    requiredKeys: { wet: true, blue: true, isSky: true }
                },
                {
                    props: {
                        wet: { boolean: { literal: true } },
                        blue: { boolean: { literal: false } },
                        isRainforest: { boolean: { literal: true } }
                    },
                    requiredKeys: { wet: true, blue: true, isRainforest: true }
                },
                {
                    props: {
                        wet: { boolean: { literal: false } },
                        blue: { boolean: { literal: false } },
                        isDesert: { boolean: { literal: true } }
                    },
                    requiredKeys: { wet: true, blue: true, isDesert: true }
                }
            ]
        })
    })
    test("prune", () => {
        attest(
            type("ocean|sky|rainforest|desert|anywhereWet", { scope: places })
                .root
        ).snap({
            object: [
                {
                    props: {
                        wet: { boolean: { literal: true } },
                        blue: { boolean: { literal: true } },
                        isOcean: { boolean: { literal: true } }
                    },
                    requiredKeys: { wet: true, blue: true, isOcean: true }
                },
                {
                    props: {
                        wet: { boolean: { literal: false } },
                        blue: { boolean: { literal: true } },
                        isSky: { boolean: { literal: true } }
                    },
                    requiredKeys: { wet: true, blue: true, isSky: true }
                },
                {
                    props: {
                        wet: { boolean: { literal: true } },
                        blue: { boolean: { literal: false } },
                        isRainforest: { boolean: { literal: true } }
                    },
                    requiredKeys: { wet: true, blue: true, isRainforest: true }
                },
                {
                    props: {
                        wet: { boolean: { literal: false } },
                        blue: { boolean: { literal: false } },
                        isDesert: { boolean: { literal: true } }
                    },
                    requiredKeys: { wet: true, blue: true, isDesert: true }
                },
                {
                    props: { wet: { boolean: { literal: true } } },
                    requiredKeys: { wet: true }
                }
            ]
        })
    })
})
