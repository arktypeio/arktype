import { intersection } from "../../nodes/node.ts"
import type { inferDefinition, validateDefinition } from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import type { TupleExpression, TupleExpressionParser } from "./tuple.ts"
import type { distributable } from "./utils.ts"
import { distributeFunctionToNode } from "./utils.ts"

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

export type Narrow<data = any> = (data: data) => boolean

export type validateNarrowTuple<def extends TupleExpression, $> = [
    _: validateDefinition<def[0], $>,
    _: ":",
    _: distributable<Narrow<inferDefinition<def[0], $>>>,
    _?: validateDefinition<def[3], $>
]
