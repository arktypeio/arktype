import { deepClone } from "@arktype/util"
import type { ResolvedArkConfig } from "../space.js"
import type { Morph } from "../types/morph.js"
import {
	ArkErrors,
	createError,
	type ArkErrorCode,
	type ArkErrorInput,
	type ArkResult,
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
	morphs: QueuedMorph[] = []
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

	queueMorph(morph: Morph): void {
		const input: QueuedMorph = { path: [...this.path], morph }
		this.currentBranch?.morphs.push(input) ?? this.morphs.push(input)
	}

	finalize(): ArkResult<any> {
		if (this.hasError()) {
			return { errors: this.errors }
		}

		const data: any = this.root
		let out = data
		if (this.morphs.length) {
			out = deepClone(this.root)
			for (let i = 0; i < this.morphs.length; i++) {
				const { path, morph } = this.morphs[i]
				if (path.length === 0) {
					this.path = []
					// if the morph applies to the root, just assign to it directly
					const result = morph(out, this)
					if (this.hasError()) return { errors: this.errors }
					out = result
					continue
				}

				// find the object on which the key to be morphed exists
				let parent = out
				for (let pathIndex = 0; pathIndex < path.length - 1; pathIndex++)
					parent = parent[path[pathIndex]]

				// apply the morph function and assign the result to the corresponding property
				const key = path.at(-1)!
				this.path = path
				const result = morph(parent[key], this)
				if (this.hasError()) return { errors: this.errors }
				else parent[key] = result
			}
		}
		return { data, out }
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

	pushBranch(): void {
		this.branches.push({
			error: undefined,
			morphs: []
		})
	}

	popBranch(): BranchTraversalContext {
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
