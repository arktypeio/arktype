import type { array } from "../../utils/dataTypes.js"
import { isEmpty } from "../../utils/deepEquals.js"
import type { keySet } from "../../utils/generics.js"
import type { Never } from "./degenerate.js"

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
        : {
              type: "never",
              reason: "empty primitive set intersection"
          }
}

export const pruneValues = <t extends ValueLiteral>(
    l: array<t>,
    r: array<t>
) => {
    const result = l.filter((value) => !r.includes(value))
    return result.length ? result : undefined
}

export const intersectKeySets = (l: keySet, r: keySet): keySet => ({
    ...l,
    ...r
})

export const pruneKeySet = (l: keySet, r: keySet): keySet | undefined => {
    const result = { ...l }
    for (const k in r) {
        delete result[k]
    }
    return isEmpty(result) ? undefined : result
}

// export const queryPath = (attributes: TypeNode, path: string) => {
//     // const segments = pathToSegments(path)
//     // let currentAttributes = attributes
//     // for (const segment of segments) {
//     //     if (currentAttributes.props?.[segment] === undefined) {
//     //         return undefined
//     //     }
//     //     currentAttributes = currentAttributes.props[segment]
//     // }
//     // return currentAttributes[key]
// }
