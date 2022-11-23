import type { ScopeRoot } from "../scope.js"
import { isEmpty } from "../utils/deepEquals.js"
import type { defined } from "../utils/generics.js"
import { keySet } from "../utils/generics.js"
import { keywords } from "./keywords.js"
import type { Never, TypeNode, Unknown } from "./node.js"

export type SetOperations<t, context = undefined> = {
    "&": SetOperation<t, context, Never>
    "-": SetOperation<t, context, null>
}

export type SetOperation<
    t,
    context = undefined,
    degenerateResult = never
> = context extends undefined
    ? (l: t, r: t) => t | degenerateResult
    : (l: t, r: t, context: context) => t | degenerateResult

export type TypeOperation = SetOperation<TypeNode, ScopeRoot>

export const keySetOperations = {
    "&": (l, r) => ({ ...l, ...r }),
    "-": (l, r) => {
        const result = { ...l }
        for (const k in r) {
            delete result[k]
        }
        return isEmpty(result) ? null : result
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
