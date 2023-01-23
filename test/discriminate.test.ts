import { describe, it } from "mocha"
import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("discriminate", () => {
    const places = scope.lazy({
        rainforest: {
            climate: "'wet'",
            color: "'green'",
            isRainforest: "true"
        },
        desert: { climate: "'dry'", color: "'brown'", isDesert: "true" },
        sky: { climate: "'dry'", color: "'blue'", isSky: "true" },
        ocean: { climate: "'wet'", color: "'blue'", isOcean: "true" }
    })
    it("shallow", () => {
        const t = type("'a'|'b'|'c'")
        // TODO: fix snapshot infinite recursion when not using .unknown
        attest(t.flat).unknown.snap([
            ["domain", "string"],
            [
                "switch",
                {
                    path: "/",
                    kind: "value",
                    cases: {
                        "'a'": [["value", "a"]],
                        "'b'": [["value", "b"]],
                        "'c'": [["value", "c"]]
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
                "switch",
                {
                    path: "/color",
                    kind: "value",
                    cases: {
                        "'blue'": [
                            [
                                "switch",
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
    it("undiscriminatable", () => {
        const t = places.$.type([
            "ocean",
            "|",
            {
                climate: "'wet'",
                color: "'blue'",
                indistinguishableFrom: "ocean"
            }
        ])
        attest(t.flat).unknown.snap([
            ["domain", "object"],
            [
                "branches",
                [
                    [
                        [
                            "requiredProps",
                            [
                                ["climate", [["value", "wet"]]],
                                ["color", [["value", "blue"]]],
                                ["isOcean", [["value", true]]]
                            ]
                        ]
                    ],
                    [
                        [
                            "requiredProps",
                            [
                                ["climate", [["value", "wet"]]],
                                ["color", [["value", "blue"]]],
                                [
                                    "indistinguishableFrom",
                                    [
                                        ["domain", "object"],
                                        [
                                            "requiredProps",
                                            [
                                                ["climate", [["value", "wet"]]],
                                                ["color", [["value", "blue"]]],
                                                ["isOcean", [["value", true]]]
                                            ]
                                        ]
                                    ]
                                ]
                            ]
                        ]
                    ]
                ]
            ]
        ])
    })
    it("default case", () => {
        const t = places.$.type([
            "ocean|rainforest",
            "|",
            { temperature: "'hot'" }
        ])
        attest(t.flat).unknown.snap([
            ["domain", "object"],
            [
                "switch",
                {
                    path: "/color",
                    kind: "value",
                    cases: {
                        "'blue'": [
                            [
                                "requiredProps",
                                [
                                    ["climate", [["value", "wet"]]],
                                    ["color", [["value", "blue"]]],
                                    ["isOcean", [["value", true]]]
                                ]
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
                        default: [
                            [
                                "requiredProps",
                                [["temperature", [["value", "hot"]]]]
                            ]
                        ]
                    }
                }
            ]
        ])
    })
})
