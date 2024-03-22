import type { ResolvedArkConfig } from "../scope.js"
import type { Morph } from "../types/morph.js"
import {
	ArkErrors,
	createError,
	type ArkErrorCode,
	type ArkErrorInput,
	type ArkTypeError
} from "./errors.js"
import type { TraversalPath } from "./utils.js"

export type QueuedMorph = {
	path: TraversalPath
	morph: Morph
}

export type BranchTraversalContext = {
	error: ArkTypeError | undefined
	morphs: QueuedMorph[]
}

export class TraversalContext {
	path: TraversalPath = []
	errors: ArkErrors = new ArkErrors(this)
	branches: BranchTraversalContext[] = []

	// Qualified
	seen: { [name in string]?: object[] } = {}

	constructor(
		public root: unknown,
		public config: ResolvedArkConfig
	) {}

	get currentBranch(): BranchTraversalContext | undefined {
		return this.branches.at(-1)
	}

	hasError(): boolean {
		return this.currentBranch
			? this.currentBranch.error !== undefined
			: this.errors.count !== 0
	}

	get failFast(): boolean {
		return this.branches.length !== 0
	}

	error<input extends ArkErrorInput>(
		input: input
	): ArkTypeError<
		input extends { code: ArkErrorCode } ? input["code"] : "predicate"
	> {
		const error = createError(this, input)
		if (this.currentBranch) {
			this.currentBranch.error = error
		} else {
			this.errors.add(error)
		}
		return error
	}

	get data(): unknown {
		let result: any = this.root
		for (const segment of this.path) {
			result = result?.[segment]
		}
		return result
	}

	invalid(input: ArkErrorInput): false {
		this.error(input)
		return false
	}

	pushUnion(): void {
		this.branches.push({
			error: undefined,
			morphs: []
		})
	}

	popUnion(): BranchTraversalContext {
		return this.branches.pop()!
	}
}

export type TraversalMethodsByKind<input = unknown> = {
	Allows: TraverseAllows<input>
	Apply: TraverseApply<input>
}

export type TraversalKind = keyof TraversalMethodsByKind

export type TraverseAllows<data = unknown> = (
	data: data,
	ctx: TraversalContext
) => boolean
export type TraverseApply<data = unknown> = (
	data: data,
	ctx: TraversalContext
) => void
