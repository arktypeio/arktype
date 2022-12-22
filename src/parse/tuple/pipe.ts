import type { Dict, NonEmptyList } from "../../utils/generics.js"
import type { inferDefinition, validateDefinition } from "../definition.js"
import type { distributable } from "./utils.js"

// export const parseNarrowTuple: TupleExpressionParser<":"> = (def, scope) => {
//     if (!hasDomain(def[2], "object")) {
//         return throwParseError(buildMalformedNarrowMessage(def[2]))
//     }
//     const inputNode = parseDefinition(def[0], scope)
//     const distributedValidatorEntries = entriesOfDistributableFunction(
//         def[2],
//         inputNode,
//         scope
//     )
//     const distributedValidatorNode: mutable<TypeSet> = {}
//     for (const [domain, validator] of distributedValidatorEntries) {
//         distributedValidatorNode[domain] = { validator }
//     }
//     return intersection(inputNode, distributedValidatorNode, scope)
// }

export type validatePipeTuple<
    pipedDef,
    scope extends Dict,
    input extends boolean
> = [
    validateDefinition<pipedDef, scope, input>,
    "|>",
    ...NonEmptyList<
        distributable<Pipe<inferDefinition<pipedDef, scope, scope, input>>>
    >
]

export type Pipe<T> = (In: T) => T
