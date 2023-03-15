export default `import { type, union } from "arktype"
import { asConst } from "../../src/utils/generics"

export const deepLeftOrRight = union(
    {
        auto: {
            discriminated: "'left'"
        }
    },
    {
        auto: {
            discriminated: "'right'"
        }
    }
)

export const unionInternalRepresentation = asConst([
    ["domain", "object"],
    [
        "switch",
        {
            path: ["auto", "discriminated"],
            kind: "value",
            cases: {
                "'left'": [["requiredProp", ["auto", [["domain", "object"]]]]],
                "'right'": [["requiredProp", ["auto", [["domain", "object"]]]]]
            }
        }
    ]
])

export const numericIntersection = type(
    "(1 <= number%2 < 100) & (0 < number%3 <= 99)"
)

export const numericInternalRepresentation = [
    ["domain", "number"],
    ["divisor", 6],
    ["bound", { limit: 1, comparator: ">=" }],
    ["bound", { comparator: "<=", limit: 99 }]
] as const
`
