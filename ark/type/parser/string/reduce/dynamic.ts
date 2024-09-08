import type { BaseRoot, RootSchema } from "@ark/schema"
import {
	isKeyOf,
	type requireKeys,
	throwInternalError,
	throwParseError
} from "@ark/util"
import type { LimitLiteral } from "../../../keywords/ast.ts"
import type { ParseContext } from "../../../scope.ts"
import type { InfixOperator } from "../../semantic/infer.ts"
import { parseOperand } from "../shift/operand/operand.ts"
import { parseOperator } from "../shift/operator/operator.ts"
import type { Scanner } from "../shift/scanner.ts"
import { parseUntilFinalizer } from "../string.ts"
import {
	type Comparator,
	type MinComparator,
	type OpenLeftBound,
	type StringifiablePrefixOperator,
	invertedComparators,
	minComparators,
	writeMultipleLeftBoundsMessage,
	writeOpenRangeMessage,
	writeUnclosedGroupMessage,
	writeUnmatchedGroupCloseMessage,
	writeUnpairableComparatorMessage
} from "./shared.ts"

type BranchState = {
	prefixes: StringifiablePrefixOperator[]
	leftBound: OpenLeftBound | null
	intersection: BaseRoot | null
	union: BaseRoot | null
}

export type DynamicStateWithRoot = requireKeys<DynamicState, "root">

export class DynamicState {
	root: RootSchema | undefined
	branches: BranchState = {
		prefixes: [],
		leftBound: null,
		intersection: null,
		union: null
	}
	finalizer: Scanner.FinalizingLookahead | undefined
	groups: BranchState[] = []

	scanner: Scanner
	ctx: ParseContext

	constructor(scanner: Scanner, ctx: ParseContext) {
		this.scanner = scanner
		this.ctx = ctx
	}

	error(message: string): never {
		return throwParseError(message)
	}

	hasRoot(): this is DynamicStateWithRoot {
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

	constrainRoot(...args: Parameters<BaseRoot<any>["constrain"]>): void {
		this.root = this.root!.constrain(args[0], args[1])
	}

	finalize(finalizer: Scanner.FinalizingLookahead): void {
		if (this.groups.length) return this.error(writeUnclosedGroupMessage(")"))

		this.finalizeBranches()
		this.finalizer = finalizer
	}

	reduceLeftBound(limit: LimitLiteral, comparator: Comparator): void {
		const invertedComparator = invertedComparators[comparator]
		if (!isKeyOf(invertedComparator, minComparators))
			return this.error(writeUnpairableComparatorMessage(comparator))

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
		this.branches.leftBound = {
			comparator: invertedComparator,
			limit
		}
	}

	finalizeBranches(): void {
		this.assertRangeUnset()
		if (this.branches.union) {
			this.pushRootToBranch("|")
			this.root = this.branches.union
		} else if (this.branches.intersection) {
			this.pushRootToBranch("&")
			this.root = this.branches.intersection
		} else this.applyPrefixes()
	}

	finalizeGroup(): void {
		this.finalizeBranches()
		const topBranchState = this.groups.pop()
		if (!topBranchState)
			return this.error(writeUnmatchedGroupCloseMessage(this.scanner.unscanned))

		this.branches = topBranchState
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

	pushRootToBranch(token: "|" | "&"): void {
		this.assertRangeUnset()
		this.applyPrefixes()
		const root = this.root!
		this.branches.intersection = this.branches.intersection?.and(root) ?? root
		if (token === "|") {
			this.branches.union =
				this.branches.union?.or(this.branches.intersection) ??
				this.branches.intersection
			this.branches.intersection = null
		}
		this.root = undefined
	}

	parseUntilFinalizer(): DynamicStateWithRoot {
		return parseUntilFinalizer(new DynamicState(this.scanner, this.ctx))
	}

	parseOperator(this: DynamicStateWithRoot): void {
		return parseOperator(this)
	}

	parseOperand(): void {
		return parseOperand(this)
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

	reduceGroupOpen(): void {
		this.groups.push(this.branches)
		this.branches = {
			prefixes: [],
			leftBound: null,
			union: null,
			intersection: null
		}
	}

	previousOperator():
		| MinComparator
		| StringifiablePrefixOperator
		| InfixOperator
		| undefined {
		return (
			this.branches.leftBound?.comparator ??
			this.branches.prefixes.at(-1) ??
			(this.branches.intersection ? "&"
			: this.branches.union ? "|"
			: undefined)
		)
	}

	shiftedByOne(): this {
		this.scanner.shift()
		return this
	}
}
