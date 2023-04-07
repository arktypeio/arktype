import type { TraversalState } from "../../nodes/traverse.js"
import type { asIn } from "../../scopes/type.js"
import { throwParseError } from "../../utils/errors.js"
import type { inferDefinition, validateDefinition } from "../definition.js"
import { parseDefinition } from "../definition.js"
import type { PostfixParser, TupleExpression } from "./tuple.js"

export const parseNarrowTuple: PostfixParser<"=>"> = (def, ctx) => {
    if (typeof def[2] !== "function") {
        return throwParseError(writeMalformedNarrowExpressionMessage(def[2]))
    }
    return parseDefinition(def[0], ctx).intersect({ narrow: def[2] })
}

export const writeMalformedNarrowExpressionMessage = (value: unknown) =>
    `Narrow expression requires a function following '=>' (was ${typeof value})`

export type Filter<data = any> = (data: data, state: TraversalState) => boolean

export type FilterPredicate<data = any, narrowed extends data = data> = (
    data: data,
    state: TraversalState
) => data is narrowed

export type validateFilterTuple<def extends TupleExpression, $> = readonly [
    validateDefinition<def[0], $>,
    "=>",
    Filter<asIn<inferDefinition<def[0], $>>>
]

export type inferFilter<inDef, narrow, $> = narrow extends (
    data: any,
    ...args: any[]
) => data is infer narrowed
    ? narrowed
    : asIn<inferDefinition<inDef, $>>
