import { describe, it } from "mocha"
import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("discriminate", () => {
    it("shallow", () => {
        const t = type("'a'|'b'|'c'")
        attest(t.flat).snap([
            ["domain", "string"],
            [
                "switch",
                {
                    path: [],
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
    const getPlaces = () =>
        scope({
            rainforest: {
                climate: "'wet'",
                color: "'green'",
                isRainforest: "true"
            },
            desert: { climate: "'dry'", color: "'brown'", isDesert: "true" },
            sky: { climate: "'dry'", color: "'blue'", isSky: "true" },
            ocean: { climate: "'wet'", color: "'blue'", isOcean: "true" }
        })
    it("nested", () => {
        const t = getPlaces().type("ocean|sky|rainforest|desert")
        attest(t.flat).snap([
            ["domain", "object"],
            [
                "switch",
                {
                    path: ["color"],
                    kind: "value",
                    cases: {
                        "'blue'": [
                            [
                                "switch",
                                {
                                    path: ["climate"],
                                    kind: "value",
                                    cases: {
                                        "'wet'": [
                                            [
                                                "requiredProp",
                                                ["climate", [["value", "wet"]]]
                                            ],
                                            [
                                                "requiredProp",
                                                ["color", [["value", "blue"]]]
                                            ],
                                            [
                                                "requiredProp",
                                                ["isOcean", [["value", true]]]
                                            ]
                                        ],
                                        "'dry'": [
                                            [
                                                "requiredProp",
                                                ["climate", [["value", "dry"]]]
                                            ],
                                            [
                                                "requiredProp",
                                                ["color", [["value", "blue"]]]
                                            ],
                                            [
                                                "requiredProp",
                                                ["isSky", [["value", true]]]
                                            ]
                                        ]
                                    }
                                }
                            ]
                        ],
                        "'green'": [
                            ["requiredProp", ["climate", [["value", "wet"]]]],
                            ["requiredProp", ["color", [["value", "green"]]]],
                            [
                                "requiredProp",
                                ["isRainforest", [["value", true]]]
                            ]
                        ],
                        "'brown'": [
                            ["requiredProp", ["climate", [["value", "dry"]]]],
                            ["requiredProp", ["color", [["value", "brown"]]]],
                            ["requiredProp", ["isDesert", [["value", true]]]]
                        ]
                    }
                }
            ]
        ])
    })
    it("undiscriminatable", () => {
        const t = getPlaces().type([
            "ocean",
            "|",
            {
                climate: "'wet'",
                color: "'blue'",
                indistinguishableFrom: "ocean"
            }
        ])
        attest(t.flat).snap([
            ["domain", "object"],
            [
                "branches",
                [
                    [
                        ["requiredProp", ["climate", [["value", "wet"]]]],
                        ["requiredProp", ["color", [["value", "blue"]]]],
                        ["requiredProp", ["isOcean", [["value", true]]]]
                    ],
                    [
                        ["requiredProp", ["climate", [["value", "wet"]]]],
                        ["requiredProp", ["color", [["value", "blue"]]]],
                        [
                            "requiredProp",
                            [
                                "indistinguishableFrom",
                                [
                                    ["domain", "object"],
                                    [
                                        "requiredProp",
                                        ["climate", [["value", "wet"]]]
                                    ],
                                    [
                                        "requiredProp",
                                        ["color", [["value", "blue"]]]
                                    ],
                                    [
                                        "requiredProp",
                                        ["isOcean", [["value", true]]]
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
        const t = getPlaces().type([
            "ocean|rainforest",
            "|",
            { temperature: "'hot'" }
        ])
        attest(t.flat).snap([
            ["domain", "object"],
            [
                "switch",
                {
                    path: ["color"],
                    kind: "value",
                    cases: {
                        "'blue'": [
                            ["requiredProp", ["climate", [["value", "wet"]]]],
                            ["requiredProp", ["color", [["value", "blue"]]]],
                            ["requiredProp", ["isOcean", [["value", true]]]]
                        ],
                        "'green'": [
                            ["requiredProp", ["climate", [["value", "wet"]]]],
                            ["requiredProp", ["color", [["value", "green"]]]],
                            [
                                "requiredProp",
                                ["isRainforest", [["value", true]]]
                            ]
                        ],
                        default: [
                            [
                                "requiredProp",
                                ["temperature", [["value", "hot"]]]
                            ]
                        ]
                    }
                }
            ]
        ])
    })
    it("discriminatable default", () => {
        const t = getPlaces().type([
            { temperature: "'cold'" },
            "|",
            ["ocean|rainforest", "|", { temperature: "'hot'" }]
        ])
        attest(t.flat).snap([
            ["domain", "object"],
            [
                "switch",
                {
                    path: ["temperature"],
                    kind: "value",
                    cases: {
                        "'cold'": [
                            [
                                "requiredProp",
                                ["temperature", [["value", "cold"]]]
                            ]
                        ],
                        "'hot'": [
                            [
                                "requiredProp",
                                ["temperature", [["value", "hot"]]]
                            ]
                        ],
                        default: [
                            [
                                "switch",
                                {
                                    path: ["color"],
                                    kind: "value",
                                    cases: {
                                        "'blue'": [
                                            [
                                                "requiredProp",
                                                ["climate", [["value", "wet"]]]
                                            ],
                                            [
                                                "requiredProp",
                                                ["color", [["value", "blue"]]]
                                            ],
                                            [
                                                "requiredProp",
                                                ["isOcean", [["value", true]]]
                                            ]
                                        ],
                                        "'green'": [
                                            [
                                                "requiredProp",
                                                ["climate", [["value", "wet"]]]
                                            ],
                                            [
                                                "requiredProp",
                                                ["color", [["value", "green"]]]
                                            ],
                                            [
                                                "requiredProp",
                                                [
                                                    "isRainforest",
                                                    [["value", true]]
                                                ]
                                            ]
                                        ]
                                    }
                                }
                            ]
                        ]
                    }
                }
            ]
        ])
    })
    it("won't discriminate between possibly empty arrays", () => {
        attest(type("string[]|boolean[]").flat).snap([
            ["domain", "object"],
            [
                "branches",
                [
                    [
                        ["class", "Array"],
                        ["indexProp", "string"]
                    ],
                    [
                        ["class", "Array"],
                        ["indexProp", "boolean"]
                    ]
                ]
            ]
        ])
    })
})
