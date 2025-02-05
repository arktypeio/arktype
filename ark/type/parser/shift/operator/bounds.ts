import {
	$ark,
	writeUnboundableMessage,
	type BaseRoot,
	type BoundKind,
	type NodeSchema
} from "@ark/schema"
import { isKeyOf, throwParseError, type KeySet } from "@ark/util"
import type { DateLiteral } from "../../../attributes.ts"
import type { InferredAst } from "../../ast/infer.ts"
import type { astToString } from "../../ast/utils.ts"
import type {
	DynamicState,
	DynamicStateWithRoot
} from "../../reduce/dynamic.ts"
import {
	invertedComparators,
	maxComparators,
	writeUnpairableComparatorMessage,
	type Comparator,
	type InvertedComparators,
	type MaxComparator,
	type OpenLeftBound
} from "../../reduce/shared.ts"
import type { state, StaticState } from "../../reduce/static.ts"
import { extractDateLiteralSource, isDateLiteral } from "../operand/date.ts"
import type { parseOperand } from "../operand/operand.ts"
import type { ArkTypeScanner } from "../scanner.ts"

export const parseBound = (
	s: DynamicStateWithRoot,
	start: ComparatorStartChar
): void => {
	const comparator = shiftComparator(s, start)
	if (s.root.hasKind("unit")) {
		if (typeof s.root.unit === "number") {
			s.reduceLeftBound(s.root.unit, comparator)
			s.unsetRoot()
			return
		}
		if (s.root.unit instanceof Date) {
			const literal =
				`d'${s.root.description ?? s.root.unit.toISOString()}'` as const
			s.unsetRoot()
			s.reduceLeftBound(literal, comparator)
			return
		}
	}
	return parseRightBound(s, comparator)
}

export type parseBound<
	s extends StaticState,
	start extends ComparatorStartChar,
	unscanned extends string,
	$,
	args
> =
	shiftComparator<start, unscanned> extends infer shiftResultOrError ?
		shiftResultOrError extends (
			ArkTypeScanner.shiftResult<
				infer comparator extends Comparator,
				infer nextUnscanned
			>
		) ?
			s["root"] extends (
				InferredAst<
					Date | number,
					`${infer limit extends number | DateLiteral}`
				>
			) ?
				state.reduceLeftBound<s, limit, comparator, nextUnscanned>
			:	parseRightBound<state.scanTo<s, nextUnscanned>, comparator, $, args>
		:	shiftResultOrError
	:	never

type OneCharComparator = ">" | "<"

export type ComparatorStartChar =
	Comparator extends `${infer char}${string}` ? char : never

export const comparatorStartChars: KeySet<ComparatorStartChar> = {
	"<": 1,
	">": 1,
	"=": 1
}

const shiftComparator = (
	s: DynamicState,
	start: ComparatorStartChar
): Comparator =>
	s.scanner.lookaheadIs("=") ?
		`${start}${s.scanner.shift()}`
	:	(start as OneCharComparator)

type shiftComparator<
	start extends ComparatorStartChar,
	unscanned extends string
> =
	unscanned extends `=${infer nextUnscanned}` ? [`${start}=`, nextUnscanned]
	:	[start & OneCharComparator, unscanned]

export const writeIncompatibleRangeMessage = (
	l: BoundKind,
	r: BoundKind
): string => `Bound kinds ${l} and ${r} are incompatible`

export const getBoundKinds = (
	comparator: Comparator,
	limit: number | DateLiteral,
	root: BaseRoot,
	boundKind: BoundExpressionKind
): BoundKind[] => {
	if (root.extends($ark.intrinsic.number)) {
		if (typeof limit !== "number") {
			return throwParseError(
				writeInvalidLimitMessage(comparator, limit, boundKind)
			)
		}
		return (
			comparator === "==" ? ["min", "max"]
			: comparator[0] === ">" ? ["min"]
			: ["max"]
		)
	}

	if (root.extends($ark.intrinsic.lengthBoundable)) {
		if (typeof limit !== "number") {
			return throwParseError(
				writeInvalidLimitMessage(comparator, limit, boundKind)
			)
		}
		return (
			comparator === "==" ? ["exactLength"]
			: comparator[0] === ">" ? ["minLength"]
			: ["maxLength"]
		)
	}
	if (root.extends($ark.intrinsic.Date)) {
		// allow either numeric or date limits
		return (
			comparator === "==" ? ["after", "before"]
			: comparator[0] === ">" ? ["after"]
			: ["before"]
		)
	}
	return throwParseError(writeUnboundableMessage(root.expression))
}

