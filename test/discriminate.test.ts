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
            ["cases", { path: [], rule: "domain", cases: {} }]
        ])
    })
    // it("discriminate", () => {
    //     attest(
    //         type("ocean|sky|rainforest|desert", { scope: places }).root
    //     ).snap({})
    // })
})
