import { intersection } from "../../nodes/intersection.js"
import type { TypeSet } from "../../nodes/node.js"
import type { Validator } from "../../nodes/rules/rules.js"
import type { Dict, mutable } from "../../utils/generics.js"
import type {
    inferDefinition,
    InferenceContext,
    validateDefinition
} from "../definition.js"
import { parseDefinition } from "../definition.js"
import type { TupleExpressionParser } from "./tuple.js"
import type { distributable } from "./utils.js"
import { entriesOfDistributableFunction } from "./utils.js"

export const parseValidatorTuple: TupleExpressionParser<":"> = (def, scope) => {
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

export type validateValidatorTuple<narrowedDef, c extends InferenceContext> = [
    validateDefinition<narrowedDef, c>,
    ":",
    distributable<Validator<inferDefinition<narrowedDef, c>>>
]

export type ValidatorBuilder<scope extends Dict = {}> = <
    def,
    validator extends Validator<inferDefinition<def, { scope: scope }>>
>(
    def: validateDefinition<def, { scope: scope }>,
    validator: validator
) => [def, ":", validator]

export const validate: ValidatorBuilder = (def, validator) => [
    def as any,
    ":",
    validator
]
