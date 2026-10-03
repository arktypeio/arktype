import {
	ReadonlyPath,
	flatMorph,
	hasDomain,
	isArray,
	noSuggest,
	objectKindOf,
	stringifyPath,
	typedArrayConstructors,
	type BuiltinObjectKind,
	type Key,
	type array
} from "@ark/util"
import type { ResolvedConfig } from "../config.ts"
import type { BaseNode } from "../node.ts"
import type { Morph } from "../roots/morph.ts"
import {
	ArkError,
	ArkErrors,
	type ArkErrorCode,
	type ArkErrorContextInput,
	type ArkErrorInput,
	type ArkErrorResult,
	type NodeErrorContextInput
} from "./errors.ts"
import { $ark } from "./registry.ts"
import { inProgress, isNode } from "./utils.ts"

export type MorphsAtPath = {
	path: ReadonlyPath
	morphs: array<Morph>
}

export type BranchTraversal = {
	error: ArkError | undefined
	errorCount: number
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
	seen: { [id in string]?: Map<unknown, ResolutionState> } = {}
	// a cyclic root's Apply leaves resolutions untracked until its data is deep or broad enough to be cyclic
	tracksResolutions = true
	private resolving: ResolvingFrame[] | undefined
	private resolvingDepth = 0
	private untrackedVisits = 0
	private recordedFailure = false
	private enteredCount = 0
	// the earliest entered resolution still in progress that the current one assumed valid
	private earliestAssumed = Number.POSITIVE_INFINITY
	// states and data of each valid result that holds only if what it assumed does
	private assumed: unknown[] | undefined
	private reachedInvalid: InvalidResolution | undefined
	// an invalid object was reached by a path shorter than the one its errors were reported at
	shortened = false
	// data a root allowed within the bounds is a tree, so each path is transformed
	tracksTransforms = true
	transformedByResolutionId:
		| { [id in string]?: Map<unknown, unknown> }
		| undefined

	// data is read from what a morph received, since root is the input
	private received: unknown
	private receivedDepth = 0
	// each object is copied before its first write, so input is never mutated
	private morphedRoot: unknown
	private copied: Map<object, object> | undefined

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
		// an alias resolving to node keys its output by id, so entering node directly does too
		if (node.includesAlias && $ark.nodesByRegisteredId[node.id])
			return this.transformResolution(node.id, data, node.traverseTransform)
		return this.transformed(node.traverseTransform(data, this), data)
	}

	// a transform that doesn't require ctx returns its errors
	private transformed(result: unknown, data: unknown): unknown {
		if (!(result instanceof TransformErrors)) return result
		this.addTransformErrors(result)
		return data
	}

	pipe(node: BaseNode, data: unknown): unknown {
		// Allows would detach a contextual node's predicates from this path, so Apply decides it
		const decidedByApply = node.allowsRequiresContext && !node.includesAlias
		if (decidedByApply ? this.applyPiped(node, data) : node.allows(data)) {
			if (!node.transforms) return data
			const { received, receivedDepth } = this
			const errorCount = this.currentErrorCount
			// a piped node transforms a morph's output, which can share objects an earlier pass cached
			const transformedByResolutionId = this.transformedByResolutionId
			const tracksTransforms = this.tracksTransforms
			this.transformedByResolutionId = undefined
			this.tracksTransforms = true
			const result = this.transform(node, data)
			this.transformedByResolutionId = transformedByResolutionId
			this.tracksTransforms = tracksTransforms
			this.received = received
			this.receivedDepth = receivedDepth
			return this.currentErrorCount > errorCount ? this.errors : result
		}
		if (!decidedByApply) this.applyPiped(node, data)
		return this.errors
	}

	// whether it added no errors, dropping only the piped node's own morphs
	private applyPiped(node: BaseNode, data: unknown): boolean {
		const errorCount = this.currentErrorCount
		const { received, receivedDepth } = this
		const queuedMorphs = (this.currentBranch ?? this).queuedMorphs
		const queuedCount = queuedMorphs.length
		this.receive(data)
		// a morph's output is new data, so a cyclic node tracks it from its own root
		if (node.includesAlias) {
			this.errors.merge(
				applyCyclic(node.id, node.traverseApply, data, this.config).errors
			)
		} else node.traverseApply(data, this)
		queuedMorphs.length = queuedCount
		this.received = received
		this.receivedDepth = receivedDepth
		return this.currentErrorCount === errorCount
	}

	// a predicate reading ctx sees this path, and an error it adds fails the branch
	allows(node: BaseNode, data: unknown): boolean {
		if (!node.allowsRequiresTraversal) return node.allows(data)
		this.pushBranch()
		const allowed = node.traverseAllows(data, this)
		return this.popBranch()!.errorCount === 0 && allowed
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
		if (!this.tracksTransforms || !hasDomain(data, "object"))
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

	// undefined once entered, else whether data is known or assumed valid
	enterResolution(id: string, data: unknown): boolean | undefined {
		// untracked, every state is a failure, so none is looked up before the first
		const states =
			this.tracksResolutions || this.recordedFailure ? this.seen[id] : undefined
		const state = states?.get(data)
		if (state !== undefined) {
			if (typeof state === "number") {
				if (state < this.earliestAssumed) this.earliestAssumed = state
				return true
			}
			if (typeof state === "boolean") return state
			if (this.currentBranch) {
				this.failBranch(state.error)
				return false
			}
			const pathLength = this.path.length
			if (state.reported && pathLength < state.pathLength) {
				state.pathLength = pathLength
				this.shortened = true
			}
			if (state.reported || pathLength > state.pathLength) {
				this.reachedInvalid ??= state
				return false
			}
			// its errors were discarded with a branch, or belong at this shortest path, so it's traversed again
		}
		if (
			!this.tracksResolutions &&
			(this.resolvingDepth >= maxAliasDepth ||
				++this.untrackedVisits > maxAliasVisits)
		)
			throw untrackedBound
		// frames are reused by depth, so entering doesn't allocate
		const frame = ((this.resolving ??= [])[this.resolvingDepth++] ??= {
			id,
			data,
			entered: 0,
			errorCount: 0,
			outerReachedInvalid: undefined,
			outerEarliestAssumed: 0,
			assumedLength: 0
		})
		frame.id = id
		frame.data = data
		frame.errorCount = this.currentErrorCount
		if (!this.tracksResolutions) return
		;(states ?? (this.seen[id] = new Map())).set(data, ++this.enteredCount)
		frame.entered = this.enteredCount
		frame.outerReachedInvalid = this.reachedInvalid
		this.reachedInvalid = undefined
		frame.outerEarliestAssumed = this.earliestAssumed
		frame.assumedLength = (this.assumed ??= []).length
		this.earliestAssumed = Number.POSITIVE_INFINITY
		return
	}

	// whether data is valid, given Allows' result or, in Apply, the errors since it was entered
	exitResolution(allowed?: boolean): boolean {
		const frame = this.resolving![--this.resolvingDepth]
		if (!this.tracksResolutions) return allowed ?? this.exitUntracked(frame)
		const reachedInvalid = this.reachedInvalid
		this.reachedInvalid = frame.outerReachedInvalid
		const valid =
			allowed ??
			(reachedInvalid === undefined &&
				this.currentErrorCount === frame.errorCount)
		const data = frame.data
		const states = this.seen[frame.id]!
		// a primitive has no identity, so each place it's reached reports its own errors
		if (typeof data === "object" ? data === null : typeof data !== "function") {
			this.earliestAssumed = frame.outerEarliestAssumed
			states.delete(data)
			return valid
		}
		const state: ResolutionState =
			valid || allowed === false ?
				valid
			:	{
					error:
						reachedInvalid?.error ??
						this.currentBranch?.error ??
						this.errors[this.errors.length - 1],
					reported: !this.currentBranch,
					pathLength:
						this.currentBranch ? Number.POSITIVE_INFINITY : this.path.length
				}
		const earliestAssumed = this.earliestAssumed
		this.earliestAssumed = frame.outerEarliestAssumed
		const assumed = this.assumed!
		if (valid && earliestAssumed < frame.entered) {
			assumed.push(states, data)
			if (earliestAssumed < this.earliestAssumed)
				this.earliestAssumed = earliestAssumed
			return true
		}
		// nothing it assumed is in progress, so each result that assumed it is valid with it, or unknown without it
		for (let i = frame.assumedLength; i < assumed.length; i += 2) {
			const assumedStates = assumed[i] as Map<unknown, ResolutionState>
			if (valid) assumedStates.set(assumed[i + 1], true)
			else assumedStates.delete(assumed[i + 1])
		}
		assumed.length = frame.assumedLength
		states.set(data, state)
		if (typeof state === "object" && state.reported)
			this.reachedInvalid ??= state
		return valid
	}

	// untracked, a failed object is recorded so that reaching it again doesn't report it twice
	private exitUntracked(frame: ResolvingFrame): boolean {
		if (this.currentErrorCount === frame.errorCount) return true
		if (!hasDomain(frame.data, "object")) return false
		const branch = this.currentBranch
		;(this.seen[frame.id] ??= new Map()).set(frame.data, {
			error: branch ? branch.error! : this.errors[this.errors.length - 1],
			reported: !branch,
			pathLength: branch ? Number.POSITIVE_INFINITY : this.path.length
		})
		this.recordedFailure = true
		return false
	}

	get currentErrorCount(): number {
		const branches = this.branches
		return branches.length === 0 ?
				this.errors.count
			:	branches[branches.length - 1].errorCount
	}

	get failFast(): boolean {
		return this.branches.length !== 0
	}

	pushBranch(): void {
		this.branches.push({
			error: undefined,
			errorCount: 0,
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
		if (this.currentBranch) this.failBranch(error)
		else this.errors.add(error)

		return error as never
	}

	private failBranch(error: ArkError): void {
		this.currentBranch!.error = error
		this.currentBranch!.errorCount++
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
			this.copied ??= new Map()
			parent = this.morphedRoot = this.copyOnce(this.morphedRoot)
			for (let pathIndex = 0; pathIndex < path.length - 1; pathIndex++) {
				const segment = path[pathIndex]
				parent = parent[segment] = this.copyOnce(this.readCopy(parent, segment))
			}
		}

		for (const morph of morphs) {
			// ensure morphs are applied relative to the correct path
			// in case previous operations modified this.path
			this.path = [...path]
			const morphIsNode = isNode(morph)
			const data =
				key === undefined ? this.morphedRoot : this.readCopy(parent, key)
			this.receive(data)

			const result = morph(data as never, this)

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
		this.copied!.set(copy, data)
		return copy
	}

	// a copy lacks the non-enumerable props of the object it was copied from
	private readCopy(copy: any, key: PropertyKey): unknown {
		return typeof copy !== "object" || copy === null || key in copy ?
				copy?.[key]
			:	this.copied!.get(copy)?.[key as never]
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

const untrackedBound = noSuggest("untrackedBound")

// once tracked, a cyclic root is entered as its own resolution, so data reaching it again isn't traversed twice
export const applyCyclic = (
	id: string,
	apply: TraverseApply,
	data: unknown,
	config: ResolvedConfig
): Traversal => {
	let ctx = new Traversal(data, config)
	ctx.tracksResolutions = false
	try {
		// data reaching its root again is cyclic, so untracked it exceeds the bounds
		apply(data, ctx)
	} catch (e) {
		if (e !== untrackedBound) throw e
		ctx = new Traversal(data, config)
		applyResolution(id, apply, data, ctx)
	}
	while (ctx.shortened) {
		const seen = ctx.seen
		// each invalid object is traversed again at the shortest path reaching it
		for (const k in seen) {
			const states = seen[k]!
			for (const [value, state] of states) {
				if (typeof state === "object" && state.reported) state.reported = false
				else states.delete(value)
			}
		}
		ctx = new Traversal(data, config)
		ctx.seen = seen
		applyResolution(id, apply, data, ctx)
	}
	return ctx
}

export const applyResolution = (
	id: string,
	apply: TraverseApply,
	data: unknown,
	ctx: InternalTraversal
): void => {
	if (ctx.enterResolution(id, data) !== undefined) return
	apply(data, ctx)
	ctx.exitResolution()
}

export const applyValue = (
	node: BaseNode,
	data: unknown,
	ctx: InternalTraversal
): void =>
	node.isCyclic && node.isReferencedById ?
		applyResolution(node.id, node.traverseApply, data, ctx)
	:	node.traverseApply(data, ctx)

// within the bounds, data is traversed as a tree; past them, it may be cyclic, so only a tracked traversal can tell
export const allowsUntracked = (
	node: BaseNode,
	data: unknown
): boolean | undefined => {
	if (
		inProgress.definitions ||
		inProgress.resolutions ||
		node.allowsRequiresTraversal
	)
		return
	const outerVisits = aliasVisits.count
	aliasVisits.count = 0
	const allowed = node.traverseAllows(data as never, 0 as never)
	const exceeded = aliasVisits.count > maxAliasVisits
	aliasVisits.count = outerVisits
	return exceeded ? undefined : allowed
}

// a contextual predicate can add an error and still return true
export const allowsInContext = (
	node: BaseNode,
	data: unknown,
	config: ResolvedConfig
): boolean => {
	const ctx = new Traversal(data, config)
	return node.traverseAllows(data as never, ctx) && !ctx.hasError()
}

// entered while in progress, then whether it is valid, or why Apply found it invalid
type ResolutionState = number | boolean | InvalidResolution

interface InvalidResolution {
	error: ArkError
	reported: boolean
	// reported at this length, else traversed again at a path no longer than it
	pathLength: number
}

interface ResolvingFrame {
	id: string
	data: unknown
	entered: number
	errorCount: number
	outerReachedInvalid: InvalidResolution | undefined
	outerEarliestAssumed: number
	assumedLength: number
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
	const copyContents = copyContentsOf[kind]
	// a builtin whose state can't be copied, e.g. a function, transforms in place
	if (!copyContents) return data
	// a builtin's state includes non-enumerable own props, e.g. an Error's message
	const descriptors: { [k: Key]: PropertyDescriptor } =
		Object.getOwnPropertyDescriptors(data)
	// as in a spread copy, its props can be written even if data's can't
	for (const k of Reflect.ownKeys(descriptors)) {
		descriptors[k].configurable = true
		if ("value" in descriptors[k]) descriptors[k].writable = true
	}
	return Object.defineProperties(
		Object.setPrototypeOf(copyContents(data as never), prototype),
		descriptors
	)
}

// a builtin's contents are in internal slots only its constructor can copy
const copyContentsOf: {
	[kind in BuiltinObjectKind]?: (data: never) => object
} = {
	...flatMorph(typedArrayConstructors, (kind, TypedArray) => [
		kind,
		(data: never) => new TypedArray(data)
	]),
	ArrayBuffer: (data: ArrayBuffer) => data.slice(0),
	Date: (data: Date) => new Date(data),
	Error: () => new Error(),
	Headers: (data: Headers) => new Headers(data),
	Map: (data: Map<unknown, unknown>) => new Map(data),
	RegExp: (data: RegExp) => new RegExp(data),
	Set: (data: Set<unknown>) => new Set(data),
	URL: (data: URL) => new URL(data)
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
