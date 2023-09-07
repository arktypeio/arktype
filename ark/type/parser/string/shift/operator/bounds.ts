import type { keySet } from "@arktype/util"
import { isKeyOf, tryParseWellFormedNumber } from "@arktype/util"
import type { astToString } from "../../../semantic/utils.js"
import type {
	DynamicState,
	DynamicStateWithRoot
} from "../../reduce/dynamic.js"
import { writeUnpairableComparatorMessage } from "../../reduce/shared.js"
import type { state, StaticState } from "../../reduce/static.js"
import type { DateLiteral } from "../operand/date.js"
import { isDateLiteral } from "../operand/date.js"
import { parseOperand } from "../operand/operand.js"
import type { Scanner } from "../scanner.js"

export const parseBound = (
	s: DynamicStateWithRoot,
	start: ComparatorStartChar
) => {
	const comparator = shiftComparator(s, start)
	const value = s.root.unit?.is
	if (typeof value === "number") {
		s.unsetRoot()
		return s.reduceLeftBound(value, comparator)
	} else if (value instanceof Date) {
		s.unsetRoot()
		// TODO:   s.root.unit?.meta.parsedFrom ??
		const literal = `d'${value.toISOString()}'` as const
		return s.reduceLeftBound(literal, comparator)
	}
	return parseRightBound(s, comparator)
}

export type parseBound<
	s extends StaticState,
	start extends ComparatorStartChar,
	unscanned extends string,
	$,
	args
> = shiftComparator<start, unscanned> extends infer shiftResultOrError
	? shiftResultOrError extends Scanner.shiftResult<
			infer comparator extends Comparator,
			infer nextUnscanned
	  >
		? s["root"] extends `${infer limit extends LimitLiteral}`
			? state.reduceLeftBound<s, limit, comparator, nextUnscanned>
			: parseRightBound<state.scanTo<s, nextUnscanned>, comparator, $, args>
		: shiftResultOrError
	: never

export const minComparators = {
	">": true,
	">=": true
} as const

export type MinComparator = keyof typeof minComparators

export const maxComparators = {
	"<": true,
	"<=": true
} as const

export type MaxComparator = keyof typeof maxComparators

export const comparators = {
	...minComparators,
	...maxComparators,
	"==": true
}

export type Comparator = keyof typeof comparators

export type LimitLiteral = number | DateLiteral

const oneCharComparators = {
	"<": true,
	">": true
} as const

type OneCharComparator = keyof typeof oneCharComparators

export type ComparatorStartChar = Comparator extends `${infer char}${string}`
	? char
	: never

export const comparatorStartChars: keySet<ComparatorStartChar> = {
	"<": true,
	">": true,
	"=": true
}

const shiftComparator = (
	s: DynamicState,
	start: ComparatorStartChar
): Comparator =>
	s.scanner.lookaheadIs("=")
		? `${start}${s.scanner.shift()}`
		: isKeyOf(start, oneCharComparators)
		? start
		: s.error(singleEqualsMessage)

type shiftComparator<
	start extends ComparatorStartChar,
	unscanned extends string
> = unscanned extends `=${infer nextUnscanned}`
	? [`${start}=`, nextUnscanned]
	: start extends OneCharComparator
	? [start, unscanned]
	: state.error<singleEqualsMessage>

export const singleEqualsMessage = `= is not a valid comparator. Use == to check for equality`
type singleEqualsMessage = typeof singleEqualsMessage

// TODO: allow numeric limits for Dates?
export const parseRightBound = (
	s: DynamicStateWithRoot,
	comparator: Comparator
) => {
	// store the node that will be bounded
	const previousRoot = s.unsetRoot()
	const previousScannerIndex = s.scanner.location
	parseOperand(s)
	// after parsing the next operand, use the locations to get the
	// token from which it was parsed
	const limitToken = s.scanner.sliceChars(
		previousScannerIndex,
		s.scanner.location
	)
	s.setRoot(previousRoot)
	const limit =
		tryParseWellFormedNumber(limitToken) ??
		(isDateLiteral(limitToken)
			? limitToken
			: s.error(writeInvalidLimitMessage(comparator, limitToken, "right")))
	// apply the newly-parsed right bound
	s.constrainRoot("bound", { comparator, limit })
	if (!s.branches.leftBound) {
		return
	}
	// if there's an open left bound, perform additional validation and apply it
	if (!isKeyOf(comparator, maxComparators)) {
		return s.error(writeUnpairableComparatorMessage(comparator))
	}
	s.constrainRoot("bound", s.branches.leftBound)
	delete s.branches.leftBound
}

export type parseRightBound<
	s extends StaticState,
	comparator extends Comparator,
	$,
	args
> = parseOperand<s, $, args> extends infer nextState extends StaticState
	? nextState["root"] extends `${infer limit extends LimitLiteral}`
		? s["branches"]["leftBound"] extends {}
			? comparator extends MaxComparator
				? state.reduceRange<
						s,
						s["branches"]["leftBound"]["limit"],
						s["branches"]["leftBound"]["comparator"],
						comparator,
						limit,
						nextState["unscanned"]
				  >
				: state.error<writeUnpairableComparatorMessage<comparator>>
			: state.reduceSingleBound<s, comparator, limit, nextState["unscanned"]>
		: state.error<
				writeInvalidLimitMessage<
					comparator,
					astToString<nextState["root"]>,
					"right"
				>
		  >
	: never

export const writeInvalidLimitMessage = <
	comparator extends Comparator,
	limit extends string | number,
	boundKind extends BoundKind
>(
	comparator: comparator,
	limit: limit,
	boundKind: boundKind
): writeInvalidLimitMessage<comparator, limit, boundKind> =>
	`Comparator ${comparator} must be ${
		boundKind === "left" ? "preceded" : ("followed" as any)
	} by a corresponding literal (was '${limit}')`

export type writeInvalidLimitMessage<
	comparator extends Comparator,
	limit extends string | number,
	boundKind extends BoundKind
> = `Comparator ${comparator} must be ${boundKind extends "left"
	? "preceded"
	: "followed"} by a corresponding literal (was '${limit}')`

export type BoundKind = "left" | "right"

export const invertedComparators = {
	"<": ">",
	">": "<",
	"<=": ">=",
	">=": "<=",
	"==": "=="
} as const satisfies Record<Comparator, Comparator>

export type InvertedComparators = typeof invertedComparators
