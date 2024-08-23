import type { writeUnboundableMessage } from "@ark/schema"
import type {
	ErrorMessage,
	NumberLiteral,
	array,
	typeToString
} from "@ark/util"
import type { LimitLiteral } from "../../keywords/ast.ts"
import type { Comparator } from "../string/reduce/shared.ts"
import type {
	BoundExpressionKind,
	writeInvalidLimitMessage
} from "../string/shift/operator/bounds.ts"
import type { inferAstIn } from "./infer.ts"
import type { astToString } from "./utils.ts"
import type { validateAst } from "./validate.ts"

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
			limit extends NumberLiteral ?
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
