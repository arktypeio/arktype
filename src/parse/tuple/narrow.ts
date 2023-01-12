import { intersection } from "../../nodes/node.ts"
import type { Narrow } from "../../nodes/rules/rules.ts"
import type { inferDefinition, validateDefinition } from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import type { TupleExpressionParser } from "./tuple.ts"
import type { distributable } from "./utils.ts"
import { distributeFunctionToNode } from "./utils.ts"

// TODO: Allow narrowing from predicate?
export const parseNarrowTuple: TupleExpressionParser<":"> = (def, scope) => {
    const inputNode = parseDefinition(def[0], scope)
    return intersection(
        inputNode,
        distributeFunctionToNode(
            def[2] as distributable<Narrow>,
            inputNode,
            scope,
            "narrow"
        ),
        scope
    )
}

export type validateNarrowTuple<def, $> = [
    validateDefinition<def, $>,
    ":",
    distributable<Narrow<inferDefinition<def, $>>>
]
