import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import type { Attributes } from "../api.js"
import { compileUnion } from "../src/reduce/union/compile.js"

const testBranches: Attributes[] = [
    {
        type: "dictionary",
        props: {
            kind: {
                value: "1"
            },
            size: {
                type: "number"
            }
        }
    },
    {
        type: "array",
        props: {
            kind: {
                value: "1"
            },
            size: {
                type: "number"
            }
        }
    },
    {
        type: "dictionary",
        props: {
            kind: {
                value: "2"
            },
            size: {
                type: "number"
            }
        }
    },
    {
        type: "array",
        props: {
            kind: {
                value: "2"
            },
            size: {
                type: "number"
            }
        }
    }
]

describe("union/discriminate", () => {
    test("discriminate", () => {
        attest(compileUnion(testBranches)).snap({
            props: { size: { type: "number" } },
            branches: [
                "?",
                "",
                "type",
                {
                    dictionary: {
                        branches: ["?", "kind", "value", { "1": {}, "2": {} }]
                    },
                    array: {
                        branches: ["?", "kind", "value", { "1": {}, "2": {} }]
                    }
                }
            ]
        })
    })
    test("prune", () => {
        attest(compileUnion([...testBranches, { type: "array" }])).snap({
            branches: [
                "?",
                "",
                "type",
                {
                    dictionary: {
                        props: { size: { type: "number" } },
                        branches: ["?", "kind", "value", { "1": {}, "2": {} }]
                    },
                    array: {}
                }
            ]
        })
    })
})
