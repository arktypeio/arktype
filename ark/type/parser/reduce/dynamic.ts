import type { BaseParseContext, BaseRoot } from "@ark/schema"
import {
	isKeyOf,
	type requireKeys,
	type Scanner,
	throwInternalError,
	throwParseError,
	writeUnclosedGroupMessage,
	writeUnmatchedGroupCloseMessage
} from "@ark/util"
import type { LimitLiteral } from "../../attributes.ts"
import { parseOperand } from "../shift/operand/operand.ts"
import { parseOperator } from "../shift/operator/operator.ts"
import type { FinalizingLookahead, InfixToken } from "../shift/tokens.ts"
import { parseUntilFinalizer } from "../string.ts"
import {
	checkWrittenIntersection,
	type BranchOperator,
	type Comparator,
	invertedComparators,
	type MaxComparator,
	minComparators,
	type OpenLeftBound,
	type StringifiablePrefixOperator,
	writeMultipleLeftBoundsMessage,
	writeOpenRangeMessage,
	writeUnpairableComparatorMessage
} from "./shared.ts"

type BranchState = {
	prefixes: StringifiablePrefixOperator[]
	/** the bound before the operand, like `5 <` in `5 < n`, until its right side is parsed */
	lBound: OpenLeftBound | null
	intersection: BaseRoot | null
	union: BaseRoot | null
	pipe: BaseRoot | null
}

export type RootedRuntimeState = requireKeys<RuntimeState, "root">

export class RuntimeState {
	root: BaseRoot | undefined
	branches: BranchState = {
		prefixes: [],
		lBound: null,
		intersection: null,
		union: null,
		pipe: null
	}
	finalizer: FinalizingLookahead | undefined
	groups: BranchState[] = []
	// the root a right bound produced and the operand it bounded, until the
	// next operand
	rightBounded: { root: BaseRoot; operand: BaseRoot } | undefined

	/** what it's parsing, scanned up to its next token */
	sc: Scanner
	ctx: BaseParseContext

	constructor(sc: Scanner, ctx: BaseParseContext) {
		this.sc = sc
		this.ctx = ctx
	}

	error(message: string): never {
		return throwParseError(message)
	}

	hasRoot(): this is RootedRuntimeState {
		return this.root !== undefined
	}

	setRoot(root: BaseRoot): void {
		this.root = root
	}

	unsetRoot(): this["root"] {
		const value = this.root
		this.root = undefined
		return value
	}

	constrainRoot(...args: Parameters<BaseRoot<any>["rawConstrain"]>): void {
		this.root = this.root!.rawConstrain(args[0], args[1])
	}

	finalize(finalizer: FinalizingLookahead): void {
		if (this.groups.length) return this.error(writeUnclosedGroupMessage(")"))

		this.finalizeBranches()
		this.finalizer = finalizer
	}

	reduceLeftBound(limit: LimitLiteral, comparator: Comparator): void {
		const invertedComparator = invertedComparators[comparator]
		if (!isKeyOf(invertedComparator, minComparators))
			return this.error(writeUnpairableComparatorMessage(comparator))

		if (this.branches.lBound) {
			return this.error(
				writeMultipleLeftBoundsMessage(
					this.branches.lBound.limit,
					this.branches.lBound.comparator,
					limit,
					invertedComparator
				)
			)
		}
		this.branches.lBound = {
			comparator: invertedComparator,
			limit
		}
	}

	finalizeBranches(): void {
		this.assertRangeUnset()

		if (this.branches.pipe) {
			this.pushRootBranch("|>")
			this.root = this.branches.pipe
			return
		}

		if (this.branches.union) {
			this.pushRootBranch("|")
			this.root = this.branches.union
			return
		}

		if (this.branches.intersection) {
			this.pushRootBranch("&")
			this.root = this.branches.intersection
			return
		}

		this.applyPrefixes()
	}

	finalizeGroup(): void {
		this.finalizeBranches()
		const topBranchState = this.groups.pop()
		if (!topBranchState)
			return this.error(writeUnmatchedGroupCloseMessage(")", this.sc.unscanned))

		this.branches = topBranchState
		// a group's root can be bounded, as an expression prints a range
		this.rightBounded = undefined
	}

	addPrefix(prefix: StringifiablePrefixOperator): void {
		this.branches.prefixes.push(prefix)
	}

	applyPrefixes(): void {
		while (this.branches.prefixes.length) {
			const lastPrefix = this.branches.prefixes.pop()!
			this.root =
				lastPrefix === "keyof" ?
					this.root!.keyof()
				:	throwInternalError(`Unexpected prefix '${lastPrefix}'`)
		}
	}

	pushRootBranch(token: BranchOperator): void {
		this.assertRangeUnset()
		this.applyPrefixes()
		const root = this.root!
		this.root = undefined

		const l = this.branches.intersection
		this.branches.intersection = l?.rawAnd(root) ?? root
		if (l) checkWrittenIntersection(this.branches.intersection, l, root)

		if (token === "&") return

		this.branches.union =
			this.branches.union?.rawOr(this.branches.intersection) ??
			this.branches.intersection
		this.branches.intersection = null

		if (token === "|") return

		this.branches.pipe =
			this.branches.pipe?.rawPipeOnce(this.branches.union) ??
			this.branches.union
		this.branches.union = null
	}

	parseUntilFinalizer(): RootedRuntimeState {
		return parseUntilFinalizer(new RuntimeState(this.sc, this.ctx))
	}

	parseOperator(this: RootedRuntimeState): void {
		return parseOperator(this)
	}

	parseOperand(): void {
		this.rightBounded = undefined
		return parseOperand(this)
	}

	private assertRangeUnset() {
		if (this.branches.lBound) {
			return this.error(
				writeOpenRangeMessage(
					this.branches.lBound.limit,
					this.branches.lBound.comparator
				)
			)
		}
	}

	reduceGroupOpen(): void {
		this.groups.push(this.branches)
		this.branches = {
			prefixes: [],
			lBound: null,
			union: null,
			intersection: null,
			pipe: null
		}
	}

	previousOperator():
		| MaxComparator
		| StringifiablePrefixOperator
		| InfixToken
		| undefined {
		return (
			// left bounds are stored inverted, as they'd be written on the right
			(this.branches.lBound &&
				invertedComparators[this.branches.lBound.comparator]) ??
			this.branches.prefixes[this.branches.prefixes.length - 1] ??
			(this.branches.intersection ? "&"
			: this.branches.union ? "|"
			: this.branches.pipe ? "|>"
			: undefined)
		)
	}

	shiftedBy(count: number): this {
		this.sc.jumpForward(count)
		return this
	}
}
