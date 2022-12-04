import { describe } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { scope, type } from "../exports.js"
import { resolveIfName } from "../src/nodes/names.js"

describe("name resolution", () => {
    const places = scope.lazy({
        ocean: { wet: "true", blue: "true", isOcean: "true" },
        sky: { wet: "false", blue: "true", isSky: "true" },
        rainforest: { wet: "true", blue: "false", isRainforest: "true" },
        desert: { wet: "false", blue: "false", isDesert: "true" },
        anywhereWet: { wet: "true" }
    })
    test("resolveIfName", () => {
        attest(resolveIfName("ocean", places)).snap()
    })
})
