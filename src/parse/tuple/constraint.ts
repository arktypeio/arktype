import { intersection } from "../../nodes/intersection.ts"
import type { TypeSet } from "../../nodes/node.ts"
import type { Constraint } from "../../nodes/rules/rules.ts"
import type { Dict, mutable } from "../../utils/generics.ts"
import type {
    inferDefinition,
    InferenceContext,
    validateDefinition
} from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import type { TupleExpressionParser } from "./tuple.ts"
import type { distributable } from "./utils.ts"
import { entriesOfDistributableFunction } from "./utils.ts"

export const parseConstraintTuple: TupleExpressionParser<":"> = (
    def,
    scope
) => {
    const inputNode = parseDefinition(def[0], scope)
    const distributedValidatorEntries = entriesOfDistributableFunction(
        def[2] as distributable<Constraint>,
        inputNode,
        scope
    )
    const distributedValidatorNode: mutable<TypeSet> = {}
    for (const [domain, constraint] of distributedValidatorEntries) {
        distributedValidatorNode[domain] = { constraint }
    }
    return intersection(inputNode, distributedValidatorNode, scope)
}

export type validateConstraintTuple<narrowedDef, c extends InferenceContext> = [
    validateDefinition<narrowedDef, c>,
    ":",
    distributable<Constraint<inferDefinition<narrowedDef, c>>>
]

export type ConstraintBuilder<scope extends Dict = {}> = <
    def,
    constraint extends Constraint<inferDefinition<def, { scope: scope }>>
>(
    def: validateDefinition<def, { scope: scope }>,
    constraint: constraint
) => [def, ":", constraint]

export const constrain: ConstraintBuilder = (def, fn) => [def as any, ":", fn]
