import type {
	LimitLiteral,
	NumericallyBoundable,
	writeUnboundableMessage
} from "@arktype/schema"
import type { ErrorMessage } from "@arktype/util"
import type {
	Comparator,
	InvertedComparators
} from "../string/reduce/shared.js"
import type {
	BoundExpressionKind,
	writeInvalidLimitMessage
} from "../string/shift/operator/bounds.js"
import type { inferAstBase } from "./semantic.js"
import type { astToString } from "./utils.js"
import type { validateAst } from "./validate.js"

export type validateRange<
	l,
	comparator extends Comparator,
	r,
	$,
	args
> = l extends LimitLiteral
	? validateBound<r, InvertedComparators[comparator], l, "left", $, args>
	: l extends [infer leftAst, Comparator, unknown]
	? ErrorMessage<writeDoubleRightBoundMessage<astToString<leftAst>>>
	: validateBound<l, comparator, r & LimitLiteral, "right", $, args>

export type validateBound<
	boundedAst,
	comparator extends Comparator,
	limit extends LimitLiteral,
	boundKind extends BoundExpressionKind,
	$,
	args
> = inferAstBase<boundedAst, $, args> extends infer bounded
	? [bounded] extends [NumericallyBoundable]
		? limit extends number
			? validateAst<boundedAst, $, args>
			: ErrorMessage<writeInvalidLimitMessage<comparator, limit, boundKind>>
		: bounded extends Date
		? // allow numeric or date literal as a Date limit
		  validateAst<boundedAst, $, args>
		: ErrorMessage<
				writeUnboundableMessage<
					astToString<
						boundKind extends "left"
							? boundedAst[0 & keyof boundedAst]
							: boundedAst
					>
				>
		  >
	: never

export const writeDoubleRightBoundMessage = <root extends string>(
	root: root
): writeDoubleRightBoundMessage<root> =>
	`Expression ${root} must have at most one right bound`

type writeDoubleRightBoundMessage<root extends string> =
	`Expression ${root} must have at most one right bound`
