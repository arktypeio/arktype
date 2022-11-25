import { isEmpty } from "../utils/deepEquals.js"
import type { keySet } from "../utils/generics.js"
import type { AttributeDifference, AttributeIntersection } from "./node.js"

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
