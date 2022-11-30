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
    test("discriminate simple", () => {
        attest(type("ocean|sky", { scope: places }).root).snap({
            object: [
                "wet/boolean/literal",
                {
                    true: [
                        { object: { props: { someProp: "boolean" } } },
                        "ocean"
                    ],
                    false: "sky"
                }
            ]
        } as any)
    })
    test("discriminate", () => {
        attest(
            type("ocean|sky|rainforest|desert", { scope: places }).root
        ).snap("ocean")
    })
    // TODO: Don't unnecessarily expand aliases in final type just because
    // they're used for pruning/discrimination
    test("subtype pruning", () => {
        attest(
            type("ocean|sky|rainforest|desert|anywhereWet", { scope: places })
                .root
        ).snap({
            object: [
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
