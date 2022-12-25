import { intersection } from "../../nodes/intersection.ts"
import type { TypeSet } from "../../nodes/node.ts"
import type { Validator } from "../../nodes/rules/rules.ts"
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
        def[2] as distributable<Validator>,
        inputNode,
        scope
    )
    const distributedValidatorNode: mutable<TypeSet> = {}
    for (const [domain, validator] of distributedValidatorEntries) {
        distributedValidatorNode[domain] = { validator }
    }
    return intersection(inputNode, distributedValidatorNode, scope)
}

export type validateConstraintTuple<narrowedDef, c extends InferenceContext> = [
    validateDefinition<narrowedDef, c>,
    ":",
    distributable<Validator<inferDefinition<narrowedDef, c>>>
]

export type ConstraintBuilder<scope extends Dict = {}> = <
    def,
    validator extends Validator<inferDefinition<def, { scope: scope }>>
>(
    def: validateDefinition<def, { scope: scope }>,
    validator: validator
) => [def, ":", validator]

export const constrain: ConstraintBuilder = (def, fn) => [def as any, ":", fn]
