import {
	ReadonlyPath,
	hasDomain,
	isArray,
	noSuggest,
	objectKindOf,
	stringifyPath,
	type BuiltinObjectKind,
	type array
} from "@ark/util"
import type { ResolvedConfig } from "../config.ts"
import type { BaseNode } from "../node.ts"
import type { Morph } from "../roots/morph.ts"
import {
	ArkError,
	ArkErrors,
	isArkErrorResult,
	type ArkErrorCode,
	type ArkErrorContextInput,
	type ArkErrorInput,
	type ArkErrorResult,
	type NodeErrorContextInput
} from "./errors.ts"
import { isNode } from "./utils.ts"

export type MorphsAtPath = {
	path: ReadonlyPath
	morphs: array<Morph>
}

export type BranchTraversal = {
	error: ArkError | undefined
	queuedMorphs: MorphsAtPath[]
}

// avoid sugar methods internally
export type InternalTraversal = Omit<Traversal, "error" | "mustBe" | "reject">

export class Traversal {
	/**
	 * #### the path being validated or morphed
	 *
	 * ✅ array indices represented as numbers
	 * ⚠️ mutated during traversal - use `path.slice(0)` to snapshot
	 * 🔗 use {@link propString} for a stringified version
	 */
	path: PropertyKey[] = []

	/**
	 * #### {@link ArkErrors} that will be part of this traversal's finalized result
	 *
	 * ✅ will always be an empty array for a valid traversal
	 */
	errors: ArkErrors = new ArkErrors(this)

	/**
	 * #### the original value being traversed
	 */
	root: unknown

	/**
	 * #### configuration for this traversal
	 *
	 * ✅ options can affect traversal results and error messages
	 * ✅ defaults < global config < scope config
	 * ✅ does not include options configured on individual types
	 */
	config: ResolvedConfig

	queuedMorphs: MorphsAtPath[] = []
	branches: BranchTraversal[] = []
	seen: { [id in string]?: unknown[] } = {}
	transformedByResolutionId:
		| { [id in string]?: Map<unknown, unknown> }
		| undefined

	// data is read from what a morph received, since root is the input
	private received: unknown
	private receivedDepth = 0
	// each object is copied before its first write, so input is never mutated
	private morphedRoot: unknown
	private copied: Set<unknown> | undefined

	constructor(root: unknown, config: ResolvedConfig) {
		this.root = root
		this.received = root
		this.config = config
	}

	/**
	 * #### the data being validated or morphed
	 *
	 * ✅ the value at {@link path}, as transformed by any morphs that have already run
	 */
	get data(): unknown {
		let result: any = this.received
		for (let i = this.receivedDepth; i < this.path.length; i++)
			result = result?.[this.path[i]]

		return result
	}

	/**
	 * #### a string representing {@link path}
	 *
	 * @propString
	 */
	get propString(): string {
		return stringifyPath(this.path)
	}

	/**
	 * #### add an {@link ArkError} and return `false`
	 *
	 * ✅ useful for predicates like `.narrow`
	 */
	reject(input: ArkErrorInput): false {
		this.error(input)
		return false
	}

	/**
	 * #### add an {@link ArkError} from a description and return `false`
	 *
	 * ✅ useful for predicates like `.narrow`
	 * 🔗 equivalent to {@link reject}({ expected })
	 */
	mustBe(expected: string): false {
		this.error(expected)
		return false
	}

	/**
	 * #### add and return an {@link ArkError}
	 *
	 * ✅ useful for morphs like `.pipe`
	 */
	error<input extends ArkErrorInput>(
		input: input
	): ArkError<
		input extends { code: ArkErrorCode } ? input["code"] : "predicate"
	>
	error(input: ArkErrorInput): ArkError {
		const errCtx: ArkErrorContextInput =
			typeof input === "object" ?
				input.code ?
					input
				:	{ ...input, code: "predicate" }
			:	{ code: "predicate", expected: input }
		return this.errorFromContext(errCtx)
	}

	/**
	 * #### whether {@link currentBranch} (or the traversal root, outside a union) has one or more errors
	 */
	hasError(): boolean {
		return this.currentErrorCount !== 0
	}

	get currentBranch(): BranchTraversal | undefined {
		return this.branches.length === 0 ?
				undefined
			:	this.branches[this.branches.length - 1]
	}

	queueMorphs(morphs: array<Morph>): void {
		const input: MorphsAtPath = {
			path: new ReadonlyPath(...this.path),
			morphs
		}
		if (this.currentBranch) this.currentBranch.queuedMorphs.push(input)
		else this.queuedMorphs.push(input)
	}

	finalize(onFail?: ArkErrors.Handler | null): unknown {
		this.morphedRoot = this.root
		if (this.queuedMorphs.length) this.applyQueuedMorphs()

		if (this.hasError()) return onFail ? onFail(this.errors) : this.errors

		return this.morphedRoot
	}

