import type { ScopeRoot } from "../scope.js"
import type { record } from "../utils/dataTypes.js"
import { isEmpty } from "../utils/deepEquals.js"
import type { defined, keySet } from "../utils/generics.js"
import type { Never } from "./node.js"

export type AttributeCheck<attribute, data> = (
    attribute: attribute,
    data: data,
    scope: ScopeRoot
) => boolean

export type AttributeIntersection<t> = (
    l: t,
    r: t,
    scope: ScopeRoot
) => t | Never

export type AttributeDifference<t> = (l: t, r: t, scope: ScopeRoot) => t | null

export type AttributeOperations<attribute, data> = {
    intersect: AttributeIntersection<attribute>
    subtract: AttributeDifference<attribute>
    check: AttributeCheck<attribute, data>
}

export type DataTypeOperations<attributes extends record, data> = {
    [k in keyof attributes]-?: AttributeOperations<defined<attributes[k]>, data>
}

export const intersectKeySets: AttributeIntersection<keySet> = (l, r) => ({
    ...l,
    ...r
})

export const subtractKeySets: AttributeDifference<keySet> = (l, r) => {
    const result = { ...l }
    for (const k in r) {
        delete result[k]
    }
    return isEmpty(result) ? null : result
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
