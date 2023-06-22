import { isNumberLike } from "../../../dev/utils/main.js"
import type { error } from "../../../dev/utils/src/errors.js"
import type { NumberLiteral } from "../../../dev/utils/src/numericLiterals.js"
import type { Comparator, SizedData } from "../../nodes/primitive/range.js"
import type { ValidLiterals } from "../string/reduce/shared.js"
import type { DateLiteral } from "../string/shift/operand/date.js"
import type { inferAst, validateAst } from "./ast.js"
import type { astToString } from "./utils.js"

export type validateBound<l, r, $, args> = l extends ValidLiterals
    ? isValidBound<inferAst<r, $, args>, l> extends true
        ? validateAst<r, $, args>
        : boundError<inferAst<r, $, args>, astToString<l>>
    : l extends [infer leftAst, Comparator, unknown]
    ? error<writeDoubleRightBoundMessage<astToString<leftAst>>>
    : isValidBound<inferAst<l, $, args>, r> extends true
    ? validateAst<l, $, args>
    : boundError<inferAst<l, $, args>, astToString<r>>

type boundError<inferredAst, bound extends string> = [inferredAst] extends [
    SizedData
]
    ? error<unboundableMessage<bound>>
    : inferredAst extends Date
    ? error<unboundableMessage<bound, "Date">>
    : error<`This type can not be bound`>

type isValidBound<rootType, bound> = bound extends NumberLiteral
    ? [rootType] extends [SizedData]
        ? true
        : false
    : bound extends DateLiteral
    ? rootType extends Date
        ? true
        : false
    : false

export const writeDoubleRightBoundMessage = <root extends string>(
    root: root
): writeDoubleRightBoundMessage<root> =>
    `Expression ${root} must have at most one right bound`

type writeDoubleRightBoundMessage<root extends string> =
    `Expression ${root} must have at most one right bound`

export const unboundableMessage = <
    bound extends string,
    base extends string | undefined = undefined
>(
    bound: bound,
    base: base
) => {
    base === "Date"
        ? writeUnboundableMessage(bound, base)
        : writeUnboundableMessage(bound)
}

export type unboundableMessage<
    bound extends string,
    base extends string | undefined = undefined
> = base extends "Date"
    ? writeUnboundableMessage<bound, base>
    : writeUnboundableMessage<bound>

export const writeUnboundableMessage = <
    bound extends string,
    validBounds extends string = "number, string or Array"
>(
    bound: bound,
    validBounds = "number, string or Array" as validBounds
): writeUnboundableMessage<bound, validBounds> =>
    `Bound of: ${bound} must be a ${validBounds}`

export type writeUnboundableMessage<
    bound extends string,
    validBounds extends string = "number, string or Array"
> = `Bound of: ${bound} must be a ${validBounds}`