const openLeftBoundToRoot = (
	leftBound: OpenLeftBound
): NodeSchema<BoundKind> => ({
	rule:
		isDateLiteral(leftBound.limit) ?
			extractDateLiteralSource(leftBound.limit)
		:	leftBound.limit,
	exclusive: leftBound.comparator.length === 1
})

export const parseRightBound = (
	s: DynamicStateWithRoot,
	comparator: Comparator
): void => {
	// store the node that will be bounded
	const previousRoot = s.unsetRoot()
	const previousScannerIndex = s.scanner.location
	s.parseOperand()
	const limitNode = s.unsetRoot()
	// after parsing the next operand, use the locations to get the
	// token from which it was parsed
	const limitToken = s.scanner.sliceChars(
		previousScannerIndex,
		s.scanner.location
	)
	s.root = previousRoot
	if (
		!limitNode.hasKind("unit") ||
		(typeof limitNode.unit !== "number" && !(limitNode.unit instanceof Date))
	)
		return s.error(writeInvalidLimitMessage(comparator, limitToken, "right"))

	const limit = limitNode.unit
	// apply the newly-parsed right bound
	const exclusive = comparator.length === 1

	const boundKinds = getBoundKinds(
		comparator,
		typeof limit === "number" ? limit : (limitToken as DateLiteral),
		previousRoot,
		"right"
	)

	for (const kind of boundKinds) {
		s.constrainRoot(
			kind,
			comparator === "==" ? { rule: limit } : { rule: limit, exclusive }
		)
	}

	if (!s.branches.leftBound) return

	// if there's an open left bound, perform additional validation and apply it
	if (!isKeyOf(comparator, maxComparators))
		return s.error(writeUnpairableComparatorMessage(comparator))

	const lowerBoundKind = getBoundKinds(
		s.branches.leftBound.comparator,
		s.branches.leftBound.limit,
		previousRoot,
		"left"
	)
	s.constrainRoot(lowerBoundKind[0], openLeftBoundToRoot(s.branches.leftBound))
	s.branches.leftBound = null
}

export type parseRightBound<
	s extends StaticState,
	comparator extends Comparator,
	$,
	args
> =
	parseOperand<s, $, args> extends infer nextState extends StaticState ?
		nextState["root"] extends (
			InferredAst<unknown, `${infer limit extends number | DateLiteral}`>
		) ?
			s["branches"]["leftBound"] extends {} ?
				comparator extends MaxComparator ?
					state.reduceRange<
						s,
						s["branches"]["leftBound"]["limit"],
						s["branches"]["leftBound"]["comparator"],
						comparator,
						limit,
						nextState["unscanned"]
					>
				:	state.error<writeUnpairableComparatorMessage<comparator>>
			:	state.reduceSingleBound<s, comparator, limit, nextState["unscanned"]>
		:	state.error<
				writeInvalidLimitMessage<
					comparator,
					astToString<nextState["root"]>,
					"right"
				>
			>
	:	never

export const writeInvalidLimitMessage = <
	comparator extends Comparator,
	limit extends string | number,
	boundKind extends BoundExpressionKind
>(
	comparator: comparator,
	limit: limit,
	boundKind: boundKind
): writeInvalidLimitMessage<comparator, limit, boundKind> =>
	`Comparator ${
		boundKind === "left" ? invertedComparators[comparator] : (comparator as any)
	} must be ${
		boundKind === "left" ? "preceded" : ("followed" as any)
	} by a corresponding literal (was ${limit})`

export type writeInvalidLimitMessage<
	comparator extends Comparator,
	limit extends string | number,
	boundKind extends BoundExpressionKind
> = `Comparator ${boundKind extends "left" ? InvertedComparators[comparator]
:	comparator} must be ${boundKind extends "left" ? "preceded"
:	"followed"} by a corresponding literal (was ${limit})`

export type BoundExpressionKind = "left" | "right"
