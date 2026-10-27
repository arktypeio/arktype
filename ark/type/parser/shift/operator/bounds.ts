import {
	$ark,
	writeUnboundableMessage,
	type BaseRoot,
	type BoundKind,
	type Constraint
} from "@ark/schema"
import { isKeyOf, throwParseError, type KeySet, type Scanner } from "@ark/util"
import type { DateLiteral } from "../../../attributes.ts"
import { writeDoubleRightBoundMessage } from "../../ast/bounds.ts"
import type { InferredAst } from "../../ast/infer.ts"
import type { astToString } from "../../ast/utils.ts"
import type { RootedRuntimeState, RuntimeState } from "../../reduce/dynamic.ts"
import {
	invertedComparators,
	maxComparators,
	writeUnpairableComparatorMessage,
	type Comparator,
	type InvertedComparators,
	type MaxComparator,
	type OpenLeftBound
} from "../../reduce/shared.ts"
import type { s, StaticState } from "../../reduce/static.ts"
import { extractDateLiteralSource, isDateLiteral } from "../operand/date.ts"
import type { parseOperand } from "../operand/operand.ts"
import { writeMissingRightOperandMessage } from "../operand/unenclosed.ts"
import { writeUnexpectedCharacterMessage } from "./operator.ts"

export const parseBound = (
	s: RootedRuntimeState,
	start: ComparatorStartChar
): void => {
	const comparator = shiftComparator(s, start)
	if (s.root.is("unit")) {
		if (typeof s.root.unit === "number") {
			s.reduceLeftBound(s.root.unit, comparator)
			s.unsetRoot()
			return
		}
		if (s.root.unit instanceof Date) {
			const literal =
				`d'${s.root.meta.description ?? s.root.unit.toISOString()}'` as const
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
			s["root"] extends (
				InferredAst<
					Date | number,
					`${infer limit extends number | DateLiteral}`
				>
			) ?
				s.reduceLeftBound<s, limit, comparator, nextUnscanned>
			:	parseRightBound<s.scanTo<s, nextUnscanned>, comparator, $, args>
		:	shiftResultOrError
	:	never

type OneCharComparator = ">" | "<"

export type ComparatorStartChar =
	Comparator extends `${infer char}${string}` ? char : never

export const comparatorStartChars: KeySet<ComparatorStartChar> = {
	"<": 1,
	">": 1,
	"=": 1,
	"!": 1
}

const shiftComparator = (
	s: RuntimeState,
	start: ComparatorStartChar
): Comparator =>
	s.sc.peekIs("=") ? `${start}${s.sc.shift()}`
	: start === "!" ? s.error(writeUnexpectedCharacterMessage(start))
	: (start as OneCharComparator)

type shiftComparator<
	start extends ComparatorStartChar,
	unscanned extends string
> =
	unscanned extends `=${infer nextUnscanned}` ? [`${start}=`, nextUnscanned]
	: start extends OneCharComparator ? [start, unscanned]
	: s.error<writeUnexpectedCharacterMessage<start>>

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
	if (root.extends($ark.kw.number)) {
		if (typeof limit !== "number") {
			return throwParseError(
				writeInvalidLimitMessage(comparator, limit, boundKind)
			)
		}
		return (
			comparator === "==" ? ["min", "max"]
			: comparator === "!=" ? ["notEqual"]
			: comparator[0] === ">" ? ["min"]
			: ["max"]
		)
	}

	if (root.extends($ark.kw.lengthBoundable)) {
		if (typeof limit !== "number") {
			return throwParseError(
				writeInvalidLimitMessage(comparator, limit, boundKind)
			)
		}
		return (
			comparator === "==" ? ["exactLength"]
			: comparator === "!=" ? ["notEqualLength"]
			: comparator[0] === ">" ? ["minLength"]
			: ["maxLength"]
		)
	}
	if (root.extends($ark.kw.Date)) {
		// allow either numeric or date limits
		return (
			comparator === "==" ? ["after", "before"]
			: comparator === "!=" ? ["notEqual"]
			: comparator[0] === ">" ? ["after"]
			: ["before"]
		)
	}
	return throwParseError(writeUnboundableMessage(root.expression))
}

const openLeftBoundToRoot = (
	lBound: OpenLeftBound
): Constraint.Schema<BoundKind> => ({
	rule:
		isDateLiteral(lBound.limit) ?
			extractDateLiteralSource(lBound.limit)
		:	lBound.limit,
	exclusive: lBound.comparator.length === 1
})

export const parseRightBound = (
	s: RootedRuntimeState,
	comparator: Comparator
): void => {
	if (s.sc.unscanned.trimStart() === "")
		return s.error(writeMissingRightOperandMessage(comparator))
	// store the node that will be bounded
	const previousRoot = s.unsetRoot()
	if (s.rightBounded?.root === previousRoot) {
		return s.error(
			writeDoubleRightBoundMessage(s.rightBounded.operand.expression)
		)
	}
	const previousScannerIndex = s.sc.location
	s.parseOperand()
	const limitNode = s.unsetRoot()
	// after parsing the next operand, use the locations to get the
	// token from which it was parsed
	const limitToken = s.sc.sliceChars(previousScannerIndex, s.sc.location)
	s.root = previousRoot
	if (
		!limitNode.is("unit") ||
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

	// a Date's limit may be numeric, as it is for its bounds
	const rule =
		(
			comparator === "!=" &&
			typeof limit === "number" &&
			previousRoot.extends($ark.kw.Date)
		) ?
			new Date(limit)
		:	limit

	for (const kind of boundKinds)
		s.constrainRoot(kind, comparator === "==" ? { rule } : { rule, exclusive })

	if (!s.branches.lBound) {
		s.rightBounded = { root: s.root, operand: previousRoot }
		return
	}

	// if there's an open left bound, perform additional validation and apply it
	if (!isKeyOf(comparator, maxComparators))
		return s.error(writeUnpairableComparatorMessage(comparator))

	const lowerBoundKind = getBoundKinds(
		s.branches.lBound.comparator,
		s.branches.lBound.limit,
		previousRoot,
		"left"
	)
	s.constrainRoot(lowerBoundKind[0], openLeftBoundToRoot(s.branches.lBound))
	s.branches.lBound = null
	s.rightBounded = { root: s.root, operand: previousRoot }
}

export type parseRightBound<
	s extends StaticState,
	comparator extends Comparator,
	$,
	args
> =
	Scanner.skipWhitespace<s["unscanned"]> extends "" ?
		s.error<writeMissingRightOperandMessage<comparator>>
	: parseOperand<s, $, args> extends infer nextState extends StaticState ?
		nextState["root"] extends (
			InferredAst<unknown, `${infer limit extends number | DateLiteral}`>
		) ?
			s["branches"]["lBound"] extends {} ?
				comparator extends MaxComparator ?
					s.reduceRange<
						s,
						s["branches"]["lBound"]["limit"],
						s["branches"]["lBound"]["comparator"],
						comparator,
						limit,
						nextState["unscanned"]
					>
				:	s.error<writeUnpairableComparatorMessage<comparator>>
			:	s.reduceSingleBound<s, comparator, limit, nextState["unscanned"]>
		:	s.error<
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
