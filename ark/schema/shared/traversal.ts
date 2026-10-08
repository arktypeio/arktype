import {
	hasDomain,
	isArray,
	noSuggest,
	objectKindOf,
	stringifyPath
} from "@ark/util"
import type { ResolvedConfig } from "../config.ts"
import type { BaseNode } from "../node.ts"
import {
	ArkError,
	ArkErrors,
	type ArkErrorCode,
	type ArkErrorContextInput,
	type ArkErrorInput,
	type ArkErrorResult,
	type NodeErrorContextInput
} from "./errors.ts"
import { TransformErrors } from "./transform.ts"
import { inProgress } from "./utils.ts"

export type BranchTraversal = {
	error: ArkError | undefined
	errorCount: number
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

	_errors: ArkErrors | undefined

	/**
	 * #### {@link ArkErrors} that will be part of this traversal's finalized result
	 *
	 * ✅ will always be empty for a valid traversal
	 */
	get errors(): ArkErrors {
		return (this._errors ??= new ArkErrors(this))
	}

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

	branches: BranchTraversal[] = []
	seen: { [id in string]?: Map<unknown, ResolutionState> } = {}
	// a cyclic root's Apply leaves resolutions untracked until its data is deep or broad enough to be cyclic
	tracksResolutions = true
	private resolving: ResolvingFrame[] | undefined
	private resolvingDepth = 0
	private untrackedVisits = 0
	private recordedFailure = false
	private enteredCount = 0
	private earliestAssumed = Number.POSITIVE_INFINITY
	private assumed: unknown[] | undefined
	private reachedInvalid: InvalidResolution | undefined
	// data reaching an object by a shorter path than it first did is applied in order of path length
	private deferredByLength: DeferredResolution[][] | undefined
	private applyingLength = 0
	// the length of the shortest path an object was deferred at, or -1 once applied
	private shortestPathLengths:
		| { [id in string]?: Map<unknown, number> }
		| undefined
	// data a root allowed within the bounds is a tree, so each path is transformed
	tracksTransforms = true
	transformedByResolutionId:
		| { [id in string]?: Map<unknown, unknown> }
		| undefined

	// data is read from what a morph received, since root is the input
	private received: unknown
	private receivedDepth = 0
	// a piped node is transformed once Apply finds it valid
	private checksOnly = false

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
		// an error reads its text from its input when read, so a caller's
		// later change to an object it passed must not reach it
		const errCtx: ArkErrorContextInput =
			typeof input === "object" ?
				input.code ?
					{ ...input }
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

	finalize(onFail?: ArkErrors.Handler | null): unknown {
		if (this.hasError()) return onFail ? onFail(this.errors) : this.errors

		return this.root
	}

	receive(data: unknown): void {
		this.received = data
		this.receivedDepth = this.path.length
	}

	transform(node: BaseNode, data: unknown): unknown {
		if (node.isTransformedById)
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
		// Allows would detach a contextual node's predicates from this path
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

	private applyPiped(node: BaseNode, data: unknown): boolean {
		const errorCount = this.currentErrorCount
		const { received, receivedDepth, checksOnly } = this
		this.receive(data)
		this.checksOnly = true
		// a morph's output is new data, so a cyclic node tracks it from its own root
		if (node.includesAlias) {
			const ctx = new Traversal(data, this.config)
			ctx.checksOnly = true
			this.errors.merge(applyCyclic(node, data, ctx).errors)
		} else node.traverseApply(data, this)
		this.checksOnly = checksOnly
		this.received = received
		this.receivedDepth = receivedDepth
		return this.currentErrorCount === errorCount
	}

	// Apply transforms each value it finds valid, unless it's checking a union's branch or a piped node
	get transformsValid(): boolean {
		return this.branches.length === 0 && !this.checksOnly
	}

	// a transform Apply runs returns or adds its errors, and can leave data read from a morph's input
	transformedInApply(result: unknown): void {
		if (result instanceof TransformErrors) this.addTransformErrors(result)
		this.received = this.root
		this.receivedDepth = 0
	}

	// whether data was transformed in place of being applied, which requires node to allow it
	transformIfAllowed(node: BaseNode, data: unknown): boolean {
		if (!this.transformsValid) return false
		if (node.includesAlias) {
			const untracked = allowsAcyclic(node, data)
			if (!(untracked ?? allowsInContext(node, data, this.config))) return false
			// as at a root, data allowed within the bounds is a tree, so each path is transformed
			this.tracksTransforms = untracked === undefined
			this.transformedByResolutionId = undefined
		} else if (!this.allows(node, data)) return false
		this.transformedInApply(this.transform(node, data))
		return true
	}

	// a predicate reading ctx sees this path, and an error it adds fails the branch
	allows(node: BaseNode, data: unknown): boolean {
		if (!node.allowsRequiresTraversal) return node.allows(data)
		const pathLength = this.path.length
		this.pushBranch()
		const allowed = node.traverseAllows(data, this)
		// compiled Allows returns false without popping the keys it pushed
		this.path.length = pathLength
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
			// a key's later step can pass this output back, and a morph never runs on its own output
			if (hasDomain(result, "object")) transformed.set(result, result)
			return result
		}
		Object.defineProperties(
			placeholder as object,
			Object.getOwnPropertyDescriptors(result)
		)
		transformed.set(placeholder, placeholder)
		return Object.setPrototypeOf(placeholder, Object.getPrototypeOf(result))
	}

	// undefined once entered, else whether data is known or assumed valid
	enterResolution(
		id: string,
		data: unknown,
		apply?: TraverseApply
	): boolean | undefined {
		if (
			this.deferredByLength &&
			apply &&
			!this.currentBranch &&
			(typeof data === "object" ? data !== null : typeof data === "function")
		) {
			const lengths = (this.shortestPathLengths![id] ??= new Map())
			const length = this.path.length
			const shortestLength = lengths.get(data)
			if (shortestLength !== undefined && shortestLength <= length) return true
			if (length === this.applyingLength) {
				lengths.set(data, -1)
				apply(data, this)
			} else {
				lengths.set(data, length)
				;(this.deferredByLength[length] ??= []).push({
					id,
					data,
					apply,
					path: [...this.path]
				})
			}
			return true
		}
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
			if (state.reported) {
				// its errors belong at the shorter path, which only applying by path length finds
				if (this.path.length < state.pathLength) throw reachedByShorterPath
				this.reachedInvalid ??= state
				return false
			}
			// its errors were discarded with a branch, so it's traversed again
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
			:	this.invalidResolution(reachedInvalid?.error)
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
		;(this.seen[frame.id] ??= new Map()).set(
			frame.data,
			this.invalidResolution()
		)
		this.recordedFailure = true
		return false
	}

	// an object reached at a longer path than the one being applied is deferred, so each is applied once at its shortest path
	applyByPathLength(id: string, apply: TraverseApply, data: unknown): void {
		const deferredByLength: DeferredResolution[][] = (this.deferredByLength =
			[])
		this.shortestPathLengths = {}
		this.enterResolution(id, data, apply)
		for (let length = 1; length < deferredByLength.length; length++) {
			if (!deferredByLength[length]) continue
			this.applyingLength = length
			for (const deferred of deferredByLength[length]) {
				const lengths = this.shortestPathLengths[deferred.id]!
				// it was deferred again at a shorter path, so it's been applied there
				if (lengths.get(deferred.data) !== length) continue
				lengths.set(deferred.data, -1)
				this.path = deferred.path
				deferred.apply(deferred.data, this)
			}
		}
		this.path = []
	}

	private invalidResolution(
		error = this.currentBranch?.error ??
			this.errors.issues[this.errors.length - 1]
	): InvalidResolution {
		const branch = this.currentBranch
		return {
			error,
			reported: !branch,
			pathLength: this.path.length
		}
	}

	get currentErrorCount(): number {
		const branches = this.branches
		return branches.length === 0 ?
				(this._errors?.count ?? 0)
			:	branches[branches.length - 1].errorCount
	}

	get failFast(): boolean {
		return this.branches.length !== 0
	}

	pushBranch(): void {
		this.branches.push({
			error: undefined,
			errorCount: 0
		})
	}

	popBranch(): BranchTraversal | undefined {
		return this.branches.pop()
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
		input: input,
		data: unknown
	): ArkError<input["code"]>
	errorFromNodeContext(input: NodeErrorContextInput, data: unknown): ArkError {
		const error = new ArkError(input, this, true)
		error.data = data
		return this.addError(error)
	}

	/**
	 * @internal
	 */
	errorFromContext(errCtx: ArkErrorContextInput): ArkError {
		return this.addError(new ArkError(errCtx, this))
	}

	private addError(error: ArkError): ArkError {
		if (this.currentBranch) this.failBranch(error)
		else this.errors.addNew(error)
		return error
	}

	private failBranch(error: ArkError): void {
		this.currentBranch!.error = error
		this.currentBranch!.errorCount++
	}
}

