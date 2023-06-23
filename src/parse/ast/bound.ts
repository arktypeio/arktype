import type { error } from "../../../dev/utils/src/errors.js"
import type { NumberLiteral } from "../../../dev/utils/src/numericLiterals.js"
import type {
    Comparator,
    InvertedComparators,
    SizedData
} from "../../nodes/primitive/range.js"
import type { ValidLiteral } from "../string/reduce/shared.js"
import type { DateLiteral } from "../string/shift/operand/date.js"
import type {
    BoundKind,
    writeInvalidLimitMessage
} from "../string/shift/operator/bounds.js"
import type { inferAst, validateAst } from "./ast.js"
import type { astToString } from "./utils.js"

export type validateRange<
    l,
    comparator extends Comparator,
    r,
    $,
    args
> = l extends ValidLiteral
    ? validateBound<
          r,
          InvertedComparators[comparator],
          astToString<l>,
          "left",
          $,
          args
      >
    : l extends [infer leftAst, Comparator, unknown]
    ? error<writeDoubleRightBoundMessage<astToString<leftAst>>>
    : validateBound<l, comparator, astToString<r>, "right", $, args>

export type validateBound<
    boundedAst,
    comparator extends Comparator,
    limit extends string,
    boundKind extends BoundKind,
    $,
    args
> = inferAst<boundedAst, $, args> extends infer bounded
    ? limit extends NumberLiteral
        ? [bounded] extends [SizedData]
            ? validateAst<boundedAst, $, args>
            : error<writeInvalidLimitMessage<comparator, limit, boundKind>>
        : limit extends DateLiteral
        ? bounded extends Date
            ? validateAst<boundedAst, $, args>
            : error<writeInvalidLimitMessage<comparator, limit, boundKind>>
        : error<writeUnboundableMessage<astToString<boundedAst>>>
    : never

export const writeDoubleRightBoundMessage = <root extends string>(
    root: root
): writeDoubleRightBoundMessage<root> =>
    `Expression ${root} must have at most one right bound`

type writeDoubleRightBoundMessage<root extends string> =
    `Expression ${root} must have at most one right bound`

export const writeUnboundableMessage = <root extends string>(
    root: root
): writeUnboundableMessage<root> =>
    `Bounded expression ${root} must be a number, string, Array, or Date`

type writeUnboundableMessage<root extends string> =
    `Bounded expression ${root} must be a number, string, Array, or Date`
