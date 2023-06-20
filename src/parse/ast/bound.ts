import type { Comparator, SizedData } from "../../nodes/primitive/range.js"
import type { error } from "../../utils/errors.js"
import type { NumberLiteral } from "../../utils/numericLiterals.js"
import type { DateLiteral } from "../string/shift/operand/date.js"
import type { inferAst, validateAst } from "./ast.js"
import type { astToString } from "./utils.js"

/**
 * N number literal
 *  S sized data (a number, string or array)
 * < Comparator (one of <, <=, ==, >=, >)
 * Bound operators allow data to be bounded in the format "S<N", or as a Range: "N<S<N", with comparators restricted to < or <=
 * "N<S<N", with comparators restricted to < or <=
 **/

export type validateBound<l, r, $> = l extends NumberLiteral | DateLiteral
    ? isValidBound<l, inferAst<r, $>> extends true
        ? validateAst<r, $>
        : error<unboundableMessage<astToString<r>, astToString<l>>>
    : l extends [infer leftAst, Comparator, unknown]
    ? error<writeDoubleRightBoundMessage<astToString<leftAst>>>
    : isValidBound<inferAst<l, $>, r> extends true
    ? validateAst<l, $>
    : error<unboundableMessage<astToString<l>, astToString<r>>>

export const writeDoubleRightBoundMessage = <root extends string>(
    root: root
): writeDoubleRightBoundMessage<root> =>
    `Expression ${root} must have at most one right bound`

type writeDoubleRightBoundMessage<root extends string> =
    `Expression ${root} must have at most one right bound`

type isValidBound<rootType, bound> = bound extends NumberLiteral
    ? [rootType] extends [SizedData]
        ? true
        : false
    : bound extends DateLiteral
    ? rootType extends Date
        ? true
        : false
    : false

export type unboundableMessage<
    root extends string,
    bound extends string
> = root extends "Date"
    ? writeUnboundableMessage<root, bound, `Date`>
    : writeUnboundableMessage<root, bound, "number, string, Array">

export const writeUnboundableMessage = <
    root extends string,
    bound extends string,
    validBounds extends string
>(
    root: root,
    validBounds: validBounds,
    bound: bound
): writeUnboundableMessage<root, bound, validBounds> =>
    `Bounded expression ${root} must be bounded by a ${validBounds} (was ${bound})`

export type writeUnboundableMessage<
    root extends string,
    bound extends string,
    validBounds extends string
> = `Bounded expression ${root} must be bounded by a ${validBounds} (was ${bound})`
