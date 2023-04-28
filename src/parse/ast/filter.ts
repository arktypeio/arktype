import type { TraversalState } from "../../nodes/traverse.js"
import type { inferIn } from "../../type.js"
import { throwParseError } from "../../utils/errors.js"
import type { inferDefinition, validateDefinition } from "../definition.js"
import { parseDefinition } from "../definition.js"
import type { PostfixParser, TupleExpression } from "./tuple.js"

export const parseNarrowTuple: PostfixParser<"=>"> = (def, ctx) => {
    if (typeof def[2] !== "function") {
        return throwParseError(writeMalformedFilterExpressionMessage(def[2]))
    }
    return parseDefinition(def[0], ctx).constrain("filter", def[2] as Filter)
}

export const writeMalformedFilterExpressionMessage = (value: unknown) =>
    `Filter expression requires a function following '=>' (was ${typeof value})`

export type Filter<data = any> = (data: data, state: TraversalState) => boolean

export type FilterPredicate<data = any, narrowed extends data = data> = (
    data: data,
    state: TraversalState
) => data is narrowed

export type inferFilter<inDef, predicate, $> = inferPredicate<
    inferIn<inferDefinition<inDef, $>>,
    predicate
>

export type inferPredicate<In, predicate> = predicate extends (
    data: any,
    ...args: any[]
) => data is infer narrowed
    ? narrowed
    : In
