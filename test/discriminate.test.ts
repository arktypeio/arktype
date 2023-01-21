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
        attest(t.flat).snap([
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
        attest(t.flat).snap([
            ["domain", "object"],
            [
                "switch",
                {
                    path: "/color",
                    kind: "value",
                    cases: {
                        "'blue'": [
                            [
                                "cases",
                                {
                                    path: "/climate",
                                    kind: "value",
                                    cases: {
                                        "'wet'": [
                                            [
                                                "requiredProps",
                                                [
                                                    [
                                                        "climate",
                                                        [["value", "wet"]]
                                                    ],
                                                    [
                                                        "color",
                                                        [["value", "blue"]]
                                                    ],
                                                    [
                                                        "isOcean",
                                                        [["value", true]]
                                                    ]
                                                ]
                                            ]
                                        ],
                                        "'dry'": [
                                            [
                                                "requiredProps",
                                                [
                                                    [
                                                        "climate",
                                                        [["value", "dry"]]
                                                    ],
                                                    [
                                                        "color",
                                                        [["value", "blue"]]
                                                    ],
                                                    ["isSky", [["value", true]]]
                                                ]
                                            ]
                                        ]
                                    }
                                }
                            ]
                        ],
                        "'green'": [
                            [
                                "requiredProps",
                                [
                                    ["climate", [["value", "wet"]]],
                                    ["color", [["value", "green"]]],
                                    ["isRainforest", [["value", true]]]
                                ]
                            ]
                        ],
                        "'brown'": [
                            [
                                "requiredProps",
                                [
                                    ["climate", [["value", "dry"]]],
                                    ["color", [["value", "brown"]]],
                                    ["isDesert", [["value", true]]]
                                ]
                            ]
                        ]
                    }
                }
            ]
        ])
    })
})
