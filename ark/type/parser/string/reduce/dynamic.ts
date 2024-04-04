import type { LimitLiteral, Schema } from "@arktype/schema"
import {
	isKeyOf,
	throwInternalError,
	throwParseError,
	type requireKeys
} from "@arktype/util"
import type { ParseContext } from "../../../scope.js"
import type { InfixOperator } from "../../semantic/infer.js"
import { parseOperand } from "../shift/operand/operand.js"
import { parseOperator } from "../shift/operator/operator.js"
import { Scanner } from "../shift/scanner.js"
import { parseUntilFinalizer } from "../string.js"
import {
	invertedComparators,
	minComparators,
	writeMultipleLeftBoundsMessage,
	writeOpenRangeMessage,
	writeUnclosedGroupMessage,
	writeUnmatchedGroupCloseMessage,
	writeUnpairableComparatorMessage,
	type Comparator,
	type MinComparator,
	type OpenLeftBound,
	type StringifiablePrefixOperator
} from "./shared.js"

type BranchState = {
	prefixes: StringifiablePrefixOperator[]
	leftBound?: OpenLeftBound
	intersection?: Schema
	union?: Schema
}

export type DynamicStateWithRoot = requireKeys<DynamicState, "root">

export class DynamicState {
	readonly scanner: Scanner
	root: Schema | undefined
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

	error(message: string): never {
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

	constrainRoot(...args: Parameters<Schema["constrain"]>): void {
		this.root = this.root!.constrain(...args)
	}

	setRoot(root: Schema): void {
		this.root = root
	}

	finalize(finalizer: Scanner.FinalizingLookahead): void {
		if (this.groups.length) {
			return this.error(writeUnclosedGroupMessage(")"))
		}
		this.finalizeBranches()
		this.finalizer = finalizer
	}

	reduceLeftBound(limit: LimitLiteral, comparator: Comparator): void {
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
		this.branches.leftBound = {
			comparator: invertedComparator,
			limit
		}
	}

	finalizeBranches(): void {
		this.assertRangeUnset()
		if (this.branches["union"]) {
			this.pushRootToBranch("|")
			this.root = this.branches["union"]
		} else if (this.branches["intersection"]) {
			this.pushRootToBranch("&")
			this.root = this.branches["intersection"]
		} else {
			this.applyPrefixes()
		}
	}

	finalizeGroup(): void {
		this.finalizeBranches()
		const topBranchState = this.groups.pop()
		if (!topBranchState) {
			return this.error(writeUnmatchedGroupCloseMessage(this.scanner.unscanned))
		}
		this.branches = topBranchState
	}

	addPrefix(prefix: StringifiablePrefixOperator): void {
		this.branches.prefixes.push(prefix)
	}

	applyPrefixes(): void {
		while (this.branches.prefixes.length) {
			const lastPrefix = this.branches.prefixes.pop()!
			this.root =
				lastPrefix === "keyof"
					? this.root!.keyof()
					: throwInternalError(`Unexpected prefix '${lastPrefix}'`)
		}
	}

	pushRootToBranch(token: "|" | "&"): void {
		this.assertRangeUnset()
		this.applyPrefixes()
		const root = this.root!
		this.branches["intersection"] =
			this.branches["intersection"]?.intersectSatisfiable(root) ?? root
		if (token === "|") {
			this.branches["union"] =
				this.branches["union"]?.union(this.branches["intersection"]) ??
				this.branches["intersection"]
			delete this.branches["intersection"]
		}
		this.root = undefined
	}

	parseUntilFinalizer(): DynamicStateWithRoot {
		return parseUntilFinalizer(
			new DynamicState(this.scanner.unscanned, this.ctx)
		)
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
			prefixes: []
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
			(this.branches["intersection"]
				? "&"
				: this.branches["union"]
				? "|"
				: undefined)
		)
	}

	shiftedByOne(): this {
		this.scanner.shift()
		return this
	}
}
