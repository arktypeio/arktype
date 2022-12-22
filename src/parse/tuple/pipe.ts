import { intersection } from "../../nodes/intersection.js"
import type { TypeSet } from "../../nodes/node.js"
import type { Dict, mutable, NonEmptyList } from "../../utils/generics.js"
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

export type PipeBuilder<scope extends Dict = {}> = <
    def,
    pipes extends NonEmptyList<
        distributable<Pipe<inferDefinition<def, scope, scope, false>>>
    >
>(
    def: validateDefinition<def, scope, false>,
    ...pipes: pipes
) => [def, "|>", ...pipes]

export const pipe: PipeBuilder = (def, ...pipes) => [def as any, "|>", ...pipes]