const transforming = noSuggest("transforming")

export const maxAliasDepth = 64

export const maxAliasVisits = 1000

let continuation: Traversal | undefined
let continuationConfig: ResolvedConfig

// shared by every root's Allows, which passes an alias depth in place of ctx
export const aliasVisits = {
	count: 0,
	tracked: false,
	// data past the depth bound may be cyclic, so every path past it continues one tracked traversal
	exceed: (data: unknown): Traversal | false => {
		// a path past the bound costs the visits it took to reach it, so cyclic data reruns tracked from its root
		aliasVisits.count += maxAliasDepth
		if (aliasVisits.count > maxAliasVisits) {
			aliasVisits.count = Number.POSITIVE_INFINITY
			return false
		}
		aliasVisits.tracked = true
		return (continuation ??= new Traversal(data, continuationConfig))
	}
}

const untrackedBound = noSuggest("untrackedBound")

const reachedByShorterPath = noSuggest("reachedByShorterPath")

// once tracked, a cyclic root is entered as its own resolution, so data reaching it again isn't traversed twice
export const applyCyclic = (
	node: BaseNode,
	data: unknown,
	ctx: Traversal
): Traversal => {
	// a rerun would transform each value Apply found valid again
	if (node.transforms) {
		ctx.applyByPathLength(node.trackedId, node.traverseApply, data)
		return ctx
	}
	ctx.tracksResolutions = false
	try {
		try {
			// data reaching its root again is cyclic, so untracked it exceeds the bounds
			node.traverseApply(data, ctx)
		} catch (e) {
			if (e !== untrackedBound) throw e
			ctx = new Traversal(data, ctx.config)
			applyResolution(node.trackedId, node.traverseApply, data, ctx)
		}
		return ctx
	} catch (e) {
		if (e !== reachedByShorterPath) throw e
	}
	ctx = new Traversal(data, ctx.config)
	ctx.applyByPathLength(node.trackedId, node.traverseApply, data)
	return ctx
}

