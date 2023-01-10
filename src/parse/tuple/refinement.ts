import type { TypeRoot } from "../../nodes/node.ts"
import { intersection } from "../../nodes/node.ts"
import type { Refinement } from "../../nodes/rules/rules.ts"
import type { mutable } from "../../utils/generics.ts"
import type { inferDefinition, validateDefinition } from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import type { TupleExpressionParser } from "./tuple.ts"
import type { distributable } from "./utils.ts"
import { entriesOfDistributableFunction } from "./utils.ts"

// TODO: Allow narrowing from predicate?
export const parseRefinementTuple: TupleExpressionParser<":"> = (
    def,
    scope
) => {
    const inputNode = parseDefinition(def[0], scope)
    const distributedValidatorEntries = entriesOfDistributableFunction(
        def[2] as distributable<Refinement>,
        inputNode,
        scope
    )
    const distributedValidatorNode: mutable<TypeRoot> = {}
    for (const [domain, refinement] of distributedValidatorEntries) {
        distributedValidatorNode[domain] = { refinement }
    }
    return intersection(inputNode, distributedValidatorNode, scope)
}

export type validateRefinementTuple<def, $> = [
    validateDefinition<def, $>,
    ":",
    distributable<Refinement<inferDefinition<def, $>>>
]