	receive(data: unknown): void {
		this.received = data
		this.receivedDepth = this.path.length
	}

	transform(node: BaseNode, data: unknown): unknown {
		return this.transformed(node.traverseTransform(data, this), data)
	}

	// a transform that doesn't require ctx returns its errors
	private transformed(result: unknown, data: unknown): unknown {
		if (!(result instanceof TransformErrors)) return result
		this.addTransformErrors(result)
		return data
	}

	pipe(node: BaseNode, data: unknown): unknown {
		if (node.allows(data)) {
			if (!node.transforms) return data
			const errorCount = this.currentErrorCount
			// a piped node transforms a morph's output, which can share objects an earlier pass cached
			const transformedByResolutionId = this.transformedByResolutionId
			this.transformedByResolutionId = undefined
			const result = this.transform(node, data)
			this.transformedByResolutionId = transformedByResolutionId
			return this.currentErrorCount > errorCount ? this.errors : result
		}
		this.receive(data)
		node.traverseApply(data, this)
		this.queuedMorphs = []
		return this.errors
	}

	addMorphErrors(result: ArkErrorResult): void {
		if (result instanceof ArkError) this.errors.add(result)
		else this.errors.merge(result)
	}

	addTransformErrors(errors: TransformErrors, key?: PropertyKey): void {
		const path = this.path
		for (const { reversedPath, result, data } of errors.entries) {
			this.path = [...path]
			if (key !== undefined) this.path.push(key)
			for (let i = reversedPath.length - 1; i >= 0; i--)
				this.path.push(reversedPath[i])
			this.receive(data)
			this.addMorphErrors(result)
		}
		this.path = path
	}

	transformResolution(
		id: string,
		data: unknown,
		transform: TraverseTransform
	): unknown {
		if (!hasDomain(data, "object"))
			return this.transformed(transform(data, this), data)
		const transformed = ((this.transformedByResolutionId ??= {})[id] ??=
			new Map())
		if (transformed.has(data)) {
			const result = transformed.get(data)
			if (result !== transforming) return result
			// a cycle reached data, so its output will fill this placeholder
			const placeholder = isArray(data) ? [] : {}
			transformed.set(data, placeholder)
			return placeholder
		}
		transformed.set(data, transforming)
		const result = this.transformed(transform(data, this), data)
		const placeholder = transformed.get(data)
		if (placeholder === transforming || !canFill(placeholder, result)) {
			transformed.set(data, result)
			return result
		}
		Object.defineProperties(
			placeholder as object,
			Object.getOwnPropertyDescriptors(result)
		)
		return Object.setPrototypeOf(placeholder, Object.getPrototypeOf(result))
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

	get failFast(): boolean {
		return this.branches.length !== 0
	}

	pushBranch(): void {
		this.branches.push({
			error: undefined,
			queuedMorphs: []
		})
	}

	popBranch(): BranchTraversal | undefined {
		return this.branches.pop()
	}

	// a taken branch's morphs apply only if each branch enclosing it is taken
	popTakenBranch(): void {
		const { queuedMorphs } = this.branches.pop()!
		if (this.currentBranch)
			this.currentBranch.queuedMorphs.push(...queuedMorphs)
		else this.queuedMorphs.push(...queuedMorphs)
	}

	/**
	 * @internal
	 * Convenience for casting from InternalTraversal to Traversal
	 * for cases where the extra methods on the external type are expected, e.g.
	 * a morph or predicate.
	 */
	get external(): this {
		return this
	}

	/**
	 * @internal
	 */
	errorFromNodeContext<input extends NodeErrorContextInput>(
		input: input
	): ArkError<input["code"]>
	errorFromNodeContext(input: NodeErrorContextInput): ArkError {
		return this.errorFromContext(input)
	}

	private errorFromContext(errCtx: ArkErrorContextInput): ArkError {
		const error = new ArkError(errCtx, this)
		if (this.currentBranch) this.currentBranch.error = error
		else this.errors.add(error)

		return error as never
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
				if (this.errors.affectsPath(path)) continue
				this.applyMorphsAtPath(path, morphs)
			}
		}
	}

	private applyMorphsAtPath(path: ReadonlyPath, morphs: array<Morph>): void {
		const key = path[path.length - 1]

		let parent: any

		if (key !== undefined) {
			// find the object on which the key to be morphed exists, copying
			// each object along the way
			this.copied ??= new Set()
			parent = this.morphedRoot = this.copyOnce(this.morphedRoot)
			for (let pathIndex = 0; pathIndex < path.length - 1; pathIndex++) {
				const segment = path[pathIndex]
				parent = parent[segment] = this.copyOnce(parent[segment])
			}
		}

		for (const morph of morphs) {
			// ensure morphs are applied relative to the correct path
			// in case previous operations modified this.path
			this.path = [...path]
			const morphIsNode = isNode(morph)
			const data = parent === undefined ? this.morphedRoot : parent[key!]
			this.receive(data)

			const result = morph(data as never, this)

			if (isArkErrorResult(result)) {
				// if the morph was a direct reference to another node,
				// errors will have been added directly via this piped context
				if (!morphIsNode) this.addMorphErrors(result)
				// skip any remaining morphs at the current path
				this.queuedMorphs = []
				break
			}

			// if the morph was successful, assign the result to the
			// corresponding property, or to root if path is empty
			if (parent === undefined) this.morphedRoot = result
			else parent[key!] = result

			// if the current morph queued additional morphs,
			// applying them before subsequent morphs
			this.applyQueuedMorphs()
		}
	}

	private copyOnce(data: unknown): unknown {
		if (typeof data !== "object" || data === null || this.copied!.has(data))
			return data
		// a morph at an array's named prop reads it from this copy
		const copy =
			isArray(data) ? Object.assign(data.slice(), data) : copyOf(data)
		this.copied!.add(copy)
		return copy
	}
}

