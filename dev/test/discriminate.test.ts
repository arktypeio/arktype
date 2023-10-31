import { describe, it } from "mocha"
import { scope, type } from "../../src/main.js"
import { attest } from "../attest/main.js"

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
                    cases: { "'a'": [], "'b'": [], "'c'": [] }
                }
            ]
        ])
    })
    const getPlaces = () =>
        scope({
            rainForest: {
                climate: "'wet'",
                color: "'green'",
                isRainForest: "true"
            },
            desert: { climate: "'dry'", color: "'brown'", isDesert: "true" },
            sky: { climate: "'dry'", color: "'blue'", isSky: "true" },
            ocean: { climate: "'wet'", color: "'blue'", isOcean: "true" }
        })
    it("nested", () => {
        const t = getPlaces().type("ocean|sky|rainForest|desert")
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
                                                ["isOcean", [["value", true]]]
                                            ]
                                        ],
                                        "'dry'": [
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
                            [
                                "requiredProp",
                                ["isRainForest", [["value", true]]]
                            ]
                        ],
                        "'brown'": [
                            ["requiredProp", ["climate", [["value", "dry"]]]],
                            ["requiredProp", ["isDesert", [["value", true]]]]
                        ]
                    }
                }
            ]
        ])
    })
    it("doesn't discriminate optional key", () => {
        const a = type({
            direction: "'forward' | 'backward'",
            "operator?": "'by'"
        })

        const b = type({
            duration: "'s' | 'min' | 'h'",
            operator: "'to'"
        })

        const c = type([a, "|", b])
        attest(c.flat).snap([
            ["domain", "object"],
            [
                "branches",
                [
                    [
                        [
                            "requiredProp",
                            [
                                "direction",
                                [
                                    ["domain", "string"],
                                    [
                                        "switch",
                                        {
                                            path: [],
                                            kind: "value",
                                            cases: {
                                                "'forward'": [],
                                                "'backward'": []
                                            }
                                        }
                                    ]
                                ]
                            ]
                        ],
                        ["optionalProp", ["operator", [["value", "by"]]]]
                    ],
                    [
                        [
                            "requiredProp",
                            [
                                "duration",
                                [
                                    ["domain", "string"],
                                    [
                                        "switch",
                                        {
                                            path: [],
                                            kind: "value",
                                            cases: {
                                                "'s'": [],
                                                "'min'": [],
                                                "'h'": []
                                            }
                                        }
                                    ]
                                ]
                            ]
                        ],
                        ["requiredProp", ["operator", [["value", "to"]]]]
                    ]
                ]
            ]
        ])
        attest(
            c.allows({
                direction: "forward"
            })
        ).equals(true)
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
            "ocean|rainForest",
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
                            ["requiredProp", ["isOcean", [["value", true]]]]
                        ],
                        "'green'": [
                            ["requiredProp", ["climate", [["value", "wet"]]]],
                            [
                                "requiredProp",
                                ["isRainForest", [["value", true]]]
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
            ["ocean|rainForest", "|", { temperature: "'hot'" }]
        ])
        attest(t.flat).snap([
            ["domain", "object"],
            [
                "switch",
                {
                    path: ["temperature"],
                    kind: "value",
                    cases: {
                        "'cold'": [],
                        "'hot'": [],
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
                                                [
                                                    "isRainForest",
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
    it("discriminate class", () => {
        const t = type([["instanceof", Array], "|", ["instanceof", Date]])
        attest(t.flat).snap([
            ["domain", "object"],
            [
                "switch",
                { path: [], kind: "class", cases: { Array: [], Date: [] } }
            ]
        ])
        attest(t([]).data).equals([])
        attest(t({}).problems?.summary).snap(
            "Must be an array or a Date (was {})"
        )
    })
    it("won't discriminate between possibly empty arrays", () => {
        attest(type("string[]|boolean[]").flat).snap([
            ["domain", "object"],
            [
                "branches",
                [
                    [
                        ["class", "(function Array)"],
                        ["indexProp", "string"]
                    ],
                    [
                        ["class", "(function Array)"],
                        ["indexProp", "boolean"]
                    ]
                ]
            ]
        ])
    })
})
