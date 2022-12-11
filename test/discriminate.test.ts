import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { scope, type } from "../exports.js"

describe("compile", () => {
    const places = scope.lazy({
        ocean: { wet: "true", blue: "true", isOcean: "true" },
        sky: { wet: "false", blue: "true", isSky: "true" },
        rainforest: { wet: "true", blue: "false", isRainforest: "true" },
        desert: { wet: "false", blue: "false", isDesert: "true" },
        anywhereWet: { wet: "true" }
    })
    test("discriminate simple", () => {
        attest(type("ocean|sky", { scope: places }).root).snap({
            object: [
                {
                    props: {
                        wet: { boolean: { value: true } },
                        blue: { boolean: { value: true } },
                        isOcean: { boolean: { value: true } }
                    },
                    requiredKeys: { wet: true, blue: true, isOcean: true }
                },
                {
                    props: {
                        wet: { boolean: { value: false } },
                        blue: { boolean: { value: true } },
                        isSky: { boolean: { value: true } }
                    },
                    requiredKeys: { wet: true, blue: true, isSky: true }
                }
            ]
        })
    })
    test("discriminate", () => {
        attest(
            type("ocean|sky|rainforest|desert", { scope: places }).root
        ).snap({
            object: [
                {
                    props: {
                        wet: { boolean: { value: true } },
                        blue: { boolean: { value: true } },
                        isOcean: { boolean: { value: true } }
                    },
                    requiredKeys: { wet: true, blue: true, isOcean: true }
                },
                {
                    props: {
                        wet: { boolean: { value: false } },
                        blue: { boolean: { value: true } },
                        isSky: { boolean: { value: true } }
                    },
                    requiredKeys: { wet: true, blue: true, isSky: true }
                },
                {
                    props: {
                        wet: { boolean: { value: true } },
                        blue: { boolean: { value: false } },
                        isRainforest: { boolean: { value: true } }
                    },
                    requiredKeys: { wet: true, blue: true, isRainforest: true }
                },
                {
                    props: {
                        wet: { boolean: { value: false } },
                        blue: { boolean: { value: false } },
                        isDesert: { boolean: { value: true } }
                    },
                    requiredKeys: { wet: true, blue: true, isDesert: true }
                }
            ]
        })
    })
})