const transforming = noSuggest("transforming")

export const maxAliasDepth = 64

export const maxAliasVisits = 1000

// shared by every root's Allows, which passes an alias depth in place of ctx
export const aliasVisits = {
	count: 0,
	exceed: (): false => {
		aliasVisits.count = Number.POSITIVE_INFINITY
		return false
	}
}

// within the bounds, data is traversed as a tree; past them, it may be cyclic
export const allowsCyclic = (
	allows: TraverseAllows,
	data: unknown,
	config: ResolvedConfig
): boolean => {
	const outerVisits = aliasVisits.count
	aliasVisits.count = 0
	const allowed = allows(data, 0 as never)
	const exceeded = aliasVisits.count > maxAliasVisits
	aliasVisits.count = outerVisits
	return exceeded ? allows(data, new Traversal(data, config)) : allowed
}

// a builtin like Date keeps its state in internal slots a placeholder can't take
const canFill = (placeholder: unknown, result: unknown): result is object =>
	typeof result === "object" &&
	result !== null &&
	(isArray(placeholder) ? isArray(result) : objectKindOf(result) === undefined)

// paths are reversed so each object an error passes through pushes its key
export class TransformErrors {
	entries: TransformErrors.Entry[]

	constructor(result: ArkErrorResult, data: unknown) {
		this.entries = [{ reversedPath: [], result, data }]
	}

	addTo(
		gathered: TransformErrors | undefined,
		key?: PropertyKey
	): TransformErrors {
		if (key !== undefined)
			for (const entry of this.entries) entry.reversedPath.push(key)
		if (!gathered) return this
		gathered.entries.push(...this.entries)
		return gathered
	}
}

export declare namespace TransformErrors {
	export interface Entry {
		reversedPath: PropertyKey[]
		result: ArkErrorResult
		data: unknown
	}
}

export const copyOf = (data: object): object => {
	if (isArray(data)) return data.slice()
	const prototype = Object.getPrototypeOf(data)
	if (prototype === Object.prototype) return { ...data }
	const kind = objectKindOf(data)
	if (kind === undefined) return Object.setPrototypeOf({ ...data }, prototype)
	// a builtin's state includes non-enumerable own props, e.g. an Error's message
	return Object.defineProperties(
		Object.setPrototypeOf(
			copyContentsOf[kind]?.(data as never) ?? {},
			prototype
		),
		Object.getOwnPropertyDescriptors(data)
	)
}

// a builtin's contents are in internal slots only its constructor can copy
const copyContentsOf: {
	[kind in BuiltinObjectKind]?: (data: never) => object
} = {
	Date: (data: Date) => new Date(data),
	Error: () => new Error(),
	Map: (data: Map<unknown, unknown>) => new Map(data),
	RegExp: (data: RegExp) => new RegExp(data),
	Set: (data: Set<unknown>) => new Set(data)
}

export const traverseKey = <result>(
	key: PropertyKey,
	fn: () => result,
	// ctx will be undefined if this node isn't context-dependent, or an alias depth
	ctx: InternalTraversal | undefined
): result => {
	if (!ctx || typeof ctx === "number") return fn()

	ctx.path.push(key)
	const result = fn()
	ctx.path.pop()
	return result
}

export type TraversalMethodsByKind<input = unknown> = {
	Allows: TraverseAllows<input>
	Apply: TraverseApply<input>
	Transform: TraverseTransform<input>
}

export type TraversalKind = keyof TraversalMethodsByKind & {}

export type TraverseAllows<data = unknown> = (
	data: data,
	ctx: InternalTraversal
) => boolean

export type TraverseApply<data = unknown> = (
	data: data,
	ctx: InternalTraversal
) => void

export type TraverseTransform<data = unknown> = (
	data: data,
	ctx: InternalTraversal
) => unknown
