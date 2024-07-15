import type { LimitLiteral, writeUnboundableMessage } from "@ark/schema"
import type { ErrorMessage, array, typeToString } from "@ark/util"
import type { Comparator } from "../string/reduce/shared.js"
import type {
	BoundExpressionKind,
	writeInvalidLimitMessage
} from "../string/shift/operator/bounds.js"
import type { inferAstIn } from "./infer.js"
import type { astToString } from "./utils.js"
import type { validateAst } from "./validate.js"

export type validateRange<l, comparator extends Comparator, r, $, args> =
	l extends LimitLiteral ? validateBound<r, comparator, l, "left", $, args>
	: l extends [infer leftAst, Comparator, unknown] ?
		ErrorMessage<writeDoubleRightBoundMessage<astToString<leftAst>>>
	:	validateBound<l, comparator, r & LimitLiteral, "right", $, args>

export type validateBound<
	boundedAst,
	comparator extends Comparator,
	limit extends LimitLiteral,
	boundKind extends BoundExpressionKind,
	$,
	args
> =
	inferAstIn<boundedAst, $, args> extends infer bounded ?
		isNumericallyBoundable<bounded> extends true ?
			limit extends number ?
				validateAst<boundedAst, $, args>
			:	ErrorMessage<writeInvalidLimitMessage<comparator, limit, boundKind>>
		: [bounded] extends [Date] ?
			// allow numeric or date literal as a Date limit
			validateAst<boundedAst, $, args>
		:	ErrorMessage<writeUnboundableMessage<typeToString<bounded>>>
	:	never

// Check each numerically boundable type individually so an expression comprised
// of mixed bound kinds like (string|number)<5 isn't allowed
type isNumericallyBoundable<bounded> =
	[bounded] extends [number] ? true
	: [bounded] extends [string] ? true
	: [bounded] extends [array] ? true
	: false

export const writeDoubleRightBoundMessage = <root extends string>(
	root: root
): writeDoubleRightBoundMessage<root> =>
	`Expression ${root} must have at most one right bound`

type writeDoubleRightBoundMessage<root extends string> =
	`Expression ${root} must have at most one right bound`
