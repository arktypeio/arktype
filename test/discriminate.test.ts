import { describe, it } from "mocha"
import { scope, type } from "../api.ts"
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
    it("shallow", () => {
        const t = type("'a'|'b'|'c'")
        // TODO: check if this type still causes infinite recursion if not using unknown
        attest(t.flat).unknown.snap([
            ["domain", "string"],
            [
                "switch",
                {
                    path: "/",
                    kind: "value",
                    cases: {
                        "'a'": [["value", { value: "a" }]],
                        "'b'": [["value", { value: "b" }]],
                        "'c'": [["value", { value: "c" }]]
                    }
                }
            ]
        ])
    })
    it("n-ary", () => {
        const t = places.$.type("ocean|sky|rainforest|desert")
        attest(t.flat).unknown.snap([
            ["domain", "object"],
            [
                "branches",
                [
                    [
                        "requiredProps",
                        [
                            ["climate", [["value", "wet"]]],
                            ["color", [["value", "blue"]]],
                            ["isOcean", [["value", "true"]]]
                        ]
                    ],
                    [
                        "requiredProps",
                        [
                            ["climate", [["value", "dry"]]],
                            ["color", [["value", "blue"]]],
                            ["isSky", "(cycle)"]
                        ]
                    ],
                    [
                        "requiredProps",
                        [
                            ["climate", [["value", "wet"]]],
                            ["color", [["value", "green"]]],
                            ["isRainforest", "(cycle)"]
                        ]
                    ],
                    [
                        "requiredProps",
                        [
                            ["climate", [["value", "dry"]]],
                            ["color", [["value", "brown"]]],
                            ["isDesert", "(cycle)"]
                        ]
                    ]
                ]
            ]
        ])
    })
})
