import { intersection } from "../../nodes/intersection.js"
import type { TypeSet } from "../../nodes/node.js"
import type { Validator } from "../../nodes/rules/rules.js"
import type { Dict, mutable } from "../../utils/generics.js"
import type { inferDefinition, validateDefinition } from "../definition.js"
import { parseDefinition } from "../definition.js"
import type { TupleExpressionParser } from "./tuple.js"
import type { distributable } from "./utils.js"
import { entriesOfDistributableFunction } from "./utils.js"

export const parseNarrowTuple: TupleExpressionParser<":"> = (def, scope) => {
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

export type validateNarrowTuple<
    narrowedDef,
    scope extends Dict,
    input extends boolean
> = [
    validateDefinition<narrowedDef, scope, input>,
    ":",
    distributable<Validator<inferDefinition<narrowedDef, scope, scope, input>>>
]

export type ValidatorBuilder<scope extends Dict = {}> = <
    def,
    validator extends Validator<inferDefinition<def, scope, scope, false>>
>(
    def: validateDefinition<def, scope, false>,
    validator: validator
) => [def, ":", validator]

export const validate: ValidatorBuilder = (def, validator) => [
    def as any,
    ":",
    validator
]
