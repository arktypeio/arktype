import type { array } from "@arktype/util"
import type { Morph } from "../schemas/morph.js"
import type { ResolvedArkConfig } from "../scope.js"
import {
	type ArkErrorCode,
	type ArkErrorInput,
	ArkErrors,
	ArkTypeError,
	createError
} from "./errors.js"
import type { TraversalPath } from "./utils.js"

export type QueuedMorphs = {
	path: TraversalPath
	morphs: array<Morph>
	to: TraverseApply | null
}

export type BranchTraversalContext = {
	error: ArkTypeError | undefined
	queuedMorphs: QueuedMorphs[]
}

export class TraversalContext {
	path: TraversalPath = []
	queuedMorphs: QueuedMorphs[] = []
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

	queueMorphs(morphs: array<Morph>, outValidator: TraverseApply | null): void {
		const input: QueuedMorphs = {
			path: [...this.path],
			morphs,
			to: outValidator
		}
		this.currentBranch?.queuedMorphs.push(input) ??
			this.queuedMorphs.push(input)
	}

	finalize(): unknown {
		if (this.hasError()) return this.errors

		let out: any = this.root
		if (this.queuedMorphs.length) {
			for (let i = 0; i < this.queuedMorphs.length; i++) {
				const { path, morphs, to } = this.queuedMorphs[i]
				if (path.length === 0) {
					this.path = []
					// if the morph applies to the root, just assign to it directly
					for (const morph of morphs) {
						const result = morph(out, this)
						if (result instanceof ArkErrors) return result
						if (this.hasError()) return this.errors
						if (result instanceof ArkTypeError) {
							// if an ArkTypeError was returned but wasn't added to these
							// errors, add it then return
							this.error(result)
							return this.errors
						}
						out = result
					}
				} else {
					// find the object on which the key to be morphed exists
					let parent = out
					for (let pathIndex = 0; pathIndex < path.length - 1; pathIndex++)
						parent = parent[path[pathIndex]]

					// apply the morph function and assign the result to the corresponding property
					const key = path.at(-1)!
					this.path = path
					for (const morph of morphs) {
						const result = morph(parent[key], this)
						if (result instanceof ArkErrors) return result
						if (this.hasError()) return this.errors
						if (result instanceof ArkTypeError) {
							this.error(result)
							return this.errors
						}
						parent[key] = result
					}
				}
				if (to) {
					const toCtx = new TraversalContext(out, this.config)
					to(out, toCtx)
					return toCtx.finalize()
				}
			}
		}
		return out
	}

	hasError(): boolean {
		return this.currentBranch ?
				this.currentBranch.error !== undefined
			:	this.errors.count !== 0
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
		if (this.currentBranch) this.currentBranch.error = error
		else this.errors.add(error)

		return error
	}

	get data(): unknown {
		let result: any = this.root
		for (const segment of this.path) result = result?.[segment]

		return result
	}

	invalid(input: ArkErrorInput): false {
		this.error(input)
		return false
	}

	pushBranch(): void {
		this.branches.push({
			error: undefined,
			queuedMorphs: []
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
