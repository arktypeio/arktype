import type { ApiDocsByGroup } from "../../repo/jsdocGen.ts"

export const apiDocsByGroup: ApiDocsByGroup = {
    "Type": [
        {
            "group": "Type",
            "name": "$",
            "body": [
                {
                    "kind": "text",
                    "value": "The "
                },
                {
                    "kind": "reference",
                    "value": "Scope"
                },
                {
                    "kind": "text",
                    "value": " in which definitions for this Type its chained methods are parsed"
                }
            ],
            "tags": {
                "api": [
                    {
                        "kind": "text",
                        "value": "Type"
                    }
                ]
            }
        },
        {
            "group": "Type",
            "name": "infer",
            "body": [
                {
                    "kind": "text",
                    "value": "The type of data this returns"
                }
            ],
            "tags": {
                "example": [
                    {
                        "kind": "text",
                        "value": "const parseNumber = type(\"string\").pipe(s => Number.parseInt(s))\ntype ParsedNumber = typeof parseNumber.infer // number\n\n🥸 Inference-only property that will be `undefined` at runtime"
                    }
                ],
                "api": [
                    {
                        "kind": "text",
                        "value": "Type"
                    }
                ]
            }
        },
        {
            "group": "Type",
            "name": "inferIn",
            "body": [
                {
                    "kind": "text",
                    "value": "The type of data this expects"
                }
            ],
            "tags": {
                "example": [
                    {
                        "kind": "text",
                        "value": "const parseNumber = type(\"string\").pipe(s => Number.parseInt(s))\ntype UnparsedNumber = typeof parseNumber.inferIn // string\n\n🥸 Inference-only property that will be `undefined` at runtime"
                    }
                ],
                "api": [
                    {
                        "kind": "text",
                        "value": "Type"
                    }
                ]
            }
        },
        {
            "group": "Type",
            "name": "json",
            "body": [
                {
                    "kind": "text",
                    "value": "The internal JSON representation"
                }
            ],
            "tags": {
                "api": [
                    {
                        "kind": "text",
                        "value": "Type"
                    }
                ]
            }
        },
        {
            "group": "Type",
            "name": "toJsonSchema",
            "body": [
                {
                    "kind": "text",
                    "value": "Generate a JSON Schema"
                }
            ],
            "tags": {
                "throws": [
                    {
                        "kind": "text",
                        "value": "if this cannot be converted to JSON Schema"
                    }
                ],
                "api": [
                    {
                        "kind": "text",
                        "value": "Type"
                    }
                ]
            }
        },
        {
            "group": "Type",
            "name": "meta",
            "body": [
                {
                    "kind": "text",
                    "value": "Metadata like custom descriptions and error messages\n\nThe type of this property "
                },
                {
                    "kind": "link",
                    "url": "https://arktype.io/docs/configuration#custom",
                    "value": "can be extended"
                },
                {
                    "kind": "text",
                    "value": " by your project."
                }
            ],
            "tags": {
                "api": [
                    {
                        "kind": "text",
                        "value": "Type"
                    }
                ]
            }
        },
        {
            "group": "Type",
            "name": "description",
            "body": [
                {
                    "kind": "text",
                    "value": "An English description\n\nBest suited for...\n\t   audience - English speakers\n    data - primitives"
                }
            ],
            "tags": {
                "example": [
                    {
                        "kind": "text",
                        "value": "const n = type(\"0 < number <= 100\")\nconsole.log(n.description) // positive and at most 100"
                    }
                ],
                "api": [
                    {
                        "kind": "text",
                        "value": "Type"
                    }
                ]
            }
        },
        {
            "group": "Type",
            "name": "expression",
            "body": [
                {
                    "kind": "text",
                    "value": "A syntactic representation similar to native TypeScript\n\nBest suited for...\n\t   audience - other developers\n    data - primitives or structures"
                }
            ],
            "tags": {
                "example": [
                    {
                        "kind": "text",
                        "value": "const loc = type({ coords: [\"number\", \"number\"] })\nconsole.log(loc.expression) // { coords: [number, number] }"
                    }
                ],
                "api": [
                    {
                        "kind": "text",
                        "value": "Type"
                    }
                ]
            }
        },
        {
            "group": "Type",
            "name": "assert",
            "body": [
                {
                    "kind": "text",
                    "value": "Validate and morph data, throwing a descriptive AggregateError if it fails\n\nUseful to avoid needing to check for "
                },
                {
                    "kind": "reference",
                    "value": "type.errors"
                },
                {
                    "kind": "text",
                    "value": " if it would be unrecoverable"
                }
            ],
            "tags": {
                "example": [
                    {
                        "kind": "text",
                        "value": "const criticalPayload = type({\n    superImportantValue: \"string\"\n})\n// throws AggregateError: superImportantValue must be a string (was missing)\nconst data = criticalPayload.assert({ irrelevantValue: \"whoops\" })\nconsole.log(data.superImportantValue) // valid output can be accessed directly"
                    }
                ],
                "throws": [],
                "api": [
                    {
                        "kind": "text",
                        "value": "Type"
                    }
                ]
            }
        },
        {
            "group": "Type",
            "name": "allows",
            "body": [
                {
                    "kind": "text",
                    "value": "Validate input data without applying morphs\n\nHighly optimized and best for cases where you need to know if data\nsatisifes a Type's input without needing specific errors on rejection."
                }
            ],
            "tags": {
                "example": [
                    {
                        "kind": "text",
                        "value": "const numeric = type(\"number | bigint\")\n// [0, 2n]\nconst numerics = [0, \"one\", 2n].filter(numeric.allows)"
                    }
                ],
                "api": [
                    {
                        "kind": "text",
                        "value": "Type"
                    }
                ]
            }
        },
        {
            "group": "Type",
            "name": "configure",
            "body": [
                {
                    "kind": "text",
                    "value": "Clone and add metadata to shallow references\n\nDoes not affect error messages within properties of an object\nOverlapping keys on existing meta will be overwritten"
                }
            ],
            "tags": {
                "example": [
                    {
                        "kind": "text",
                        "value": "const notOdd = type(\"number % 2\").configure({ description: \"not odd\" })\n// all constraints at the root are affected\nconst odd = notOdd(3) // must be not odd (was 3)\nconst nonNumber = notOdd(\"two\") // must be not odd (was \"two\")\n\nconst notOddBox = type({\n   // we should have referenced notOdd or added meta here\n   notOdd: \"number % 2\",\n// but instead chained from the root object\n}).configure({ description: \"not odd\" })\n// error message at path notOdd is not affected\nconst odd = notOddBox({ notOdd: 3 }) // notOdd must be even (was 3)\n// error message at root is affected, leading to a misleading description\nconst nonObject = notOddBox(null) // must be not odd (was null)"
                    }
                ],
                "api": [
                    {
                        "kind": "text",
                        "value": "Type"
                    }
                ]
            }
        },
        {
            "group": "Type",
            "name": "describe",
            "body": [
                {
                    "kind": "text",
                    "value": "Clone and add the description to shallow references (equivalent to `.configure({ description })`)\n\nDoes not affect error messages within properties of an object"
                }
            ],
            "tags": {
                "see": [
                    {
                        "kind": "text",
                        "value": ""
                    },
                    {
                        "kind": "reference",
                        "value": "configure"
                    },
                    {
                        "kind": "text",
                        "value": " for usage notes"
                    }
                ],
                "example": [
                    {
                        "kind": "text",
                        "value": "const aToZ = type(/^a.*z$/).describe(\"a string like 'a...z'\")\nconst good = aToZ(\"alcatraz\") // \"alcatraz\"\n// notice how our description is integrated with other parts of the message\nconst badPattern = aToZ(\"albatross\") // must be a string like 'a...z' (was \"albatross\")\nconst nonString = aToZ(123) // must be a string like 'a...z' (was 123)"
                    }
                ],
                "api": [
                    {
                        "kind": "text",
                        "value": "Type"
                    }
                ]
            }
        }
    ]
}