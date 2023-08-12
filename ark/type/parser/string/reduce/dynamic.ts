import type { BaseNode, RangeConstraint } from "@arktype/schema"
import type { requireKeys } from "@arktype/util"
import { isKeyOf, throwInternalError, throwParseError } from "@arktype/util"
import type { ParseContext } from "../../../scope.js"
import type { Comparator, LimitLiteral } from "../shift/operator/bounds.js"
import { invertedComparators } from "../shift/operator/bounds.js"
import { Scanner } from "../shift/scanner.js"
import type { StringifiablePrefixOperator } from "./shared.js"
import {
	writeMultipleLeftBoundsMessage,
	writeOpenRangeMessage,
	writeUnclosedGroupMessage,
	writeUnmatchedGroupCloseMessage,
	writeUnpairableComparatorMessage
} from "./shared.js"

type BranchState = {
	prefixes: StringifiablePrefixOperator[]
	leftBound?: RangeConstraint<"min">
	"&"?: BaseNode
	"|"?: BaseNode
}

export type DynamicStateWithRoot = requireKeys<DynamicState, "root">

export class DynamicState {
	readonly scanner: Scanner
	root: BaseNode | undefined
	branches: BranchState = {
		prefixes: []
	}
	finalizer: Scanner.FinalizingLookahead | undefined
	groups: BranchState[] = []

	constructor(
		def: string,
		public readonly ctx: ParseContext
	) {
		this.scanner = new Scanner(def)
	}

	error(message: string) {
		return throwParseError(message)
	}

	hasRoot(): this is DynamicStateWithRoot {
		return this.root !== undefined
	}

	unsetRoot(): this["root"] {
		const value = this.root
		this.root = undefined
		return value
	}

	constrainRoot(...args: Parameters<BaseNode["constrain"]>) {
		this.root = this.root!.constrain(...args)
	}

	setRoot(root: BaseNode) {
		this.root = root
	}

	finalize(finalizer: Scanner.FinalizingLookahead) {
		if (this.groups.length) {
			return this.error(writeUnclosedGroupMessage(")"))
		}
		this.finalizeBranches()
		this.finalizer = finalizer
	}

	reduceLeftBound(limit: LimitLiteral, comparator: Comparator) {
		const invertedComparator = invertedComparators[comparator]
		if (!isKeyOf(invertedComparator, minComparators)) {
			return this.error(writeUnpairableComparatorMessage(comparator))
		}
		if (this.branches.leftBound) {
			return this.error(
				writeMultipleLeftBoundsMessage(
					this.branches.leftBound.limit,
					this.branches.leftBound.comparator,
					limit,
					invertedComparator
				)
			)
		}
		this.branches.leftBound = { comparator: invertedComparator, limit }
	}

	finalizeBranches() {
		this.assertRangeUnset()
		if (this.branches["|"]) {
			this.pushRootToBranch("|")
			this.root = this.branches["|"]
		} else if (this.branches["&"]) {
			this.pushRootToBranch("&")
			this.root = this.branches["&"]
		} else {
			this.applyPrefixes()
		}
	}

	finalizeGroup() {
		this.finalizeBranches()
		const topBranchState = this.groups.pop()
		if (!topBranchState) {
			return this.error(writeUnmatchedGroupCloseMessage(this.scanner.unscanned))
		}
		this.branches = topBranchState
	}

	addPrefix(prefix: StringifiablePrefixOperator) {
		this.branches.prefixes.push(prefix)
	}

	applyPrefixes() {
		while (this.branches.prefixes.length) {
			const lastPrefix = this.branches.prefixes.pop()!
			this.root =
				lastPrefix === "keyof"
					? this.root!.keyof()
					: throwInternalError(`Unexpected prefix '${lastPrefix}'`)
		}
	}

	pushRootToBranch(token: "|" | "&") {
		this.assertRangeUnset()
		this.applyPrefixes()
		const root = this.root!
		this.branches["&"] = this.branches["&"]?.and(root) ?? root
		if (token === "|") {
			this.branches["|"] =
				this.branches["|"]?.or(this.branches["&"]) ?? this.branches["&"]
			delete this.branches["&"]
		}
		this.root = undefined
	}

	private assertRangeUnset() {
		if (this.branches.leftBound) {
			return this.error(
				writeOpenRangeMessage(
					this.branches.leftBound.limit,
					this.branches.leftBound.comparator
				)
			)
		}
	}

	reduceGroupOpen() {
		this.groups.push(this.branches)
		this.branches = {
			prefixes: []
		}
	}

	previousOperator() {
		// this.branches.range?.min
		//     ? this.branches.range.min.comparator
		//     :
		return (
			this.branches.prefixes.at(-1) ??
			(this.branches["&"] ? "&" : this.branches["|"] ? "|" : undefined)
		)
	}

	shiftedByOne() {
		this.scanner.shift()
		return this
	}
}
