import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import type { Attributes } from "../exports.js"
import { compileUnion } from "../src/parse/reduce/union/compile.js"

const getTestBranches = (): Attributes[] => [
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
        attest(compileUnion(getTestBranches())).snap({
            props: { size: { type: "number" } },
            branches: {
                kind: "switch",
                path: "",
                key: "type",
                cases: {
                    dictionary: {
                        branches: {
                            kind: "switch",
                            path: "kind",
                            key: "value",
                            cases: { "1": {}, "2": {} }
                        }
                    },
                    array: {
                        branches: {
                            kind: "switch",
                            path: "kind",
                            key: "value",
                            cases: { "1": {}, "2": {} }
                        }
                    }
                }
            }
        })
    })
    test("prune", () => {
        attest(compileUnion([...getTestBranches(), { type: "array" }])).snap({
            branches: {
                kind: "switch",
                path: "",
                key: "type",
                cases: {
                    dictionary: {
                        props: { size: { type: "number" } },
                        branches: {
                            kind: "switch",
                            path: "kind",
                            key: "value",
                            cases: { "1": {}, "2": {} }
                        }
                    },
                    array: {}
                }
            }
        })
    })
})
