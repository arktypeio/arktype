import { intersection } from "../../nodes/intersection.js"
import type { TypeSet } from "../../nodes/node.js"
import type { Validator } from "../../nodes/rules/rules.js"
import { domainsOfNode } from "../../nodes/utils.js"
import { hasDomain } from "../../utils/domains.js"
import { throwParseError } from "../../utils/errors.js"
import type { Dict, mutable } from "../../utils/generics.js"
import type { inferDefinition, validateDefinition } from "../definition.js"
import { parseDefinition } from "../definition.js"
import type { TupleExpressionParser } from "./tuple.js"
import type { distributable } from "./utils.js"
import { entriesOfDistributableFunction } from "./utils.js"

export const parseNarrowTuple: TupleExpressionParser<":"> = (def, scope) => {
    if (!hasDomain(def[2], "object")) {
        return throwParseError(buildMalformedNarrowMessage(def[2]))
    }
    const inputNode = parseDefinition(def[0], scope)
    const distributedValidatorEntries = entriesOfDistributableFunction(
        def[2],
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

const buildMalformedNarrowMessage = (validator: unknown) =>
    `Operator ":" requires a Function or Record<Domain, Function> as a right operand (${JSON.stringify(
        validator
    )} was invalid)`
