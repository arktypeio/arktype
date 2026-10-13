import {
	hasDomain,
	type array,
	isArray,
	isThunk,
	noSuggest,
	objectKindOf,
	stringifyPath
} from "@ark/util"
import type { ResolvedConfig } from "../config.ts"
import type { BaseNode } from "../node.ts"
import type { Morph } from "../roots/morph.ts"
import type {
	ArkError,
	ArkErrorCode,
	ArkErrorInput,
	ArkErrors,
	NodeErrorContextInput
} from "./errors.ts"
import {
	ArkErrors as BaseArkErrors,
	failsIn,
	issueAt,
	issueWith,
	mergeIssues,
	unionIssue,
	type ArkIssue,
	type FailureInput,
	type FailureSite,
	type FailureContext,
	type CompactApply,
	type UnionSite
} from "./issues.ts"
import { TransformErrors } from "./transform.ts"
import { inProgress } from "./utils.ts"

// arktype's handlers receive its own errors, of which a validator's are a base
export type FailHandler = (errors: never) => unknown

export type BranchTraversal = {
	error: ArkIssue | undefined
	errorCount: number
}

// fields are assigned by the constructor, since V8 creates a subclass's
// instances more slowly from initializers
export class InternalTraversal implements FailureContext {
	/**
	 * #### the path being validated or morphed
	 *
	 * ✅ array indices represented as numbers
	 * ⚠️ mutated during traversal - use `path.slice(0)` to snapshot
	 * 🔗 use {@link propString} for a stringified version
	 */
	declare path: PropertyKey[]

	declare _errors: BaseArkErrors | undefined

	/**
	 * #### the original value being traversed
	 */
	declare root: unknown

	/**
	 * #### configuration for this traversal
	 *
	 * ✅ options can affect traversal results and error messages
	 * ✅ defaults < global config < scope config
	 * ✅ does not include options configured on individual types
	 */
	declare config: ResolvedConfig

	declare branches: BranchTraversal[]
	// what it tracks of the cyclic nodes it enters, once it enters one
	declare resolutions: Resolutions | undefined
	// data a root allowed within the bounds is a tree, so each path is transformed
	declare tracksTransforms: boolean
	declare transformedByResolutionId:
		| { [id in string]?: Map<unknown, unknown> }
		| undefined

	// data is read from what a morph received, since root is the input
	declare received: unknown
	declare receivedDepth: number
	// a piped node is transformed once Apply finds it valid
	declare checksOnly: boolean
	// a morph fails by returning any error ctx.error added during its call
	declare returnedFrom: number | undefined

