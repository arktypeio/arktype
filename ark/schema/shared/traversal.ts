import {
	functionNameOf,
	hasDomain,
	isArray,
	isThunk,
	noSuggest,
	objectKindOf,
	stringifyPath,
	type array
} from "@ark/util"
import type { ResolvedConfig } from "../config.ts"
import type { BaseNode } from "../node.ts"
import type { Predicate } from "../predicate.ts"
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
	issueAt,
	mergeIssues,
	messageOf,
	type ArkIssue,
	type CompactApply,
	type FailureContext,
	type FailureSite,
	type UnionSite
} from "./issues.ts"
import { TransformErrors } from "./transform.ts"
import { inProgress } from "./utils.ts"

// receives arktype's errors, which extend a validator's
export type FailHandler = (errors: never) => unknown

export type BranchTraversal = {
	error: ArkIssue | undefined
	/** the errors the branch has added */
	errN: number
}

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
	/** what it tracks of the cyclic nodes it enters, once it enters one */
	declare res: Resolutions | undefined
	/**
	 * whether data within its bounds is a tree, so each path is transformed
	 * data a root allowed within the bounds is a tree, so each path is transformed
	 */
	declare isTree: boolean
	/** each cyclic node's transformed data, keyed by the input it transformed */
	declare tfdById: { [id in string]?: Map<unknown, unknown> } | undefined

	/**
	 * the data the innermost running morph received
	 * data is read from what a morph received, since root is the input
	 */
	declare recv: unknown
	/** how deep in the root's path the data a morph received is */
	declare recvAt: number
	/**
	 * whether a piped node is only checked, to be transformed once Apply finds it valid
	 * a piped node is transformed once Apply finds it valid
	 */
	declare chkOnly: boolean
	/**
	 * the error count a running morph started from, since it fails by returning any error added after
	 * a morph fails by returning any error ctx.error added during its call
	 */
	declare retFrom: number | undefined
	// a valid input's transforms write into it
	declare inPlace?: true

	constructor(root: unknown, config: ResolvedConfig) {
		this.path = []
		this._errors = undefined
		this.root = root
		this.config = config
		this.branches = []
		this.res = undefined
		this.isTree = true
		this.tfdById = undefined
		this.recv = root
		this.recvAt = 0
		this.chkOnly = false
		this.retFrom = undefined
	}

	/**
	 * #### whether {@link currentBranch} (or the traversal root, outside a union) has one or more errors
	 */
	hasError(): boolean {
		return this.errN !== 0
	}

	get currentBranch(): BranchTraversal | undefined {
		return this.branches.length === 0 ?
				undefined
			:	this.branches[this.branches.length - 1]
	}

	/** its result: the data, or its errors passed to `onFail` if it has any */
	fin(onFail?: FailHandler | null): unknown {
		if (this.hasError())
			return onFail ? onFail(this._errors as never) : this._errors

		return this.root
	}

	/** how many errors the current union branch has, or the traversal has outside a union */
	get errN(): number {
		const branches = this.branches
		return branches.length === 0 ?
				(this._errors?.count ?? 0)
			:	branches[branches.length - 1].errN
	}

	get failFast(): boolean {
		return this.branches.length !== 0
	}

	/** starts counting a union branch's errors */
	pushBr(): void {
		this.branches.push({
			error: undefined,
			errN: 0
		})
	}

	/** stops counting the innermost union branch's errors, returning it */
	popBr(): BranchTraversal | undefined {
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
	 * an error from a node's context and the data it rejected
	 *
	 * @internal a node's error, which arktype's traversal writes from its
	 * context, and this one, checking Allows for arktype, adds as an issue
	 */
	nodeError<input extends NodeErrorContextInput>(
		input: input,
		data: unknown
	): ArkError<input["code"]>
	nodeError(input: NodeErrorContextInput, data: unknown): ArkError {
		return this.addError({
			code: input.code,
			path: this.path.slice(),
			data,
			expected: input.description
		}) as never
	}

	/** @internal */
	_at(site: FailureSite, data: unknown, key?: PropertyKey): boolean {
		this.addError(issueAt(this.path, site, data, key))
		return this.failFast
	}

	/** @internal */
	_in(
		apply: CompactApply,
		data: unknown,
		key: PropertyKey,
		missing?: FailureSite
	): boolean | undefined {
		if (missing && !(key in (data as object)))
			return this._at(missing, data, key)
		this.path.push(key)
		const continues = apply((data as Record<PropertyKey, unknown>)[key], this)
		this.path.pop()
		return !continues
	}

	/** @internal */
	failsUnion(
		branches: readonly CompactApply[],
		site: UnionSite,
		data: unknown
	): boolean {
		// a standalone union's site is a context like any other
		this.addError(issueAt(this.path, site as FailureSite, data, undefined))
		return this.failFast
	}

	/** @internal */
	addError<error extends ArkIssue>(error: error): error {
		if (this.currentBranch) this.failBranch(error)
		else {
			const errors = errorsOf(this)
			if (errors._.length) errors._.push(error)
			else errors._ = [error]
		}
		return error
	}

	/**
	 * @internal adds the errors of a validator called with this traversal,
	 * returning its own
	 */
	piped(errors: BaseArkErrors): BaseArkErrors {
		const target = errorsOf(this)
		if (target._merge) target._merge(errors, this.path)
		else {
			for (const issue of errors._) {
				target._.push({
					...issue,
					path: [...this.path, ...issue.path],
					// read by a callback at the old path, so rewritten unless supplied
					message:
						issue.message && issue.message === messageOf(issue) ?
							undefined
						:	issue.message
				})
			}
		}
		return target
	}

	/** @internal */
	createErrors(): BaseArkErrors {
		return new BaseArkErrors()
	}

	failBranch(error: ArkIssue): void {
		const branch = this.currentBranch!
		branch.error = error
		branch.errN++
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
		let result: any = this.recv
		for (let i = this.recvAt; i < this.path.length; i++)
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
		this.retFrom ??= errorsOf(this).count
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
			expected:
				supplied.expected ??
				supplied.description ??
				(supplied.morph && describePredicate(supplied))
		}
		if (supplied.problem !== undefined) issue.problem = supplied.problem
		if (supplied.message !== undefined) issue.message = supplied.message
		return this.addError(issue) as never
	}
}

