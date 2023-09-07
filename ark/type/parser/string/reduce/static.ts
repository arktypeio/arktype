import type { BoundSchema } from "@arktype/schema"
import type { defined, error, ErrorSuffixToken } from "@arktype/util"
import type {
	Comparator,
	InvertedComparators,
	LimitLiteral,
	MaxComparator,
	MinComparator
} from "../shift/operator/bounds.js"
import type { Scanner } from "../shift/scanner.js"
import type {
	StringifiablePrefixOperator,
	writeMultipleLeftBoundsMessage,
	writeOpenRangeMessage,
	writeUnclosedGroupMessage,
	writeUnmatchedGroupCloseMessage,
	writeUnpairableComparatorMessage
} from "./shared.js"

export type StaticState = {
	root: unknown
	branches: BranchState
	groups: BranchState[]
	finalizer: Scanner.FinalizingLookahead | error | undefined
	scanned: string
	unscanned: string
}

export type AutocompletePrefix = `${StringifiablePrefixOperator} `

type BranchState = {
	prefixes: StringifiablePrefixOperator[]
	leftBound: BoundSchema<"min"> | undefined
	"&": unknown
	"|": unknown
}

export namespace state {
	export type initialize<def extends string> = from<{
		root: undefined
		branches: initialBranches
		groups: []
		finalizer: undefined
		scanned: ""
		unscanned: def
	}>

	export type error<message extends string> = from<{
		root: undefined
		branches: initialBranches
		groups: []
		finalizer: `${message}${ErrorSuffixToken}`
		scanned: ""
		unscanned: ""
	}>

	type initialBranches = branchesFrom<{
		prefixes: []
		leftBound: undefined
		"&": undefined
		"|": undefined
	}>

	type updateScanned<
		previousScanned extends string,
		previousUnscanned extends string,
		updatedUnscanned extends string
	> = previousUnscanned extends `${infer justScanned}${updatedUnscanned}`
		? `${previousScanned}${justScanned}`
		: previousScanned

	export type setRoot<
		s extends StaticState,
		root,
		unscanned extends string
	> = from<{
		root: root
		branches: s["branches"]
		groups: s["groups"]
		finalizer: s["finalizer"]
		scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>
		unscanned: unscanned
	}>

	export type addPrefix<
		s extends StaticState,
		prefix extends StringifiablePrefixOperator,
		unscanned extends string
	> = from<{
		root: s["root"]
		branches: {
			prefixes: [...s["branches"]["prefixes"], prefix]
			leftBound: s["branches"]["leftBound"]
			"&": s["branches"]["&"]
			"|": s["branches"]["|"]
		}
		groups: s["groups"]
		finalizer: s["finalizer"]
		scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>
		unscanned: unscanned
	}>

	export type reduceBranch<
		s extends StaticState,
		token extends "|" | "&",
		unscanned extends string
	> = s["branches"]["leftBound"] extends {}
		? openRangeError<s["branches"]["leftBound"]>
		: from<{
				root: undefined
				branches: {
					prefixes: []
					leftBound: undefined
					"&": token extends "&" ? mergeToIntersection<s> : undefined
					"|": token extends "|" ? mergeToUnion<s> : s["branches"]["|"]
				}
				groups: s["groups"]
				finalizer: s["finalizer"]
				scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>
				unscanned: unscanned
		  }>

	export type reduceLeftBound<
		s extends StaticState,
		limit extends LimitLiteral,
		comparator extends Comparator,
		unscanned extends string
	> = comparator extends "<" | "<="
		? s["branches"]["leftBound"] extends {}
			? state.error<
					writeMultipleLeftBoundsMessage<
						s["branches"]["leftBound"]["limit"],
						s["branches"]["leftBound"]["comparator"],
						limit,
						InvertedComparators[comparator]
					>
			  >
			: from<{
					root: undefined
					branches: {
						prefixes: s["branches"]["prefixes"]
						leftBound: {
							limit: limit
							comparator: InvertedComparators[comparator]
						}
						"&": s["branches"]["&"]
						"|": s["branches"]["|"]
					}
					groups: s["groups"]
					finalizer: s["finalizer"]
					scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>
					unscanned: unscanned
			  }>
		: state.error<writeUnpairableComparatorMessage<comparator>>

