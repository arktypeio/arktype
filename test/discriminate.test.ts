import { describe, it } from "mocha"
import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("discriminate", () => {
    it("shallow", () => {
        const t = type("'a'|'b'|'c'")
        // TODO: Prune
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
                                "requiredProps",
                                [["temperature", [["value", "cold"]]]]
                            ]
                        ],
                        "'hot'": [
                            [
                                "requiredProps",
                                [["temperature", [["value", "hot"]]]]
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
                                        "'green'": [
                                            [
                                                "requiredProps",
                                                [
                                                    [
                                                        "climate",
                                                        [["value", "wet"]]
                                                    ],
                                                    [
                                                        "color",
                                                        [["value", "green"]]
                                                    ],
                                                    [
                                                        "isRainforest",
                                                        [["value", true]]
                                                    ]
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
                    [["subdomain", ["Array", "string"]]],
                    [["subdomain", ["Array", "boolean"]]]
                ]
            ]
        ])
    })
})
