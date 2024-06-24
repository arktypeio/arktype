import {
	internal,
	jsObjects,
	tsKeywords,
	writeUnboundableMessage,
	type BaseRoot,
	type BoundKind,
	type DateLiteral,
	type LimitLiteral,
	type NodeSchema
} from "@arktype/schema"
import { isKeyOf, throwParseError, type keySet } from "@arktype/util"
import type { astToString } from "../../../semantic/utils.js"
import type {
	DynamicState,
	DynamicStateWithRoot
} from "../../reduce/dynamic.js"
import {
	invertedComparators,
	maxComparators,
	writeUnpairableComparatorMessage,
	type Comparator,
	type InvertedComparators,
	type MaxComparator,
	type OpenLeftBound
} from "../../reduce/shared.js"
import type { StaticState, state } from "../../reduce/static.js"
import { extractDateLiteralSource, isDateLiteral } from "../operand/date.js"
import type { parseOperand } from "../operand/operand.js"
import type { Scanner } from "../scanner.js"

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
			const literal = `d'${
				s.root.description ?? s.root.unit.toISOString()
			}'` as const
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
			Scanner.shiftResult<
				infer comparator extends Comparator,
				infer nextUnscanned
			>
		) ?
			s["root"] extends `${infer limit extends LimitLiteral}` ?
				state.reduceLeftBound<s, limit, comparator, nextUnscanned>
			:	parseRightBound<state.scanTo<s, nextUnscanned>, comparator, $, args>
		:	shiftResultOrError
	:	never

const oneCharComparators = {
	"<": true,
	">": true
} as const

type OneCharComparator = keyof typeof oneCharComparators

export type ComparatorStartChar =
	Comparator extends `${infer char}${string}` ? char : never

export const comparatorStartChars: keySet<ComparatorStartChar> = {
	"<": 1,
	">": 1,
	"=": 1
}

const shiftComparator = (
	s: DynamicState,
	start: ComparatorStartChar
): Comparator =>
	s.scanner.lookaheadIs("=") ? `${start}${s.scanner.shift()}`
	: isKeyOf(start, oneCharComparators) ? start
	: s.error(singleEqualsMessage)

type shiftComparator<
	start extends ComparatorStartChar,
	unscanned extends string
> =
	unscanned extends `=${infer nextUnscanned}` ? [`${start}=`, nextUnscanned]
	: start extends OneCharComparator ? [start, unscanned]
	: state.error<singleEqualsMessage>

export const writeIncompatibleRangeMessage = (
	l: BoundKind,
	r: BoundKind
): string => `Bound kinds ${l} and ${r} are incompatible`

export const getBoundKinds = (
	comparator: Comparator,
	limit: LimitLiteral,
	root: BaseRoot,
	boundKind: BoundExpressionKind
): BoundKind[] => {
	if (root.extends(tsKeywords.number)) {
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
	if (root.extends(internal.lengthBoundable)) {
		if (typeof limit !== "number") {
			return throwParseError(
				writeInvalidLimitMessage(comparator, limit, boundKind)
			)
		}
		return (
			comparator === "==" ? ["minLength", "maxLength"]
			: comparator[0] === ">" ? ["minLength"]
			: ["maxLength"]
		)
	}
	if (root.extends(jsObjects.Date)) {
		// allow either numeric or date limits
		return (
			comparator === "==" ? ["after", "before"]
			: comparator[0] === ">" ? ["after"]
			: ["before"]
		)
	}
	return throwParseError(writeUnboundableMessage(root.expression))
}

export const singleEqualsMessage = `= is not valid here. Default values must be specified on objects like { isAdmin: 'boolean = false' }`
type singleEqualsMessage = typeof singleEqualsMessage

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
	// if the comparator is ==, both the min and max of that pair will be applied
	for (const kind of getBoundKinds(
		comparator,
		typeof limit === "number" ? limit : (limitToken as DateLiteral),
		previousRoot,
		"right"
	))
		s.constrainRoot(kind, { rule: limit, exclusive })

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
		nextState["root"] extends `${infer limit extends LimitLiteral}` ?
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