	export type reduceRange<
		s extends StaticState,
		minLimit extends LimitLiteral,
		minComparator extends MinComparator,
		maxComparator extends MaxComparator,
		maxLimit extends LimitLiteral,
		unscanned extends string
	> = state.from<{
		root: [minLimit, minComparator, [s["root"], maxComparator, maxLimit]]
		branches: {
			prefixes: s["branches"]["prefixes"]
			leftBound: undefined
			"&": s["branches"]["&"]
			"|": s["branches"]["|"]
		}
		groups: s["groups"]
		finalizer: s["finalizer"]
		scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>
		unscanned: unscanned
	}>

	export type reduceSingleBound<
		s extends StaticState,
		comparator extends Comparator,
		limit extends LimitLiteral,
		unscanned extends string
	> = state.from<{
		root: [s["root"], comparator, limit]
		branches: {
			prefixes: s["branches"]["prefixes"]
			leftBound: undefined
			"&": s["branches"]["&"]
			"|": s["branches"]["|"]
		}
		groups: s["groups"]
		finalizer: s["finalizer"]
		scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>
		unscanned: unscanned
	}>

	type mergeToUnion<s extends StaticState> =
		s["branches"]["|"] extends undefined
			? mergeToIntersection<s>
			: [s["branches"]["|"], "|", mergeToIntersection<s>]

	type mergeToIntersection<s extends StaticState> =
		s["branches"]["&"] extends undefined
			? mergePrefixes<s>
			: [s["branches"]["&"], "&", mergePrefixes<s>]

	type mergePrefixes<
		s extends StaticState,
		remaining extends unknown[] = s["branches"]["prefixes"]
	> = remaining extends [infer head, ...infer tail]
		? [head, mergePrefixes<s, tail>]
		: s["root"]

	type popGroup<stack extends BranchState[], top extends BranchState> = [
		...stack,
		top
	]

	export type finalizeGroup<
		s extends StaticState,
		unscanned extends string
	> = s["branches"]["leftBound"] extends {}
		? openRangeError<s["branches"]["leftBound"]>
		: s["groups"] extends popGroup<infer stack, infer top>
		? from<{
				groups: stack
				branches: top
				root: mergeToUnion<s>
				finalizer: s["finalizer"]
				scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>
				unscanned: unscanned
		  }>
		: state.error<writeUnmatchedGroupCloseMessage<unscanned>>

	export type reduceGroupOpen<
		s extends StaticState,
		unscanned extends string
	> = from<{
		groups: [...s["groups"], s["branches"]]
		branches: initialBranches
		root: undefined
		finalizer: s["finalizer"]
		scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>
		unscanned: unscanned
	}>

	export type finalize<
		s extends StaticState,
		finalizer extends Scanner.FinalizingLookahead
	> = s["groups"] extends []
		? s["branches"]["leftBound"] extends {}
			? openRangeError<s["branches"]["leftBound"]>
			: from<{
					root: mergeToUnion<s>
					groups: s["groups"]
					branches: initialBranches
					finalizer: finalizer
					scanned: s["scanned"]
					unscanned: s["unscanned"]
			  }>
		: state.error<writeUnclosedGroupMessage<")">>

	type openRangeError<range extends defined<BranchState["leftBound"]>> =
		state.error<writeOpenRangeMessage<range["limit"], range["comparator"]>>

	export type previousOperator<s extends StaticState> =
		s["branches"]["leftBound"] extends {}
			? s["branches"]["leftBound"]["comparator"]
			: s["branches"]["prefixes"] extends [
					...unknown[],
					infer tail extends string
			  ]
			? tail
			: s["branches"]["&"] extends {}
			? "&"
			: s["branches"]["|"] extends {}
			? "|"
			: undefined

	export type scanTo<s extends StaticState, unscanned extends string> = from<{
		root: s["root"]
		branches: s["branches"]
		groups: s["groups"]
		finalizer: s["finalizer"]
		scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>
		unscanned: unscanned
	}>

	export type from<s extends StaticState> = s

	export type branchesFrom<b extends BranchState> = b
}
