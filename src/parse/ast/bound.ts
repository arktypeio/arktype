import type { error } from "../../../dev/utils/src/errors.js"
import type { NumberLiteral } from "../../../dev/utils/src/numericLiterals.js"
import type { Comparator, SizedData } from "../../nodes/primitive/range.js"
import type { inferAst, validateAst } from "./ast.js"
import type { astToString } from "./utils.js"

/**
 * N number literal
 *  S sized data (a number, string or array)
 * < Comparator (one of <, <=, ==, >=, >)
 * Bound operators allow data to be bounded in the format "S<N", or as a Range: "N<S<N", with comparators restricted to < or <=
 * "N<S<N", with comparators restricted to < or <=
 **/

export type validateBound<l, r, $> = l extends NumberLiteral
    ? validateAst<r, $>
    : l extends [infer leftAst, Comparator, unknown]
    ? error<writeDoubleRightBoundMessage<astToString<leftAst>>>
    : isBoundable<inferAst<l, $>> extends true
    ? validateAst<l, $>
    : error<writeUnboundableMessage<astToString<l>>>

export const writeDoubleRightBoundMessage = <root extends string>(
    root: root
): writeDoubleRightBoundMessage<root> =>
    `Expression ${root} must have at most one right bound`

type writeDoubleRightBoundMessage<root extends string> =
    `Expression ${root} must have at most one right bound`

type isBoundable<data> = [data] extends [SizedData] ? true : false

export const writeUnboundableMessage = <root extends string>(
    root: root
): writeUnboundableMessage<root> =>
    `Bounded expression ${root} must be a number, string, Array, or Date`

type writeUnboundableMessage<root extends string> =
    `Bounded expression ${root} must be a number, string, Array, or Date`
