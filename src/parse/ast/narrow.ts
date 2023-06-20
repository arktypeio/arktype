import type { TraversalState } from "../../compile/traverse.js"
import { throwParseError } from "../../../dev/utils/src/errors.js"
import { parseDefinition } from "../definition.js"
import type { PostfixParser } from "./tuple.js"

export const parseNarrowTuple: PostfixParser<"=>"> = (def, ctx) => {
    if (typeof def[2] !== "function") {
        return throwParseError(writeMalformedNarrowExpressionMessage(def[2]))
    }
    return parseDefinition(def[0], ctx).constrain("narrow", def[2] as Narrow)
}

export const writeMalformedNarrowExpressionMessage = (value: unknown) =>
    `Narrow expression requires a function following '=>' (was ${typeof value})`

export type Narrow<data = any> = (data: data, state: TraversalState) => boolean

export type GuardedNarrow<data = any, narrowed extends data = data> = (
    data: data,
    state: TraversalState
) => data is narrowed

export type inferNarrow<In, predicate> = predicate extends (
    data: any,
    ...args: any[]
) => data is infer narrowed
    ? narrowed
    : In
