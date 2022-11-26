import type { array } from "../utils/dataTypes.js"
import type { Never } from "./types/degenerate.js"

export type ValueLiteral = string | number | boolean

export const intersectAdditiveValues = <t extends ValueLiteral>(
    l: array<t> | undefined,
    r: array<t> | undefined
): array<t> | undefined => {
    if (!l) {
        return r
    }
    if (!r) {
        return l
    }
    const result = [...l]
    for (const expression of r) {
        if (!l.includes(expression)) {
            result.push(expression)
        }
    }
    return result
}

export const intersectDisjointValues = <t extends ValueLiteral>(
    l: array<t>,
    r: array<t>
): array<t> | Never => {
    const result = l.filter((value) => r.includes(value))
    return result.length
        ? result
        : [
              {
                  type: "never",
                  reason: "empty primitive set intersection"
              }
          ]
}

export const subtractValues = <t extends ValueLiteral>(
    l: array<t>,
    r: array<t>
) => {
    const result = l.filter((value) => !r.includes(value))
    return result.length ? result : undefined
}
