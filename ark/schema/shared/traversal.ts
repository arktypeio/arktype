import type { array } from "@ark/util"
import type { ResolvedArkConfig } from "../config.ts"
import type { Morph } from "../roots/morph.ts"
import {
	ArkError,
	ArkErrors,
	type ArkErrorCode,
	type ArkErrorContextInput,
	type ArkErrorInput
} from "./errors.ts"
import { appendPropToPathString, isNode, type TraversalPath } from "./utils.ts"

export type MorphsAtPath = {
	path: TraversalPath
	morphs: array<Morph>
}

export type BranchTraversalContext = {
	error: ArkError | undefined
	queuedMorphs: MorphsAtPath[]
}

export class TraversalContext {
	path: TraversalPath = []
	queuedMorphs: MorphsAtPath[] = []
	errors: ArkErrors = new ArkErrors(this)
	branches: BranchTraversalContext[] = []

	seen: { [id in string]?: unknown[] } = {}

	root: unknown
	config: ResolvedArkConfig

	constructor(root: unknown, config: ResolvedArkConfig) {
		this.root = root
		this.config = config
	}

	get currentBranch(): BranchTraversalContext | undefined {
		return this.branches.at(-1)
	}

	queueMorphs(morphs: array<Morph>): void {
		const input: MorphsAtPath = {
			path: [...this.path],
			morphs
		}
		if (this.currentBranch) this.currentBranch.queuedMorphs.push(input)
		else this.queuedMorphs.push(input)
	}

	finalize(): unknown {
		if (!this.queuedMorphs.length)
			return this.hasError() ? this.errors : this.root

		if (
			typeof this.root === "object" &&
			this.root !== null &&
			this.config.clone
		)
			this.root = this.config.clone(this.root)

		this.applyQueuedMorphs()

		return this.hasError() ? this.errors : this.root
	}

	private applyQueuedMorphs() {
		// invoking morphs that are Nodes will reuse this context, potentially
		// adding additional morphs, so we have to continue looping until
		// queuedMorphs is empty rather than iterating over the list once
		while (this.queuedMorphs.length) {
			const queuedMorphs = this.queuedMorphs
			this.queuedMorphs = []
			for (const { path, morphs } of queuedMorphs) {
				// even if we already have an error, apply morphs that are not at a path
				// with errors to capture potential validation errors
				if (this.pathHasError(path)) continue

				this.applyMorphsAtPath(path, morphs)
			}
		}
	}

	private applyMorphsAtPath(path: TraversalPath, morphs: array<Morph>): void {
		const key = path.at(-1)

		let parent: any

		if (key !== undefined) {
			// find the object on which the key to be morphed exists
			parent = this.root
			for (let pathIndex = 0; pathIndex < path.length - 1; pathIndex++)
				parent = parent[path[pathIndex]]
		}

		this.path = path

		for (const morph of morphs) {
			const morphIsNode = isNode(morph)

			const result = morph(
				parent === undefined ? this.root : parent[key!],
				this
			)

			if (result instanceof ArkError) {
				// if an ArkError was returned, ensure it has been added to errors
				this.errors.add(result)
				// skip any remaining morphs at the current path
				break
			}
			if (result instanceof ArkErrors) {
				// if the morph was a direct reference to another node,
				// errors will have been added directly via this piped context
				if (!morphIsNode) {
					// otherwise, we have to ensure each error has been added
					this.errors.merge(result)
				}
				// skip any remaining morphs at the current path
				break
			}

			// if the morph was successful, assign the result to the
			// corresponding property, or to root if path is empty
			if (parent === undefined) this.root = result
			else parent[key!] = result

			// if the current morph queued additional morphs,
			// applying them before subsequent morphs
			this.applyQueuedMorphs()
		}
	}

	get currentErrorCount(): number {
		return (
			this.currentBranch ?
				this.currentBranch.error ?
					1
				:	0
			:	this.errors.count
		)
	}

	hasError(): boolean {
		return this.currentErrorCount !== 0
	}

	pathHasError(path: TraversalPath): boolean {
		if (!this.hasError()) return false

		let partialPropString: string = ""
		if (this.errors.byPath[partialPropString]) return true
		for (let i = 0; i < path.length; i++) {
			partialPropString = appendPropToPathString(partialPropString, path[i])
			if (this.errors.byPath[partialPropString]) return true
		}
		return false
	}

	get failFast(): boolean {
		return this.branches.length !== 0
	}

	error<input extends ArkErrorInput>(
		input: input
	): ArkError<
		input extends { code: ArkErrorCode } ? input["code"] : "predicate"
	> {
		const errCtx: ArkErrorContextInput =
			typeof input === "object" ?
				input.code ?
					input
				:	{ ...input, code: "predicate" }
			:	{ code: "predicate", expected: input }
		const error = new ArkError(errCtx, this)
		if (this.currentBranch) this.currentBranch.error = error
		else this.errors.add(error)

		return error as never
	}

	get data(): unknown {
		let result: any = this.root
		for (const segment of this.path) result = result?.[segment]

		return result
	}

	reject(input: ArkErrorInput): false {
		this.error(input)
		return false
	}

	mustBe(expected: string): false {
		this.error(expected)
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
