import { intersection } from "../../nodes/intersection.js"
import { TypeSet } from "../../nodes/node.js"
import { type } from "../../type.js"
import type {
    Dict,
    evaluate,
    mutable,
    NonEmptyList
} from "../../utils/generics.js"
import type { inferDefinition, validateDefinition } from "../definition.js"
import { parseDefinition } from "../definition.js"
import type { TupleExpressionParser } from "./tuple.js"
import type { distributable } from "./utils.js"
import { entriesOfDistributableFunction } from "./utils.js"

export const parsePipeTuple: TupleExpressionParser<"|>"> = (def, scope) => {
    const inputNode = parseDefinition(def[0], scope)
    const distributedValidatorEntries = entriesOfDistributableFunction(
        def[2] as distributable<Pipe>,
        inputNode,
        scope
    )
    const distributedValidatorNode: mutable<TypeSet> = {}
    for (const [domain, validator] of distributedValidatorEntries) {
        distributedValidatorNode[domain] = { validator }
    }
    return intersection(inputNode, distributedValidatorNode, scope)
}

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

export type Pipe<T = any> = (In: T) => T

// export type PipeFn = <def, scope extends Dict = {}>(
//     ...args: validatePipeTuple<def, scope, false>
// ) => evaluate<validatePipeTuple<def, scope, false>>

// export const pipe: PipeFn = (definition) => definition as any

// export const t = type([
//     pipe(
//         "string",
//         "|>",
//         (s) => s.trim(),
//         (s) => s + "foo"
//     )
// ])