export class FirstIssueTraversal extends Traversal {
	override get failFast(): boolean {
		return true
	}

	override fin(onFail?: FailHandler | null): unknown {
		this._errors?._.splice(1)
		return super.fin(onFail)
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
	morph?: Morph
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
	node.tApply(data, ctx)
	return ctx.fin(onFail)
}

const receive = (ctx: InternalTraversal, data: unknown): void => {
	ctx.recv = data
	ctx.recvAt = ctx.path.length
}

// reads predicate, or for pipe.try the morph that threw
export const describePredicate = (ctx: {
	predicate?: Predicate
	morph?: Morph
}): string => {
	const fn = ctx.predicate ?? ctx.morph
	return `valid according to ${(fn && functionNameOf(fn)) || "an anonymous predicate"}`
}

// pipe.try's morph, failing with what the one it wraps throws
export const tryMorph =
	(morph: Morph): Morph =>
	(In, ctx) => {
		try {
			return morph(In, ctx)
		} catch (cause) {
			return ctx.error({ code: "predicate", morph, cause })
		}
	}

// an `x/.../` literal's morph
export const execMorph =
	(regex: RegExp): Morph =>
	(s: string) =>
		regex.exec(s)

// a morph reads data from its input until it returns
export const callMorph = (
	ctx: InternalTraversal,
	morph: Morph,
	data: unknown
): unknown => {
	const { recv, recvAt } = ctx
	receive(ctx, data)
	ctx.retFrom = undefined
	const result = morph(data as never, ctx as never)
	ctx.recv = recv
	ctx.recvAt = recvAt
	return ctx.retFrom === undefined ? result : returned(ctx, result)
}

// a morph returning errors ctx.error added fails with them
const returned = (ctx: InternalTraversal, result: unknown): unknown =>
	(
		typeof result === "object" &&
		ctx._errors!._.includes(result as never, ctx.retFrom)
	) ?
		ctx._errors
	:	result

export const transform = (
	ctx: InternalTraversal,
	node: BaseNode,
	data: unknown
): unknown =>
	node.tfsById ?
		transformResolution(ctx, node.id, data, node.tTransform!, node)
	:	transformAcyclic(ctx, node, data)

const transformAcyclic = (
	ctx: InternalTraversal,
	node: BaseNode,
	data: unknown
): unknown => transformed(ctx, node.tTransform!(data, ctx), data)

// a transform that doesn't require ctx returns its errors
export const transformed = (
	ctx: InternalTraversal,
	result: unknown,
	data: unknown
): unknown => {
	if (!(result instanceof TransformErrors)) return result
	addMorphErrs(ctx, result)
	return data
}

export const pipeOf = (node: BaseNode): TraversePipe =>
	node.hasAlias ? pipe
	: node.tfs ? pipeTransformed
	: node.allowsCtx ? pipeChecked
	: pipeApplied

export type TraversePipe = (
	ctx: InternalTraversal,
	node: BaseNode,
	data: unknown
) => unknown

export const pipeChecked: TraversePipe = (ctx, node, data) =>
	allowsPiped(ctx, node, data) ? data : errorsOf(ctx)

// a node reading no pipe state is applied as is
export const pipeApplied: TraversePipe = (ctx, node, data) => {
	if (node.allows(data)) return data
	node.tApply(data, ctx)
	return errorsOf(ctx)
}

export const pipeTransformed: TraversePipe = (ctx, node, data) =>
	allowsPiped(ctx, node, data) ?
		transformPiped(ctx, node, data, transformAcyclic)
	:	errorsOf(ctx)

export const pipe: TraversePipe = (ctx, node, data) => {
	if (!node.hasAlias) return pipeOf(node)(ctx, node, data)
	if (!node.allows(data)) {
		applyPipedResolution(ctx, node, data)
		return errorsOf(ctx)
	}
	if (!node.tfs) return data
	// a morph's output can share objects an earlier pass cached
	const { tfdById, isTree } = ctx
	ctx.tfdById = undefined
	ctx.isTree = true
	const result = transformPiped(ctx, node, data, transform)
	ctx.tfdById = tfdById
	ctx.isTree = isTree
	return result
}

const allowsPiped = (
	ctx: InternalTraversal,
	node: BaseNode,
	data: unknown
): boolean => {
	// Allows would detach a contextual node's predicates from this path
	if (node.allowsCtx) return applyPiped(ctx, node, data)
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
	const { recv, recvAt } = ctx
	const errN = ctx.errN
	const result = transformNode(ctx, node, data)
	ctx.recv = recv
	ctx.recvAt = recvAt
	return ctx.errN > errN ? errorsOf(ctx) : result
}

const applyPiped = (
	ctx: InternalTraversal,
	node: BaseNode,
	data: unknown
): boolean => {
	const errN = ctx.errN
	const { recv, recvAt, chkOnly } = ctx
	receive(ctx, data)
	ctx.chkOnly = true
	node.tApply(data, ctx)
	ctx.chkOnly = chkOnly
	ctx.recv = recv
	ctx.recvAt = recvAt
	return ctx.errN === errN
}

// a morph's output is new data, tracked from the cyclic node's root
const applyPipedResolution = (
	ctx: InternalTraversal,
	node: BaseNode,
	data: unknown
): void => {
	const { recv, recvAt, chkOnly } = ctx
	receive(ctx, data)
	ctx.chkOnly = true
	const piped = traversalOf(ctx, data)
	piped.chkOnly = true
	const { _errors } = applyCyclic(node, data, piped)
	if (_errors) addErrors(ctx, _errors)
	ctx.chkOnly = chkOnly
	ctx.recv = recv
	ctx.recvAt = recvAt
}

// Apply transforms valid values outside branches and pipes
export const transformsValid = (ctx: InternalTraversal): boolean =>
	ctx.branches.length === 0 && !ctx.chkOnly

// a transform Apply runs returns or adds its errors
export const transformedInApply = (
	ctx: InternalTraversal,
	result: unknown
): void => {
	if (result instanceof TransformErrors) addMorphErrs(ctx, result)
}

// whether data was allowed and transformed instead of applied
export const transformIfAllowed = (
	ctx: InternalTraversal,
	node: BaseNode,
	data: unknown
): boolean => {
	if (!transformsValid(ctx)) return false
	if (node.hasAlias) {
		const untracked = allowsAcyclic(node, data)
		if (!(untracked ?? allowsInTraversal(node, data, traversalOf(ctx, data))))
			return false
		// as at a root, allowed data is a tree
		ctx.isTree = untracked === undefined
		ctx.tfdById = undefined
	} else if (!allowsInBranch(ctx, node, data)) return false
	transformedInApply(ctx, transform(ctx, node, data))
	return true
}

// a predicate reading ctx sees this path; an error it adds fails the branch
export const allowsInBranch = (
	ctx: InternalTraversal,
	node: BaseNode,
	data: unknown
): boolean =>
	node.checksCtx ?
		allowsInBranchBy(ctx, node.tAllows, data, node)
	:	node.allows(data)

// takes Allows, since a precompiled validator has no node
export const allowsInBranchBy = (
	ctx: InternalTraversal,
	allows: TraverseAllows,
	data: unknown,
	node?: BaseNode
): boolean => {
	const pathLength = ctx.path.length
	ctx.pushBr()
	const allowed = allows.call(node, data, ctx)
	// compiled Allows returns false without popping the keys it pushed
	ctx.path.length = pathLength
	return ctx.popBr()!.errN === 0 && allowed
}

// what an Allows returns where data fails, through a call V8 has no feedback
// for until then, so a transform it guards is compiled with its checks and
// repeats none of their reads
export const disallowed = (): false => false

// the last string a loop's Allows rejected, so Apply needn't rematch it
let rejectedBy: unknown
let rejectedValue: unknown

export const rejected = (
	allows: (data: unknown) => boolean,
	value: unknown
): false => {
	if (typeof value === "string") {
		rejectedBy = allows
		rejectedValue = value
	}
	return false
}

export const rejects = (
	allows: (data: unknown) => boolean,
	value: unknown
): boolean => {
	if (value !== rejectedValue || allows !== rejectedBy) return !allows(value)
	rejectedBy = rejectedValue = undefined
	return true
}

// sticky matching only pays off on longer strings
const minStickyLength = 16

const stickyCopies = /* @__PURE__ */ new WeakMap<RegExp, RegExp>()

// matches /^atom+$/ by a sticky copy of its atom
export const matchesRepeated = (pattern: RegExp, data: string): boolean => {
	if (data.length < minStickyLength) return pattern.test(data)
	let sticky = stickyCopies.get(pattern)
	if (!sticky) {
		sticky = new RegExp(pattern.source.slice(1, -1), `${pattern.flags}y`)
		stickyCopies.set(pattern, sticky)
	}
	sticky.lastIndex = 0
	return sticky.test(data) && sticky.lastIndex === data.length
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

export const addMorphErrs = (
	ctx: InternalTraversal,
	errors: TransformErrors,
	key?: PropertyKey
): void => {
	const { path, recv, recvAt } = ctx
	for (const { reversedPath, result, data } of errors.entries) {
		ctx.path = [...path]
		if (key !== undefined) ctx.path.push(key)
		for (let i = reversedPath.length - 1; i >= 0; i--)
			ctx.path.push(reversedPath[i])
		receive(ctx, data)
		addErrors(ctx, result)
	}
	ctx.path = path
	ctx.recv = recv
	ctx.recvAt = recvAt
}

export const transformResolution = (
	ctx: InternalTraversal,
	id: string,
	data: unknown,
	transform: TraverseTransform,
	node?: BaseNode
): unknown => {
	if (!ctx.isTree || !hasDomain(data, "object"))
		return transformed(ctx, transform.call(node, data, ctx), data)
	const transformedByData = ((ctx.tfdById ??= {})[id] ??= new Map())
	if (transformedByData.has(data)) {
		const result = transformedByData.get(data)
		if (result !== transforming) return result
		// a cycle reached data, so its output will fill this placeholder
		const placeholder = isArray(data) ? [] : {}
		transformedByData.set(data, placeholder)
		return placeholder
	}
	transformedByData.set(data, transforming)
	const result = transformed(ctx, transform.call(node, data, ctx), data)
	const placeholder = transformedByData.get(data)
	if (placeholder === transforming || !canFill(placeholder, result)) {
		transformedByData.set(data, result)
		// a later step may pass this output back
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
	// untracked until data is deep or broad enough to be cyclic
	tracked = true
	// reused by depth, so entering doesn't allocate
	frames: ResolvingFrame[] | undefined = undefined
	depth = 0
	/** how many nodes were entered while untracked, bounded so a cycle can't run forever */
	visits = 0
	/** whether a failure was recorded, so untracked lookups still find it */
	hasFailed = false
	/** how many resolutions were entered, numbering each */
	nEntered = 0
	assumedFrom = Number.POSITIVE_INFINITY
	assumed: unknown[] | undefined = undefined
	/** the first reported invalid resolution reached */
	invalid: InvalidResolution | undefined = undefined
}

const resolutionsOf = (ctx: InternalTraversal): Resolutions =>
	(ctx.res ??= new Resolutions())

// undefined once entered, else whether data is known or assumed valid
export const enterResolution = (
	ctx: InternalTraversal,
	id: string,
	data: unknown
): boolean | undefined => {
	const res = resolutionsOf(ctx)
	// untracked, every state is a failure, so none is looked up
	const states = res.tracked || res.hasFailed ? res.seen[id] : undefined
	const state = states?.get(data)
	if (state !== undefined) {
		if (typeof state === "number") {
			if (state < res.assumedFrom) res.assumedFrom = state
			return true
		}
		if (typeof state === "boolean") return state
		if (ctx.currentBranch) {
			ctx.failBranch(state.error)
			return false
		}
		if (state.reported) {
			res.invalid ??= state
			return false
		}
		// its errors were discarded with a branch, so it's traversed again
	}
	if (
		!res.tracked &&
		(res.depth >= maxAliasDepth || ++res.visits > maxAliasVisits)
	)
		throw untrackedBound
	const frame = ((res.frames ??= [])[res.depth++] ??= {
		id,
		data,
		entered: 0,
		errN: 0,
		outerInvalid: undefined,
		assumedOuter: 0,
		assumedLength: 0
	})
	frame.id = id
	frame.data = data
	frame.errN = ctx.errN
	if (!res.tracked) return
	;(states ?? (res.seen[id] = new Map())).set(data, ++res.nEntered)
	frame.entered = res.nEntered
	frame.outerInvalid = res.invalid
	res.invalid = undefined
	frame.assumedOuter = res.assumedFrom
	frame.assumedLength = (res.assumed ??= []).length
	res.assumedFrom = Number.POSITIVE_INFINITY
	return
}

export const exitResolution = (
	ctx: InternalTraversal,
	allowed?: boolean
): boolean => {
	const res = ctx.res!
	const frame = res.frames![--res.depth]
	if (!res.tracked) return allowed ?? exitUntracked(ctx, frame)
	const invalid = res.invalid
	res.invalid = frame.outerInvalid
	const valid = allowed ?? (invalid === undefined && ctx.errN === frame.errN)
	const data = frame.data
	const states = res.seen[frame.id]!
	// a primitive has no identity, so each place reports its own errors
	if (typeof data === "object" ? data === null : typeof data !== "function") {
		res.assumedFrom = frame.assumedOuter
		states.delete(data)
		return valid
	}
	const state: ResolutionState =
		valid || allowed === false ? valid : invalidResolution(ctx, invalid?.error)
	const assumedFrom = res.assumedFrom
	res.assumedFrom = frame.assumedOuter
	const assumed = res.assumed!
	if (valid && assumedFrom < frame.entered) {
		assumed.push(states, data)
		if (assumedFrom < res.assumedFrom) res.assumedFrom = assumedFrom
		return true
	}
	// settle each result that assumed this one
	for (let i = frame.assumedLength; i < assumed.length; i += 2) {
		const assumedStates = assumed[i] as Map<unknown, ResolutionState>
		if (valid) assumedStates.set(assumed[i + 1], true)
		else assumedStates.delete(assumed[i + 1])
	}
	assumed.length = frame.assumedLength
	states.set(data, state)
	if (typeof state === "object" && state.reported) res.invalid ??= state
	return valid
}

// a failed object is recorded so it isn't reported twice
const exitUntracked = (
	ctx: InternalTraversal,
	frame: ResolvingFrame
): boolean => {
	if (ctx.errN === frame.errN) return true
	if (!hasDomain(frame.data, "object")) return false
	const res = ctx.res!
	;(res.seen[frame.id] ??= new Map()).set(frame.data, invalidResolution(ctx))
	res.hasFailed = true
	return false
}

const invalidResolution = (
	ctx: InternalTraversal,
	error = ctx.currentBranch?.error ?? lastOf(ctx._errors!._i ?? ctx._errors!._)
): InvalidResolution => ({
	error,
	reported: !ctx.currentBranch
})

// of ctx's class, so callbacks see the same API
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
	// data past the depth bound may be cyclic, so every path past it continues
	// one tracked traversal
	exceed: (data: unknown): InternalTraversal | false => {
		// a path past the bound costs the visits it took to reach it, so cyclic
		// data reruns tracked from its root
		aliasVisits.count += maxAliasDepth
		if (aliasVisits.count > maxAliasVisits) {
			aliasVisits.count = Number.POSITIVE_INFINITY
			return false
		}
		aliasVisits.tracked = true
		return (continuation ??= new InternalTraversal(data, continuationConfig))
	}
}

const untrackedBound = /* @__PURE__ */ noSuggest("untrackedBound")

// once tracked, a cyclic root is entered as its own resolution, so data
// reaching it again isn't traversed twice
export const applyCyclic = <ctx extends InternalTraversal>(
	node: BaseNode,
	data: unknown,
	ctx: ctx
): ctx => {
	// a rerun would transform each value Apply found valid again
	if (node.tfs) {
		applyResolution(node.trackedId, node, data, ctx)
		return ctx
	}
	resolutionsOf(ctx).tracked = false
	try {
		// data reaching its root again is cyclic, exceeding the untracked bounds
		node.tApply(data, ctx)
	} catch (e) {
		if (e !== untrackedBound) throw e
		ctx = traversalOf(ctx, data)
		applyResolution(node.trackedId, node, data, ctx)
	}
	return ctx
}

export const applyResolution = (
	id: string,
	node: BaseNode,
	data: unknown,
	ctx: InternalTraversal
): void => {
	if (enterResolution(ctx, id, data) !== undefined) return
	node.tApply(data, ctx)
	exitResolution(ctx)
}

// undefined once entered, else whether traversal continues
export const enterApplied = (
	ctx: InternalTraversal,
	id: string,
	data: unknown
): boolean | undefined => {
	const entered = enterResolution(ctx, id, data)
	return entered === undefined ? undefined : entered || !ctx.failFast
}

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
	member.hasAlias ?
		applyResolution(member.id, node, data, ctx)
	:	node.tApply(data, ctx)

// applies data Allows rejects; transforms what it accepts
export const applyValue = (
	node: BaseNode,
	data: unknown,
	ctx: InternalTraversal,
	tfs = true
): void => {
	if (
		node.tfs &&
		(tfs && (node.hasMorph || node.hasAlias) ?
			transformIfAllowed(ctx, node, data)
		:	allowsInBranch(ctx, node, data))
	)
		return
	if (node.entersAlias) applyResolution(node.id, node, data, ctx)
	else node.tApply(data, ctx)
}

// within the bounds, data is traversed as a tree; past the visit bound it may
// be cyclic, so only a tracked traversal can tell
export const allowsUntracked = (
	node: BaseNode,
	data: unknown
): boolean | undefined => {
	if (inProgress.definitions || inProgress.res || node.checksCtx) return
	const outerVisits = aliasVisits.count
	const outerContinuation = continuation
	const outerConfig = continuationConfig
	aliasVisits.count = 0
	continuation = undefined
	continuationConfig = node.$.cfg
	let allowed: boolean
	try {
		allowed = node.tAllows(data as never, 0)
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

// a transform relies on data being acyclic, which data tracked past the
// depth bound isn't shown to be
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
): boolean => node.tAllows(data as never, ctx) && !ctx.hasError()

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
	errN: number
	/** the invalid resolution reached before entering this frame */
	outerInvalid: InvalidResolution | undefined
	assumedOuter: number
	assumedLength: number
}

// a builtin like Date keeps its state in internal slots a placeholder can't take
const canFill = (placeholder: unknown, result: unknown): result is object =>
	typeof result === "object" &&
	result !== null &&
	(isArray(placeholder) ? isArray(result) : objectKindOf(result) === undefined)

export const travKey = <result>(
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

// a node, or the validator a standalone build created from it
interface DefaultedValue {
	(data: unknown, pipedFromCtx: Traversal): unknown
	traverse: (data: unknown) => unknown
}

export type DefaultedNode = Pick<
	BaseNode,
	"alters" | "hasAlias" | "allowsCtx" | "ctxMorph" | "tfs"
>

export const computeDefaultValueMorph = (
	key: PropertyKey,
	value: DefaultedValue,
	defaultInput: unknown,
	// a standalone build passes its node's flags
	node: DefaultedNode = value as never,
	// passed by standalone builds as decided at creation
	isThunkInput = isThunk(defaultInput)
): Morph<any> => {
	const thunk = isThunkInput ? (defaultInput as () => unknown) : undefined
	if (!thunk && !node.alters && !node.hasAlias) {
		return data => {
			data[key] = defaultInput
			return data
		}
	}
	if (!node.allowsCtx && !node.ctxMorph) {
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
		if (!thunk && !node.tfs) {
			data[key] = defaultInput
			return data
		}
		transformingDefault = true
		try {
			data[key] = travKey(
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