export const applyResolution = (
	id: string,
	apply: TraverseApply,
	data: unknown,
	ctx: InternalTraversal
): void => {
	if (ctx.enterResolution(id, data, apply) !== undefined) return
	apply(data, ctx)
	ctx.exitResolution()
}

export const applyMember = (
	node: BaseNode,
	data: unknown,
	ctx: InternalTraversal,
	member: BaseNode = node
): void =>
	member.includesAlias ?
		applyResolution(member.id, node.traverseApply, data, ctx)
	:	node.traverseApply(data, ctx)

// a value Allows accepts is transformed, or left for its structure to transform
export const applyValue = (
	node: BaseNode,
	data: unknown,
	ctx: InternalTraversal,
	transforms = true
): void => {
	if (
		node.transforms &&
		(transforms ? ctx.transformIfAllowed(node, data) : ctx.allows(node, data))
	)
		return
	if (node.entersResolution)
		applyResolution(node.id, node.traverseApply, data, ctx)
	else node.traverseApply(data, ctx)
}

// within the bounds, data is traversed as a tree; past the visit bound it may be cyclic, so only a tracked traversal can tell
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
	const outerContinuation = continuation
	const outerConfig = continuationConfig
	aliasVisits.count = 0
	continuation = undefined
	continuationConfig = node.$.resolvedConfig
	let allowed: boolean
	// restored in a catch, since a finally slows short cyclic allows
	try {
		allowed = node.traverseAllows(data as never, 0)
	} catch (e) {
		aliasVisits.count = outerVisits
		continuation = outerContinuation
		continuationConfig = outerConfig
		throw e
	}
	const exceeded = aliasVisits.count > maxAliasVisits
	aliasVisits.count = outerVisits
	continuation = outerContinuation
	continuationConfig = outerConfig
	return exceeded ? undefined : allowed
}

// a transform relies on data being acyclic, which data tracked past the depth bound isn't shown to be
export const allowsAcyclic = (
	node: BaseNode,
	data: unknown
): boolean | undefined => {
	const outerTracked = aliasVisits.tracked
	aliasVisits.tracked = false
	try {
		const allowed = allowsUntracked(node, data)
		return aliasVisits.tracked ? undefined : allowed
	} finally {
		aliasVisits.tracked ||= outerTracked
	}
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
	pathLength: number
}

interface DeferredResolution {
	id: string
	data: unknown
	apply: TraverseApply
	path: PropertyKey[]
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

export const traverseKey = <result>(
	key: PropertyKey,
	fn: () => result,
	// ctx will be undefined if this node isn't context-dependent, or an alias depth
	ctx: InternalTraversal | AliasDepth | undefined
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

export type AliasDepth = number

export type TraverseAllows<data = unknown> = (
	data: data,
	ctx: InternalTraversal | AliasDepth
) => boolean

export type TraverseApply<data = unknown> = (
	data: data,
	ctx: InternalTraversal
) => void

export type TraverseTransform<data = unknown> = (
	data: data,
	ctx: InternalTraversal
) => unknown
