import type { array } from "../utils/dataTypes.js"
import type { Never } from "./node.js"
import { AttributeOperations } from "./shared.js"

export type PrimitiveLiteral = string | number | boolean

export type PrimitiveLiteralSet = array<PrimitiveLiteral>

export const intersectAdditivePrimitiveSets = <t extends PrimitiveLiteral>(
    l: array<t>,
    r: array<t>
): array<t> => {
    const result = [...l]
    for (const expression of r) {
        if (!l.includes(expression)) {
            result.push(expression)
        }
    }
    return result
}

export const intersectDisjointPrimitiveSets = <t extends PrimitiveLiteral>(
    l: array<t>,
    r: array<t>
): array<t> | Never => {
    const result = l.filter((value) => r.includes(value))
    return result.length
        ? result
        : {
              degenerate: "never",
              reason: "empty primitive set intersection"
          }
}

export const subtractPrimitiveSets = <t extends PrimitiveLiteral>(
    l: array<t>,
    r: array<t>
): array<t> | null => {
    const result = l.filter((value) => !r.includes(value))
    return result.length ? result : null
}

export const disjointPrimitiveOperations = {
    intersect: intersectDisjointPrimitiveSets,
    subtract: subtractPrimitiveSets
} satisfies AttributeOperations<PrimitiveLiteralSet>

export const additivePrimitiveOperations = {
    intersect: intersectAdditivePrimitiveSets,
    subtract: subtractPrimitiveSets
} satisfies AttributeOperations<PrimitiveLiteralSet>
