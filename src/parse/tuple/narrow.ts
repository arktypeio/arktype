import { intersection } from "../../nodes/node.ts"
import type { asIn } from "../../scopes/type.ts"
import type { Problems } from "../../traverse/problems.ts"
import type { inferDefinition, validateDefinition } from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import type { PostfixParser, TupleExpression } from "./tuple.ts"
import type { distributable } from "./utils.ts"
import { distributeFunctionToNode } from "./utils.ts"

export const parseNarrowTuple: PostfixParser<":"> = (def, ctx) => {
    const inputNode = parseDefinition(def[0], ctx)
    return intersection(
        inputNode,
        distributeFunctionToNode(
            def[2] as distributable<Narrow>,
            inputNode,
            ctx,
            "narrow"
        ),
        ctx.type
    )
}

export type Narrow<data = any> = (data: data, problems: Problems) => boolean

export type validateNarrowTuple<def extends TupleExpression, $> = readonly [
    _: validateDefinition<def[0], $>,
    _: ":",
    _: distributable<Narrow<asIn<inferDefinition<def[0], $>>>>,
    _?: validateDefinition<def[3], $>
]
