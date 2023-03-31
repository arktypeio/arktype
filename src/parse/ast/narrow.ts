import type { TraversalState } from "../../nodes/traverse.ts"
import type { asIn } from "../../scopes/type.ts"
import type { Domain, inferDomain } from "../../utils/domains.ts"
import { throwParseError } from "../../utils/errors.ts"
import type { inferDefinition, validateDefinition } from "../definition.ts"
import { parseDefinition } from "../definition.ts"
import type { PostfixParser, TupleExpression } from "./tuple.ts"

export const parseNarrowTuple: PostfixParser<"=>"> = (def, ctx) => {
    if (typeof def[2] !== "function") {
        return throwParseError(writeMalformedNarrowExpressionMessage(def[2]))
    }
    return parseDefinition(def[0], ctx).intersect({ narrow: def[2] })
}

export const writeMalformedNarrowExpressionMessage = (value: unknown) =>
    `Narrow expression requires a function following '=>' (was ${typeof value})`

export type Narrow<data = any> = (data: data, state: TraversalState) => boolean

export type NarrowPredicate<data = any, narrowed extends data = data> = (
    data: data,
    state: TraversalState
) => data is narrowed

export type validateNarrowTuple<def extends TupleExpression, $> = readonly [
    validateDefinition<def[0], $>,
    "=>",
    Narrow<asIn<inferDefinition<def[0], $>>>
]

export type inferNarrow<inDef, narrow, $> = narrow extends {
    [domain in Domain]?: any
}
    ? {
          [domain in keyof narrow]: inferNarrowFunction<
              Extract<
                  asIn<inferDefinition<inDef, $>>,
                  inferDomain<domain & Domain>
              >,
              narrow[domain]
          >
      }[keyof narrow]
    : inferNarrowFunction<asIn<inferDefinition<inDef, $>>, narrow>

type inferNarrowFunction<input, narrow> = narrow extends (
    data: any,
    ...args: any[]
) => data is infer narrowed
    ? narrowed
    : input
