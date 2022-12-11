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
    test("flatten", () => {})
    // test("discriminate simple", () => {
    //     attest(type("ocean|sky", { scope: places }).root).snap({})
    // })
    // test("discriminate", () => {
    //     attest(
    //         type("ocean|sky|rainforest|desert", { scope: places }).root
    //     ).snap({})
    // })
})
