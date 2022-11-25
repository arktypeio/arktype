import type { ScopeRoot } from "../scope.js"
import type { dictionary } from "../utils/dataTypes.js"
import { isEmpty } from "../utils/deepEquals.js"
import type { defined, keySet } from "../utils/generics.js"
import { keywords } from "./keywords.js"
import type { Never, Node, Unknown } from "./node.js"
import type { NodeOperator } from "./operations.js"

export const intersectAttributes = <
    set extends dictionary,
    intersections extends {
        [k in keyof set]: AttributeIntersection<set[k], true>
    }
>(
    l: set,
    r: set,
    intersections: intersections
) => {
    const result = { ...l, ...r }
    for (const k in result) {
        if (k in l && k in r) {
            const attributeResult = intersections[k](l[k], r[k])
        }
    }
}

export type AttributeIntersection<t, neverable extends boolean = false> = (
    l: t,
    r: t
) => t | (neverable extends true ? Never : never)

export type AttributeDifference<t> = (l: t, r: t) => t | null

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
