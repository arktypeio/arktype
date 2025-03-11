import type { ApiDocsByGroup } from "../../repo/jsDocGen.ts"

/** THIS FILE IS AUTOGENERATED FROM ark/repo/jsDocGen.ts **/
// prettier-ignore
export const apiDocsByGroup: ApiDocsByGroup = {
    "Type": [
        {
            "group": "Type",
            "name": "$",
            "summary": [
                {
                    "kind": "reference",
                    "value": "Scope"
                },
                {
                    "kind": "text",
                    "value": "in which chained methods are parsed"
                }
            ],
            "notes": []
        },
        {
            "group": "Type",
            "name": "infer",
            "summary": [
                {
                    "kind": "text",
                    "value": "type of output this returns"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "🥸 inference-only property that will be `undefined` at runtime"
                    }
                ]
            ],
            "example": "const parseNumber = type(\"string\").pipe(s => Number.parseInt(s))\ntype ParsedNumber = typeof parseNumber.infer // number"
        },
        {
            "group": "Type",
            "name": "inferIn",
            "summary": [
                {
                    "kind": "text",
                    "value": "type of input this allows"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "🥸 inference-only property that will be `undefined` at runtime"
                    }
                ]
            ],
            "example": "const parseNumber = type(\"string\").pipe(s => Number.parseInt(s))\ntype UnparsedNumber = typeof parseNumber.inferIn // string"
        },
        {
            "group": "Type",
            "name": "json",
            "summary": [
                {
                    "kind": "text",
                    "value": "internal JSON representation"
                }
            ],
            "notes": []
        },
        {
            "group": "Type",
            "name": "toJsonSchema",
            "summary": [
                {
                    "kind": "text",
                    "value": "generate a JSON Schema"
                }
            ],
            "notes": []
        },
        {
            "group": "Type",
            "name": "meta",
            "summary": [
                {
                    "kind": "text",
                    "value": "metadata like custom descriptions and error messages"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "✅ type"
                    },
                    {
                        "kind": "link",
                        "url": "https://arktype.io/docs/configuration#custom",
                        "value": "can be customized"
                    },
                    {
                        "kind": "text",
                        "value": "for your project"
                    }
                ]
            ]
        },
        {
            "group": "Type",
            "name": "description",
            "summary": [
                {
                    "kind": "text",
                    "value": "human-readable English description"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "✅ works best for primitive values"
                    }
                ]
            ],
            "example": "const n = type(\"0 < number <= 100\")\nconsole.log(n.description) // positive and at most 100"
        },
        {
            "group": "Type",
            "name": "expression",
            "summary": [
                {
                    "kind": "text",
                    "value": "syntax string similar to native TypeScript"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "✅ works well for both primitives and structures"
                    }
                ]
            ],
            "example": "const loc = type({ coords: [\"number\", \"number\"] })\nconsole.log(loc.expression) // { coords: [number, number] }"
        },
        {
            "group": "Type",
            "name": "assert",
            "summary": [
                {
                    "kind": "text",
                    "value": "validate and return transformed data or throw"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "✅ sugar to avoid checking for"
                    },
                    {
                        "kind": "reference",
                        "value": "type.errors"
                    },
                    {
                        "kind": "text",
                        "value": "if they are unrecoverable"
                    }
                ]
            ],
            "example": "const criticalPayload = type({\n    superImportantValue: \"string\"\n})\n// throws TraversalError: superImportantValue must be a string (was missing)\nconst data = criticalPayload.assert({ irrelevantValue: \"whoops\" })\nconsole.log(data.superImportantValue) // valid output can be accessed directly"
        },
        {
            "group": "Type",
            "name": "allows",
            "summary": [
                {
                    "kind": "text",
                    "value": "check input without applying morphs"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "✅ good for stuff like filtering that doesn't benefit from detailed errors"
                    }
                ]
            ],
            "example": "const numeric = type(\"number | bigint\")\n// [0, 2n]\nconst numerics = [0, \"one\", 2n].filter(numeric.allows)"
        },
        {
            "group": "Type",
            "name": "configure",
            "summary": [
                {
                    "kind": "text",
                    "value": "add metadata to shallow references"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "⚠️ does not affect error messages within properties of an object"
                    }
                ]
            ],
            "example": "const notOdd = type(\"number % 2\").configure({ description: \"not odd\" })\n// all constraints at the root are affected\nconst odd = notOdd(3) // must be not odd (was 3)\nconst nonNumber = notOdd(\"two\") // must be not odd (was \"two\")\n\nconst notOddBox = type({\n   // we should have referenced notOdd or added meta here\n   notOdd: \"number % 2\",\n// but instead chained from the root object\n}).configure({ description: \"not odd\" })\n// error message at path notOdd is not affected\nconst oddProp = notOddBox({ notOdd: 3 }) // notOdd must be even (was 3)\n// error message at root is affected, leading to a misleading description\nconst nonObject = notOddBox(null) // must be not odd (was null)"
        },
        {
            "group": "Type",
            "name": "describe",
            "summary": [
                {
                    "kind": "text",
                    "value": "add description to shallow references"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "🔗 equivalent to `.configure({ description })` (see"
                    },
                    {
                        "kind": "reference",
                        "value": "configure"
                    },
                    {
                        "kind": "text",
                        "value": ")"
                    }
                ],
                [
                    {
                        "kind": "noteStart",
                        "value": "⚠️ does not affect error messages within properties of an object"
                    }
                ]
            ],
            "example": "const aToZ = type(/^a.*z$/).describe(\"a string like 'a...z'\")\nconst good = aToZ(\"alcatraz\") // \"alcatraz\"\n// ArkErrors: must be a string like 'a...z' (was \"albatross\")\nconst badPattern = aToZ(\"albatross\")"
        },
        {
            "group": "Type",
            "name": "onUndeclaredKey",
            "summary": [
                {
                    "kind": "text",
                    "value": "apply undeclared key behavior"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "- `\"ignore\"` (default) - allow and preserve extra properties"
                    }
                ],
                [
                    {
                        "kind": "noteStart",
                        "value": "- `\"reject\"` - disallow extra properties"
                    }
                ],
                [
                    {
                        "kind": "noteStart",
                        "value": "- `\"delete\"` - clone and remove extra properties from output"
                    }
                ]
            ]
        },
        {
            "group": "Type",
            "name": "onDeepUndeclaredKey",
            "summary": [
                {
                    "kind": "text",
                    "value": "deeply apply undeclared key behavior"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "- `\"ignore\"` (default) - allow and preserve extra properties"
                    }
                ],
                [
                    {
                        "kind": "noteStart",
                        "value": "- `\"reject\"` - disallow extra properties"
                    }
                ],
                [
                    {
                        "kind": "noteStart",
                        "value": "- `\"delete\"` - clone and remove extra properties from output"
                    }
                ]
            ]
        },
        {
            "group": "Type",
            "name": "from",
            "summary": [
                {
                    "kind": "text",
                    "value": "alias for"
                },
                {
                    "kind": "reference",
                    "value": "assert"
                },
                {
                    "kind": "text",
                    "value": "with typed input"
                }
            ],
            "notes": [],
            "example": "const t = type({ foo: \"string\" });\n// TypeScript: foo must be a string (was 5)\nconst data = t.from({ foo: 5 });"
        },
        {
            "group": "Type",
            "name": "brand",
            "summary": [
                {
                    "kind": "text",
                    "value": "add a compile-time brand to output"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "🥸 inference-only function that does nothing runtime"
                    }
                ]
            ],
            "example": "const palindrome = type(\"string\")\n    .narrow(s => s === [...s].reverse().join(\"\"))\n    .brand(\"palindrome\")\n// Brand<string, \"palindrome\">\nconst out = palindrome.assert(\"racecar\")"
        },
        {
            "group": "Type",
            "name": "array",
            "summary": [
                {
                    "kind": "text",
                    "value": "an array of this"
                }
            ],
            "notes": [],
            "example": "// Type<{ rebmun: number }[]>\nconst t = type({ rebmun: \"number\" }).array();"
        },
        {
            "group": "Type",
            "name": "optional",
            "summary": [
                {
                    "kind": "link",
                    "url": "https://arktype.io/docs/objects#properties-optional",
                    "value": "optional definition"
                }
            ],
            "notes": [
                [
                    {
                        "kind": "noteStart",
                        "value": "⚠️ unlike most other methods, this creates a definition rather than a Type (read why)"
                    }
                ]
            ],
            "example": "const prop = type({ foo: \"number\" })\n// Type<{ bar?: { foo: number } }>\nconst obj = type({ bar: prop.optional() })"
        },
        {
            "group": "Type",
            "name": "default",
            "summary": [
                {
                    "kind": "link",
                    "url": "https://arktype.io/docs/objects#properties-defaultable",
                    "value": "defaultable definition"
                }
            ],
            "notes": [
                [
                    {
                        "kind": "noteStart",
                        "value": "✅ object defaults can be returned from a function"
                    }
                ],
                [
                    {
                        "kind": "noteStart",
                        "value": "⚠️ throws if the default value is not allowed"
                    }
                ],
                [
                    {
                        "kind": "noteStart",
                        "value": "⚠️ unlike most other methods, this creates a definition rather than a Type (read why)"
                    }
                ]
            ],
            "example": "// Type<{ count: Default<number, 0> }>\nconst state = type({ count: type.number.default(0) })\nconst prop = type({ nested: \"boolean\" })\nconst forObj = type({\n    key: nested.default(() => ({ nested: false }))\n})"
        },
        {
            "group": "Type",
            "name": "filter",
            "summary": [
                {
                    "kind": "text",
                    "value": "apply a predicate function to input"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "⚠️ the behavior of"
                    },
                    {
                        "kind": "reference",
                        "value": "narrow"
                    },
                    {
                        "kind": "text",
                        "value": ", this method's output counterpart, is usually more desirable"
                    }
                ],
                [
                    {
                        "kind": "noteStart",
                        "value": "✅ most useful for morphs with input types that are re-used externally"
                    }
                ],
                [
                    {
                        "kind": "noteStart",
                        "value": "🥸"
                    },
                    {
                        "kind": "link",
                        "url": "https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates",
                        "value": "Type predicates"
                    },
                    {
                        "kind": "text",
                        "value": "can be used as casts"
                    }
                ]
            ],
            "example": "const stringifyUser = type({ name: \"string\" }).pipe(user => JSON.stringify(user))\nconst stringifySafe = stringifyUser.filter(user => user.name !== \"Bobby Tables\")\n// Type<(In: `${string}Z`) => To<Date>>\nconst withPredicate = type(\"string.date.parse\").filter((s): s is `${string}Z` =>\n    s.endsWith(\"Z\")\n)"
        },
        {
            "group": "Type",
            "name": "narrow",
            "summary": [
                {
                    "kind": "text",
                    "value": "apply a predicate function to output"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "✅ go-to fallback for validation not composable via builtin types and operators"
                    }
                ],
                [
                    {
                        "kind": "noteStart",
                        "value": "✅ runs after all other validators and morphs, if present"
                    }
                ],
                [
                    {
                        "kind": "noteStart",
                        "value": "🥸"
                    },
                    {
                        "kind": "link",
                        "url": "https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates",
                        "value": "Type predicates"
                    },
                    {
                        "kind": "text",
                        "value": "can be used as casts"
                    }
                ]
            ],
            "example": "const palindrome = type(\"string\").narrow(s => s === [...s].reverse().join(\"\"))\n\nconst palindromicEmail = type(\"string.date.parse\").narrow((date, ctx) =>\n\t\tdate.getFullYear() === 2025 || ctx.mustBe(\"the current year\")\n)\n// Type<`${string}.tsx`>\nconst withPredicate = type(\"string\").narrow((s): s is `${string}.tsx` => /\\.tsx?$/.test(s))"
        },
        {
            "group": "Type",
            "name": "pipe",
            "summary": [
                {
                    "kind": "text",
                    "value": "pipe output through arbitrary transformations or other Types"
                }
            ],
            "notes": [],
            "example": "const user = type({ name: \"string\" })\n\n// parse a string and validate that the result as a user\nconst parseUser = type(\"string\").pipe(s => JSON.parse(s), user)"
        },
        {
            "group": "Type",
            "name": "to",
            "summary": [
                {
                    "kind": "text",
                    "value": "parse a definition as an output validator"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "🔗 `to({ name: \"string\" })` is equivalent to `.pipe(type({ name: \"string\" }))`"
                    }
                ]
            ],
            "example": "// parse a string and validate that the result as a user\nconst parseUser = type(\"string\").pipe(s => JSON.parse(s)).to({ name: \"string\" })"
        },
        {
            "group": "Type",
            "name": "as",
            "summary": [
                {
                    "kind": "text",
                    "value": "cast the way this is inferred"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "🥸 inference-only function that does nothing runtime"
                    }
                ]
            ],
            "example": "// Type<`LEEEEEEEE${string}ROY`>\nconst leeroy = type(/^LE{8,}ROY$/).as<`LEEEEEEEE${string}ROY`>()"
        },
        {
            "group": "Type",
            "name": "and",
            "summary": [
                {
                    "kind": "text",
                    "value": "intersect the parsed Type, throwing if the result is unsatisfiable"
                }
            ],
            "notes": [],
            "example": "// Type<{ foo: number; bar: string }>\nconst t = type({ foo: \"number\" }).and({ bar: \"string\" })\n// ParseError: Intersection at foo of number and string results in an unsatisfiable type\nconst bad = type({ foo: \"number\" }).and({ foo: \"string\" })"
        },
        {
            "group": "Type",
            "name": "or",
            "summary": [
                {
                    "kind": "text",
                    "value": "union with the parsed Type"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "⚠️ a union that could apply different morphs to the same data is a ParseError ("
                    },
                    {
                        "kind": "link",
                        "url": "https://arktype.io/docs/expressions/union-morphs",
                        "value": "docs"
                    },
                    {
                        "kind": "text",
                        "value": ")"
                    }
                ]
            ],
            "example": "// Type<string | { box: string }>\nconst t = type(\"string\").or({ box: \"string\" })"
        },
        {
            "group": "Type",
            "name": "intersect",
            "summary": [
                {
                    "kind": "text",
                    "value": "intersect the parsed Type, returning an introspectable"
                },
                {
                    "kind": "reference",
                    "value": "Disjoint"
                },
                {
                    "kind": "text",
                    "value": "if the result is unsatisfiable"
                }
            ],
            "notes": [],
            "example": "// Type<{ foo: number; bar: string }>\nconst t = type({ foo: \"number\" }).intersect({ bar: \"string\" })\nconst bad = type(\"number > 10\").intersect(\"number < 5\")\n// logs \"Intersection of > 10 and < 5 results in an unsatisfiable type\"\nif (bad instanceof Disjoint) console.log(`${bad.summary}`)"
        },
        {
            "group": "Type",
            "name": "equals",
            "summary": [
                {
                    "kind": "text",
                    "value": "check if the parsed Type's constraints are identical"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "✅ equal types have identical input and output constraints and transforms"
                    }
                ],
                [
                    {
                        "kind": "noteStart",
                        "value": "✅ ignores associated"
                    },
                    {
                        "kind": "reference",
                        "value": "meta"
                    },
                    {
                        "kind": "text",
                        "value": ", which does not affect the set of allowed values"
                    }
                ]
            ],
            "example": "const divisibleBy6 = type.number.divisibleBy(6).moreThan(0)\n// false (left side must also be positive)\ndivisibleBy6.equals(\"number % 6\")\n// false (right side has an additional <100 constraint)\nconsole.log(divisibleBy6.equals(\"0 < (number % 6) < 100\"))\nconst thirdTry = type(\"(number % 2) > 0\").divisibleBy(3)\n// true (types are normalized and reduced)\nconsole.log(divisibleBy6.equals(thirdTry))"
        },
        {
            "group": "Type",
            "name": "ifEquals",
            "summary": [
                {
                    "kind": "text",
                    "value": "narrow this based on an"
                },
                {
                    "kind": "reference",
                    "value": "equals"
                },
                {
                    "kind": "text",
                    "value": "check"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "✅ ignores associated"
                    },
                    {
                        "kind": "reference",
                        "value": "meta"
                    },
                    {
                        "kind": "text",
                        "value": ", which does not affect the set of allowed values"
                    }
                ]
            ],
            "example": "const n = type.raw(`${Math.random()}`)\n// Type<0.5> | undefined\nconst ez = n.ifEquals(\"0.5\")"
        },
        {
            "group": "Type",
            "name": "extends",
            "summary": [
                {
                    "kind": "text",
                    "value": "check if this is a subtype of the parsed Type"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "✅ a subtype must include all constraints from the base type"
                    }
                ],
                [
                    {
                        "kind": "noteStart",
                        "value": "✅ unlike"
                    },
                    {
                        "kind": "reference",
                        "value": "equals"
                    },
                    {
                        "kind": "text",
                        "value": ", additional constraints may be present"
                    }
                ],
                [
                    {
                        "kind": "noteStart",
                        "value": "✅ ignores associated"
                    },
                    {
                        "kind": "reference",
                        "value": "meta"
                    },
                    {
                        "kind": "text",
                        "value": ", which does not affect the set of allowed values"
                    }
                ]
            ],
            "example": "type.string.extends(\"unknown\") // true\ntype.string.extends(/^a.*z$/) // false"
        },
        {
            "group": "Type",
            "name": "ifExtends",
            "summary": [
                {
                    "kind": "text",
                    "value": "narrow this based on an"
                },
                {
                    "kind": "reference",
                    "value": "extends"
                },
                {
                    "kind": "text",
                    "value": "check"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "✅ ignores associated"
                    },
                    {
                        "kind": "reference",
                        "value": "meta"
                    },
                    {
                        "kind": "text",
                        "value": ", which does not affect the set of allowed values"
                    }
                ]
            ],
            "example": "const n = type(Math.random() > 0.5 ? \"true\" : \"0\") // Type<0 | true>\nconst ez = n.ifExtends(\"boolean\") // Type<true> | undefined"
        },
        {
            "group": "Type",
            "name": "overlaps",
            "summary": [
                {
                    "kind": "text",
                    "value": "check if a value could satisfy this and the parsed Type"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "⚠️ will return true unless a"
                    },
                    {
                        "kind": "reference",
                        "value": "Disjoint"
                    },
                    {
                        "kind": "text",
                        "value": "can be proven"
                    }
                ]
            ],
            "example": "type.string.overlaps(\"string | number\") // true (e.g. \"foo\")\ntype(\"string | number\").overlaps(\"1\") // true (1)\ntype(\"number > 0\").overlaps(\"number < 0\") // false (no values exist)\n\nconst noAt = type(\"string\").narrow(s => !s.includes(\"@\"))\nnoAt.overlaps(\"string.email\") // true (no values exist, but not provable)"
        },
        {
            "group": "Type",
            "name": "extract",
            "summary": [
                {
                    "kind": "text",
                    "value": "extract branches"
                },
                {
                    "kind": "reference",
                    "value": "extend"
                },
                {
                    "kind": "text",
                    "value": "ing the parsed Type"
                }
            ],
            "notes": [],
            "example": "// Type<true | 0 | 2>\nconst t = type(\"boolean | 0 | 'one' | 2 | bigint\").extract(\"number | 0n | true\")"
        },
        {
            "group": "Type",
            "name": "exclude",
            "summary": [
                {
                    "kind": "text",
                    "value": "exclude branches"
                },
                {
                    "kind": "reference",
                    "value": "extend"
                },
                {
                    "kind": "text",
                    "value": "ing the parsed Type"
                }
            ],
            "notes": [],
            "example": "// Type<false | 'one' | bigint>\nconst t = type(\"boolean | 0 | 'one' | 2 | bigint\").exclude(\"number | 0n | true\")"
        }
    ],
    "Traversal": [
        {
            "group": "Traversal",
            "name": "path",
            "summary": [
                {
                    "kind": "text",
                    "value": "the path being validated or morphed"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "✅ array indices represented as numbers"
                    }
                ],
                [
                    {
                        "kind": "noteStart",
                        "value": "⚠️ mutated during traversal - use `path.slice(0)` to snapshot"
                    }
                ],
                [
                    {
                        "kind": "noteStart",
                        "value": "🔗 use"
                    },
                    {
                        "kind": "reference",
                        "value": "propString"
                    },
                    {
                        "kind": "text",
                        "value": "for a stringified version"
                    }
                ]
            ]
        },
        {
            "group": "Traversal",
            "name": "errors",
            "summary": [
                {
                    "kind": "reference",
                    "value": "ArkErrors"
                },
                {
                    "kind": "text",
                    "value": "that will be part of this traversal's finalized result"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "✅ will always be an empty array for a valid traversal"
                    }
                ]
            ]
        },
        {
            "group": "Traversal",
            "name": "root",
            "summary": [
                {
                    "kind": "text",
                    "value": "the original value being traversed"
                }
            ],
            "notes": []
        },
        {
            "group": "Traversal",
            "name": "config",
            "summary": [
                {
                    "kind": "text",
                    "value": "configuration for this traversal"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "✅ options can affect traversal results and error messages"
                    }
                ],
                [
                    {
                        "kind": "noteStart",
                        "value": "✅ defaults < global config < scope config"
                    }
                ],
                [
                    {
                        "kind": "noteStart",
                        "value": "✅ does not include options configured on individual types"
                    }
                ]
            ]
        },
        {
            "group": "Traversal",
            "name": "reject",
            "summary": [
                {
                    "kind": "text",
                    "value": "add an"
                },
                {
                    "kind": "reference",
                    "value": "ArkError"
                },
                {
                    "kind": "text",
                    "value": "and return `false`"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "✅ useful for predicates like `.narrow`"
                    }
                ]
            ]
        },
        {
            "group": "Traversal",
            "name": "mustBe",
            "summary": [
                {
                    "kind": "text",
                    "value": "add an"
                },
                {
                    "kind": "reference",
                    "value": "ArkError"
                },
                {
                    "kind": "text",
                    "value": "from a description and return `false`"
                }
            ],
            "notes": [
                [],
                [
                    {
                        "kind": "noteStart",
                        "value": "✅ useful for predicates like `.narrow`"
                    }
                ],
                [
                    {
                        "kind": "noteStart",
                        "value": "🔗 equivalent to"
                    },
                    {
                        "kind": "reference",
                        "value": "reject"
                    },
                    {
                        "kind": "text",
                        "value": "({ expected })"
                    }
                ]
            ]
        },
        {
            "group": "Traversal",
            "name": "error",
            "summary": [
                {
                    "kind": "text",
                    "value": "add and return an"
                },
                {
                    "kind": "reference",
                    "value": "ArkError"
                }
            ],
            "notes": [
                [
                    {
                        "kind": "noteStart",
                        "value": "✅ useful for morphs like `.pipe`"
                    }
                ]
            ]
        },
        {
            "group": "Traversal",
            "name": "hasError",
            "summary": [
                {
                    "kind": "text",
                    "value": "whether"
                },
                {
                    "kind": "reference",
                    "value": "currentBranch"
                },
                {
                    "kind": "text",
                    "value": "(or the traversal root, outside a union) has one or more errors"
                }
            ],
            "notes": []
        }
    ]
}