	constructor(root: unknown, config: ResolvedConfig) {
		this.path = []
		this._errors = undefined
		this.root = root
		this.config = config
		this.branches = []
		this.resolutions = undefined
		this.tracksTransforms = true
		this.transformedByResolutionId = undefined
		this.received = root
		this.receivedDepth = 0
		this.checksOnly = false
		this.returnedFrom = undefined
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

	finalize(onFail?: FailHandler | null): unknown {
		if (this.hasError())
			return onFail ? onFail(this._errors as never) : this._errors

		return this.root
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
	get external(): Traversal {
		return this as never
	}

	/**
	 * @internal a node's error, which arktype's traversal writes from its
	 * context, and this one, checking Allows for arktype, adds as an issue
	 */
	errorFromNodeContext<input extends NodeErrorContextInput>(
		input: input,
		data: unknown
	): ArkError<input["code"]>
	errorFromNodeContext(input: NodeErrorContextInput, data: unknown): ArkError {
		return this.addError({
			code: input.code,
			path: this.path.slice(),
			data,
			expected: input.description
		}) as never
	}

	/** @internal */
	failsAt(site: FailureSite, data: unknown, key?: PropertyKey): boolean {
		this.addError(issueAt(this.path, site, data, key))
		return this.failFast
	}

	/** @internal */
	failsIn(
		apply: CompactApply,
		value: unknown,
		key?: PropertyKey,
		missing?: FailureSite,
		data?: unknown
	): boolean | undefined {
		return failsIn(this, this.path, apply, value, key, missing, data)
	}

	// only arktype's own checks report through this and failsUnion, which a validator's traversal reaches piping into an arktype Type
	/** @internal */
	failsWith(input: FailureInput): boolean {
		this.addError(issueWith(this.path, input))
		return this.failFast
	}

	/** @internal */
	failsUnion(
		branches: readonly CompactApply[],
		site: UnionSite,
		data: unknown
	): boolean {
		this.addError(unionIssue(this.path, site, data))
		return this.failFast
	}

	/**
	 * @internal
	 */
	addError<error extends ArkIssue>(error: error): error {
		if (this.currentBranch) this.failBranch(error)
		else errorsOf(this)._.push(error)
		return error
	}

	/**
	 * @internal
	 */
	createErrors(): BaseArkErrors {
		return new BaseArkErrors()
	}

	failBranch(error: ArkIssue): void {
		this.currentBranch!.error = error
		this.currentBranch!.errorCount++
	}
}

export class Traversal extends InternalTraversal {
	/**
	 * #### {@link ArkErrors} that will be part of this traversal's finalized result
	 *
	 * ✅ will always be empty for a valid traversal
	 */
	get errors(): ArkErrors {
		return errorsOf(this) as never
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
		this.raise(input)
		return false
	}

	/**
	 * #### add an {@link ArkError} from a description and return `false`
	 *
	 * ✅ useful for predicates like `.narrow`
	 * 🔗 equivalent to {@link reject}({ expected })
	 */
	mustBe(expected: string): false {
		this.raise(expected)
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
		this.returnedFrom ??= errorsOf(this).count
		return this.raise(input)
	}

	protected raise(input: ArkErrorInput): ArkError {
		const supplied: SuppliedIssue =
			typeof input === "object" ? (input as never) : { expected: input }
		const issue: ArkIssue = {
			code: supplied.code ?? "predicate",
			path: [
				...(supplied.prefixPath ?? []),
				...(supplied.path ?? this.path),
				...(supplied.relativePath ?? [])
			],
			data: "data" in supplied ? supplied.data : this.data,
			// a keyword raises its errors with the description of what it checks
			expected: supplied.expected ?? supplied.description
		}
		if (supplied.problem !== undefined) issue.problem = supplied.problem
		if (supplied.message !== undefined) issue.message = supplied.message
		return this.addError(issue) as never
	}
}

// a build asking for each validation's first issue stops there, and drops any a check that doesn't stop added
export class FirstIssueTraversal extends Traversal {
	override get failFast(): boolean {
		return true
	}

	override finalize(onFail?: FailHandler | null): unknown {
		this._errors?._.splice(1)
		return super.finalize(onFail)
	}
}

type SuppliedIssue = {
	code?: ArkErrorCode
	path?: array<PropertyKey>
	relativePath?: array<PropertyKey>
	prefixPath?: array<PropertyKey>
	data?: unknown
	expected?: string
	description?: string
	problem?: string
	message?: string
}

export const errorsOf = (ctx: InternalTraversal): BaseArkErrors =>
	(ctx._errors ??= ctx.createErrors())

export const applyRejected = (
	node: BaseNode,
	data: unknown,
	config: ResolvedConfig,
	onFail: FailHandler | null,
	ctor: typeof InternalTraversal
): unknown => {
	const ctx = new ctor(data, config)
	node.traverseApply(data, ctx)
	return ctx.finalize(onFail)
}

const receive = (ctx: InternalTraversal, data: unknown): void => {
	ctx.received = data
	ctx.receivedDepth = ctx.path.length
}

// a morph reads data from its input until it returns
export const callMorph = (
	ctx: InternalTraversal,
	morph: Morph,
	data: unknown
): unknown => {
	const { received, receivedDepth } = ctx
	receive(ctx, data)
	ctx.returnedFrom = undefined
	const result = morph(data as never, ctx as never)
	ctx.received = received
	ctx.receivedDepth = receivedDepth
	return ctx.returnedFrom === undefined ? result : returned(ctx, result)
}

// an error ctx.error added fails the morph that returns it as the errors holding it
const returned = (ctx: InternalTraversal, result: unknown): unknown =>
	(
		typeof result === "object" &&
		ctx._errors!._.includes(result as never, ctx.returnedFrom)
	) ?
		ctx._errors
	:	result

export const transform = (
	ctx: InternalTraversal,
	node: BaseNode,
	data: unknown
): unknown =>
	node.isTransformedById ?
		transformResolution(ctx, node.id, data, node.traverseTransform)
	:	transformAcyclic(ctx, node, data)

const transformAcyclic = (
	ctx: InternalTraversal,
	node: BaseNode,
	data: unknown
): unknown => transformed(ctx, node.traverseTransform(data, ctx), data)

// a transform that doesn't require ctx returns its errors
export const transformed = (
	ctx: InternalTraversal,
	result: unknown,
	data: unknown
): unknown => {
	if (!(result instanceof TransformErrors)) return result
	addTransformErrors(ctx, result)
	return data
}

// a validator or compiled morph piping to a node calls only the pipe it can use, so a bundle with no cyclic node leaves out the others
export const pipeOf = (node: BaseNode): TraversePipe =>
	node.includesAlias ? pipe
	: node.transforms ? pipeTransformed
	: node.allowsRequiresContext ? pipeChecked
	: pipeApplied

export type TraversePipe = (
	ctx: InternalTraversal,
	node: BaseNode,
	data: unknown
) => unknown

export const pipeChecked: TraversePipe = (ctx, node, data) =>
	allowsPiped(ctx, node, data) ? data : errorsOf(ctx)

// a node that transforms nothing and passes ctx to no predicate reads nothing a pipe sets on the traversal
export const pipeApplied: TraversePipe = (ctx, node, data) => {
	if (node.allows(data)) return data
	node.traverseApply(data, ctx)
	return errorsOf(ctx)
}

export const pipeTransformed: TraversePipe = (ctx, node, data) =>
	allowsPiped(ctx, node, data) ?
		transformPiped(ctx, node, data, transformAcyclic)
	:	errorsOf(ctx)

export const pipe: TraversePipe = (ctx, node, data) => {
	if (!node.includesAlias) return pipeOf(node)(ctx, node, data)
	if (!node.allows(data)) {
		applyPipedResolution(ctx, node, data)
		return errorsOf(ctx)
	}
	if (!node.transforms) return data
	// a piped node transforms a morph's output, which can share objects an earlier pass cached
	const { transformedByResolutionId, tracksTransforms } = ctx
	ctx.transformedByResolutionId = undefined
	ctx.tracksTransforms = true
	const result = transformPiped(ctx, node, data, transform)
	ctx.transformedByResolutionId = transformedByResolutionId
	ctx.tracksTransforms = tracksTransforms
	return result
}

const allowsPiped = (
	ctx: InternalTraversal,
	node: BaseNode,
	data: unknown
): boolean => {
	// Allows would detach a contextual node's predicates from this path
	if (node.allowsRequiresContext) return applyPiped(ctx, node, data)
	if (node.allows(data)) return true
	applyPiped(ctx, node, data)
	return false
}

const transformPiped = (
	ctx: InternalTraversal,
	node: BaseNode,
	data: unknown,
	transformNode: typeof transform
): unknown => {
	const { received, receivedDepth } = ctx
	const errorCount = ctx.currentErrorCount
	const result = transformNode(ctx, node, data)
	ctx.received = received
	ctx.receivedDepth = receivedDepth
	return ctx.currentErrorCount > errorCount ? errorsOf(ctx) : result
}

const applyPiped = (
	ctx: InternalTraversal,
	node: BaseNode,
	data: unknown
): boolean => {
	const errorCount = ctx.currentErrorCount
	const { received, receivedDepth, checksOnly } = ctx
	receive(ctx, data)
	ctx.checksOnly = true
	node.traverseApply(data, ctx)
	ctx.checksOnly = checksOnly
	ctx.received = received
	ctx.receivedDepth = receivedDepth
	return ctx.currentErrorCount === errorCount
}

// a morph's output is new data, so a cyclic node tracks it from its own root
const applyPipedResolution = (
	ctx: InternalTraversal,
	node: BaseNode,
	data: unknown
): void => {
	const { received, receivedDepth, checksOnly } = ctx
	receive(ctx, data)
	ctx.checksOnly = true
	const piped = traversalOf(ctx, data)
	piped.checksOnly = true
	const { _errors } = applyCyclic(node, data, piped)
	if (_errors) addErrors(ctx, _errors)
	ctx.checksOnly = checksOnly
	ctx.received = received
	ctx.receivedDepth = receivedDepth
}

// Apply transforms each value it finds valid, unless it's checking a union's branch or a piped node
export const transformsValid = (ctx: InternalTraversal): boolean =>
	ctx.branches.length === 0 && !ctx.checksOnly

// a transform Apply runs returns or adds its errors
export const transformedInApply = (
	ctx: InternalTraversal,
	result: unknown
): void => {
	if (result instanceof TransformErrors) addTransformErrors(ctx, result)
}

// whether data was transformed in place of being applied, which requires node to allow it
export const transformIfAllowed = (
	ctx: InternalTraversal,
	node: BaseNode,
	data: unknown
): boolean => {
	if (!transformsValid(ctx)) return false
	if (node.includesAlias) {
		const untracked = allowsAcyclic(node, data)
		if (!(untracked ?? allowsInTraversal(node, data, traversalOf(ctx, data))))
			return false
		// as at a root, data allowed within the bounds is a tree, so each path is transformed
		ctx.tracksTransforms = untracked === undefined
		ctx.transformedByResolutionId = undefined
	} else if (!allowsInBranch(ctx, node, data)) return false
	transformedInApply(ctx, transform(ctx, node, data))
	return true
}

// a predicate reading ctx sees this path, and an error it adds fails the branch
export const allowsInBranch = (
	ctx: InternalTraversal,
	node: BaseNode,
	data: unknown
): boolean =>
	node.allowsRequiresTraversal ?
		allowsInBranchBy(ctx, node.traverseAllows, data)
	:	node.allows(data)

// compiled code passes a node's Allows rather than the node, which a precompiled validator doesn't hold
export const allowsInBranchBy = (
	ctx: InternalTraversal,
	allows: TraverseAllows,
	data: unknown
): boolean => {
	const pathLength = ctx.path.length
	ctx.pushBranch()
	const allowed = allows(data, ctx)
	// compiled Allows returns false without popping the keys it pushed
	ctx.path.length = pathLength
	return ctx.popBranch()!.errorCount === 0 && allowed
}

// a morph that returns ctx.errors has already added them
export const addErrors = (
	ctx: InternalTraversal,
	errors: BaseArkErrors
): void => {
	if (errors === ctx._errors) return
	const target = errorsOf(ctx)
	if (target._merge) target._merge(errors, ctx.path)
	else mergeIssues(target, errors, ctx.path)
}

export const addTransformErrors = (
	ctx: InternalTraversal,
	errors: TransformErrors,
	key?: PropertyKey
): void => {
	const { path, received, receivedDepth } = ctx
	for (const { reversedPath, result, data } of errors.entries) {
		ctx.path = [...path]
		if (key !== undefined) ctx.path.push(key)
		for (let i = reversedPath.length - 1; i >= 0; i--)
			ctx.path.push(reversedPath[i])
		receive(ctx, data)
		addErrors(ctx, result)
	}
	ctx.path = path
	ctx.received = received
	ctx.receivedDepth = receivedDepth
}

export const transformResolution = (
	ctx: InternalTraversal,
	id: string,
	data: unknown,
	transform: TraverseTransform
): unknown => {
	if (!ctx.tracksTransforms || !hasDomain(data, "object"))
		return transformed(ctx, transform(data, ctx), data)
	const transformedByData = ((ctx.transformedByResolutionId ??= {})[id] ??=
		new Map())
	if (transformedByData.has(data)) {
		const result = transformedByData.get(data)
		if (result !== transforming) return result
		// a cycle reached data, so its output will fill this placeholder
		const placeholder = isArray(data) ? [] : {}
		transformedByData.set(data, placeholder)
		return placeholder
	}
	transformedByData.set(data, transforming)
	const result = transformed(ctx, transform(data, ctx), data)
	const placeholder = transformedByData.get(data)
	if (placeholder === transforming || !canFill(placeholder, result)) {
		transformedByData.set(data, result)
		// a key's later step can pass this output back, and a morph never runs on its own output
		if (hasDomain(result, "object")) transformedByData.set(result, result)
		return result
	}
	Object.defineProperties(
		placeholder as object,
		Object.getOwnPropertyDescriptors(result)
	)
	transformedByData.set(placeholder, placeholder)
	return Object.setPrototypeOf(placeholder, Object.getPrototypeOf(result))
}

class Resolutions {
	seen: { [id in string]?: Map<unknown, ResolutionState> } = {}
	// a cyclic root's Apply leaves resolutions untracked until its data is deep or broad enough to be cyclic
	tracked = true
	// reused by depth, so entering doesn't allocate
	frames: ResolvingFrame[] | undefined = undefined
	depth = 0
	untrackedVisits = 0
	recordedFailure = false
	enteredCount = 0
	earliestAssumed = Number.POSITIVE_INFINITY
	assumed: unknown[] | undefined = undefined
	reachedInvalid: InvalidResolution | undefined = undefined
}

const resolutionsOf = (ctx: InternalTraversal): Resolutions =>
	(ctx.resolutions ??= new Resolutions())

// undefined once entered, else whether data is known or assumed valid
export const enterResolution = (
	ctx: InternalTraversal,
	id: string,
	data: unknown
): boolean | undefined => {
	const resolutions = resolutionsOf(ctx)
	// untracked, every state is a failure, so none is looked up before the first
	const states =
		resolutions.tracked || resolutions.recordedFailure ?
			resolutions.seen[id]
		:	undefined
	const state = states?.get(data)
	if (state !== undefined) {
		if (typeof state === "number") {
			if (state < resolutions.earliestAssumed)
				resolutions.earliestAssumed = state
			return true
		}
		if (typeof state === "boolean") return state
		if (ctx.currentBranch) {
			ctx.failBranch(state.error)
			return false
		}
		if (state.reported) {
			resolutions.reachedInvalid ??= state
			return false
		}
		// its errors were discarded with a branch, so it's traversed again
	}
	if (
		!resolutions.tracked &&
		(resolutions.depth >= maxAliasDepth ||
			++resolutions.untrackedVisits > maxAliasVisits)
	)
		throw untrackedBound
	const frame = ((resolutions.frames ??= [])[resolutions.depth++] ??= {
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
	frame.errorCount = ctx.currentErrorCount
	if (!resolutions.tracked) return
	;(states ?? (resolutions.seen[id] = new Map())).set(
		data,
		++resolutions.enteredCount
	)
	frame.entered = resolutions.enteredCount
	frame.outerReachedInvalid = resolutions.reachedInvalid
	resolutions.reachedInvalid = undefined
	frame.outerEarliestAssumed = resolutions.earliestAssumed
	frame.assumedLength = (resolutions.assumed ??= []).length
	resolutions.earliestAssumed = Number.POSITIVE_INFINITY
	return
}

// whether data is valid, given Allows' result or, in Apply, the errors since it was entered
export const exitResolution = (
	ctx: InternalTraversal,
	allowed?: boolean
): boolean => {
	const resolutions = ctx.resolutions!
	const frame = resolutions.frames![--resolutions.depth]
	if (!resolutions.tracked) return allowed ?? exitUntracked(ctx, frame)
	const reachedInvalid = resolutions.reachedInvalid
	resolutions.reachedInvalid = frame.outerReachedInvalid
	const valid =
		allowed ??
		(reachedInvalid === undefined && ctx.currentErrorCount === frame.errorCount)
	const data = frame.data
	const states = resolutions.seen[frame.id]!
	// a primitive has no identity, so each place it's reached reports its own errors
	if (typeof data === "object" ? data === null : typeof data !== "function") {
		resolutions.earliestAssumed = frame.outerEarliestAssumed
		states.delete(data)
		return valid
	}
	const state: ResolutionState =
		valid || allowed === false ?
			valid
		:	invalidResolution(ctx, reachedInvalid?.error)
	const earliestAssumed = resolutions.earliestAssumed
	resolutions.earliestAssumed = frame.outerEarliestAssumed
	const assumed = resolutions.assumed!
	if (valid && earliestAssumed < frame.entered) {
		assumed.push(states, data)
		if (earliestAssumed < resolutions.earliestAssumed)
			resolutions.earliestAssumed = earliestAssumed
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
		resolutions.reachedInvalid ??= state
	return valid
}

// untracked, a failed object is recorded so that reaching it again doesn't report it twice
const exitUntracked = (
	ctx: InternalTraversal,
	frame: ResolvingFrame
): boolean => {
	if (ctx.currentErrorCount === frame.errorCount) return true
	if (!hasDomain(frame.data, "object")) return false
	const resolutions = ctx.resolutions!
	;(resolutions.seen[frame.id] ??= new Map()).set(
		frame.data,
		invalidResolution(ctx)
	)
	resolutions.recordedFailure = true
	return false
}

const invalidResolution = (
	ctx: InternalTraversal,
	error = ctx.currentBranch?.error ??
		lastOf(ctx._errors!._issues ?? ctx._errors!._)
): InvalidResolution => ({
	error,
	reported: !ctx.currentBranch
})

// a traversal of other data, of this one's class, so a callback sees the API it would have
const traversalOf = <ctx extends InternalTraversal>(
	ctx: ctx,
	data: unknown
): ctx =>
	new (ctx.constructor as new (root: unknown, config: ResolvedConfig) => ctx)(
		data,
		ctx.config
	)

const lastOf = <t>(array: readonly t[]): t => array[array.length - 1]

const transforming = /* @__PURE__ */ noSuggest("transforming")

export const maxAliasDepth = 64

export const maxAliasVisits = 1000

let continuation: InternalTraversal | undefined
let continuationConfig: ResolvedConfig

// shared by every root's Allows, which passes an alias depth in place of ctx
export const aliasVisits = {
	count: 0,
	tracked: false,
	// data past the depth bound may be cyclic, so every path past it continues one tracked traversal
	exceed: (data: unknown): InternalTraversal | false => {
		// a path past the bound costs the visits it took to reach it, so cyclic data reruns tracked from its root
		aliasVisits.count += maxAliasDepth
		if (aliasVisits.count > maxAliasVisits) {
			aliasVisits.count = Number.POSITIVE_INFINITY
			return false
		}
		aliasVisits.tracked = true
		// an Allows reaching a predicate that reads ctx isn't run untracked, so no callback sees it
		return (continuation ??= new InternalTraversal(data, continuationConfig))
	}
}

const untrackedBound = /* @__PURE__ */ noSuggest("untrackedBound")

// once tracked, a cyclic root is entered as its own resolution, so data reaching it again isn't traversed twice
export const applyCyclic = <ctx extends InternalTraversal>(
	node: BaseNode,
	data: unknown,
	ctx: ctx
): ctx => {
	// a rerun would transform each value Apply found valid again
	if (node.transforms) {
		applyResolution(node.trackedId, node.traverseApply, data, ctx)
		return ctx
	}
	resolutionsOf(ctx).tracked = false
	try {
		// data reaching its root again is cyclic, so untracked it exceeds the bounds
		node.traverseApply(data, ctx)
	} catch (e) {
		if (e !== untrackedBound) throw e
		ctx = traversalOf(ctx, data)
		applyResolution(node.trackedId, node.traverseApply, data, ctx)
	}
	return ctx
}

export const applyResolution = (
	id: string,
	apply: TraverseApply,
	data: unknown,
	ctx: InternalTraversal
): void => {
	if (enterResolution(ctx, id, data) !== undefined) return
	apply(data, ctx)
	exitResolution(ctx)
}

// undefined once a compiled Apply enters the resolution, else whether traversal continues past data it already knows
export const enterApplied = (
	ctx: InternalTraversal,
	id: string,
	data: unknown
): boolean | undefined => {
	const entered = enterResolution(ctx, id, data)
	return entered === undefined ? undefined : entered || !ctx.failFast
}

// a compiled Apply exits the resolution it entered once its member returns whether traversal continues
export const exitApplied = (
	ctx: InternalTraversal,
	continues: boolean
): boolean => {
	exitResolution(ctx)
	return continues
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

// a value Allows accepts isn't applied, and is transformed where that finds its morphs' errors unless its structure transforms it
export const applyValue = (
	node: BaseNode,
	data: unknown,
	ctx: InternalTraversal,
	transforms = true
): void => {
	if (
		node.transforms &&
		(transforms && (node.includesMorph || node.includesAlias) ?
			transformIfAllowed(ctx, node, data)
		:	allowsInBranch(ctx, node, data))
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

export const allowsInContext = (
	node: BaseNode,
	data: unknown,
	config: ResolvedConfig
): boolean => allowsInTraversal(node, data, new Traversal(data, config))

// a contextual predicate can add an error and still return true
const allowsInTraversal = (
	node: BaseNode,
	data: unknown,
	ctx: InternalTraversal
): boolean => node.traverseAllows(data as never, ctx) && !ctx.hasError()

// entered while in progress, then whether it is valid, or why Apply found it invalid
type ResolutionState = number | boolean | InvalidResolution

interface InvalidResolution {
	error: ArkIssue
	reported: boolean
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

// what a default's morph applies its value through: a node, or the validator a standalone build created from one
interface DefaultedValue {
	(data: unknown, pipedFromCtx: Traversal): unknown
	traverse: (data: unknown) => unknown
}

export type DefaultedNode = Pick<
	BaseNode,
	| "includesTransform"
	| "includesAlias"
	| "allowsRequiresContext"
	| "includesContextualMorph"
	| "transforms"
>

export const computeDefaultValueMorph = (
	key: PropertyKey,
	value: DefaultedValue,
	defaultInput: unknown,
	// a validator has no flags of its own, so a standalone build passes its node's
	node: DefaultedNode = value as never,
	// a standalone build passes what arktype decided as it created the node, which the function's parameters changing later doesn't change
	isThunkInput = isThunk(defaultInput)
): Morph<any> => {
	const thunk = isThunkInput ? (defaultInput as () => unknown) : undefined
	if (!thunk && !node.includesTransform && !node.includesAlias) {
		return data => {
			data[key] = defaultInput
			return data
		}
	}
	if (!node.allowsRequiresContext && !node.includesContextualMorph) {
		return data => {
			const input = thunk ? thunk() : defaultInput
			const output = value.traverse(input)
			if (output instanceof BaseArkErrors)
				return new TransformErrors(output, input).addTo(undefined, key)
			data[key] = output
			return data
		}
	}
	let transformingDefault = false
	return (data, ctx) => {
		// transforming a default through a cyclic value can reach this morph again
		if (transformingDefault) return data
		if (!thunk && !node.transforms) {
			data[key] = defaultInput
			return data
		}
		transformingDefault = true
		try {
			data[key] = traverseKey(
				key,
				() => value(thunk ? thunk() : defaultInput, ctx),
				ctx
			)
		} finally {
			transformingDefault = false
		}
		return data
	}
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
