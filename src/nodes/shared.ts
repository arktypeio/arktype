import { isEmpty } from "../utils/deepEquals.js"
import { keySet } from "../utils/generics.js"

export type SetOperations<
    t,
    context = undefined,
    emptySet = null,
    universalSet = undefined
> = {
    intersection: context extends undefined
        ? (a: t, b: t) => t | emptySet
        : (a: t, b: t, context: context) => t | emptySet
    difference: context extends undefined
        ? (a: t, b: t) => t | universalSet
        : (a: t, b: t, context: context) => t | universalSet
}

export const keySetOperations = {
    intersection: (a, b) => ({ ...a, ...b }),
    difference: (a, b) => {
        const result = { ...a }
        for (const k in b) {
            delete result[k]
        }
        return isEmpty(result) ? undefined : result
    }
} satisfies SetOperations<keySet>

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
