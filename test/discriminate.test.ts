import { describe, it } from "mocha"
import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("compile", () => {
    const places = scope.lazy({
        ocean: { wet: "true", blue: "true", isOcean: "true" },
        sky: { wet: "false", blue: "true", isSky: "true" },
        rainforest: { wet: "true", blue: "false", isRainforest: "true" },
        desert: { wet: "false", blue: "false", isDesert: "true" },
        anywhereWet: { wet: "true" }
    })
    it("flatten", () => {})
    // it("discriminate simple", () => {
    //     attest(type("ocean|sky", { scope: places }).root).snap({})
    // })
    // it("discriminate", () => {
    //     attest(
    //         type("ocean|sky|rainforest|desert", { scope: places }).root
    //     ).snap({})
    // })
})
