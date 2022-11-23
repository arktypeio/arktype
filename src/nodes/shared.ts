import type { ScopeRoot } from "../scope.js"
import { isEmpty } from "../utils/deepEquals.js"
import { keySet } from "../utils/generics.js"
import { keywords } from "./keywords.js"
import type { Never, TypeNode, Unknown } from "./node.js"

export type SetOperations<t, context = undefined> = {
    intersection: SetOperation<t, context, Never>
    difference: SetOperation<t, context, Unknown>
}

export type SetOperation<
    t,
    context = undefined,
    degenerateResult = never
> = context extends undefined
    ? (a: t, b: t) => t | degenerateResult
    : (a: t, b: t, context: context) => t | degenerateResult

export type TypeOperation = SetOperation<TypeNode, ScopeRoot>

export const keySetOperations = {
    intersection: (l, r) => ({ ...l, ...r }),
    difference: (l, r) => {
        const result = { ...l }
        for (const k in r) {
            delete result[k]
        }
        return isEmpty(result) ? keywords.unknown : result
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
