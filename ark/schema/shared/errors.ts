import {
	conflatenateAll,
	pathAt,
	printable,
	stringifyPath,
	throwError,
	throwParseError,
	type JsonArray,
	type JsonObject,
	type array,
	type merge,
	type mutable,
	type omit,
	type propwiseXor,
	type show
} from "@ark/util"
import type { ArkSchemaConfig, ResolvedConfig } from "../config.ts"
import type {
	NodeErrorContextsByKind,
	Prerequisite,
	errorCtx
} from "../kinds.ts"
import type { BaseNode } from "../node.ts"
import type { DiscriminantErrorContext } from "../roots/union.ts"
import type { UndeclaredErrorContext } from "../structure/structure.ts"
import type { NodeKind } from "./implement.ts"
import type { Locale } from "./locale.ts"
import {
	describeActual,
	describeUnwrittenActual,
	writeLine,
	writeMessage
} from "./enWriters.ts"
import { describesData, listsErrors } from "./errorWriters.ts"
import { labelSharedBy } from "./listed.ts"
import { findsOnRead } from "./issueFeatures.ts"
import {
	ArkErrors as BaseArkErrors,
	isCustomIssue,
	labeledIssue,
	labeledPathOf,
	pathOf,
	issueAt,
	messageOf,
	registerErrorLineFormatter,
	TraversalError as BaseTraversalError,
	type ArkIssue,
	type CompactApply,
	type FailureSite,
	type SiteContext,
	type SiteFailureContext,
	type UnionSite
} from "./issues.ts"
import {
	applyRejected,
	raisesLabeled,
	throwOnProblem,
	Traversal,
	type FailHandler,
	type InternalTraversal
} from "./traversal.ts"
import type { ArkEnv } from "./declare.ts"

export { throwOnDefault } from "./issues.ts"

/**
 * Thrown by a Type's `assert`, holding the errors it returned.
 */
interface ThrownErrors extends BaseTraversalError {
	arkErrors: ArkErrors
}

const ThrownErrors: new (errors: ArkErrors) => ThrownErrors =
	BaseTraversalError as never

export { ThrownErrors as TraversalError }

/**
 * A failed check: its context, the data and path it failed at, and the text
 * written for it when its errors are first read.
 */
export type ArkError<code extends ArkErrorCode = ArkErrorCode> =
	ArkErrorsByCode[code]

// a lookup, since TypeScript prints an alias for a distributive conditional as
// what it resolves to: all 18 errors, wherever one is hovered
type ArkErrorsByCode = {
	[code in ArkErrorCode]: mutable<omit<errorCtx<code>, "meta">> &
		WrittenErrorContext<code>
}

export interface WrittenErrorContext<code extends ArkErrorCode>
	extends DerivableErrorContext<code> {
	data: getAssociatedDataForError<code>
	path: PropertyKey[]
	meta?: ArkEnv.meta
}

export declare namespace ArkErrors {
	export type Handler<returns = unknown> = (errors: ArkErrors) => returns
}

// an errors object's own fields, keyed by symbols so neither Object.keys, a
// spread's for...in nor JSON lists them, where defining each as not enumerable
// would cost 40 times what assigning it does on every failure. Not private
// fields, as errors "none" builds its errors without a constructor
const writtenKey = Symbol("written")
const localeKey = Symbol("locale")
const configKey = Symbol("config")

const hasInstance = Function.prototype[Symbol.hasInstance]

/**
 * The errors returned by a Type on invalid input, one issue for each failed
 * check in the order each failed, as a standalone validator returns them.
 */
export class ArkErrors extends BaseArkErrors {
	declare _: ArkError[];
	// how many of the errors added have been written
	declare [writtenKey]: number;
	// the locale they're written in, selected when they're first read
	declare [localeKey]: Locale.Resolved | undefined;
	declare [configKey]: ResolvedConfig

	constructor(config: ResolvedConfig) {
		super()
		this._init(config)
	}

	/** @internal resets the fields its constructor sets */
	_init(config: ResolvedConfig): void {
		this[writtenKey] = 0
		this[localeKey] = undefined
		this[configKey] = config
	}

	// a computed key would keep the class in a bundle that never reads it
	get " arkKind"(): "errors" {
		return "errors"
	}

	/**
	 * Each error, in the order it was added, with its text written in the
	 * locale selected when they were first read.
	 */
	override get issues(): readonly ArkError[] {
		const issues = this._
		if (this[writtenKey] < issues.length) {
			const locale = selectedLocaleOf(this)
			const config = this[configKey]
			while (this[writtenKey] < issues.length)
				writeError(issues[this[writtenKey]++], config, locale)
		}
		return serializableErrors(issues)
	}

	/** @internal the first of issues, its text written alone */
	get _first(): ArkError | undefined {
		return this._firstGrouped()
	}

	/**
	 * @internal the first of issues, found with the rest. Counted as written,
	 * so reading the rest doesn't write it again, which would note the line of
	 * a union listing its errors from the message already written from its own
	 * path, dropping the path before each error's
	 */
	_firstGrouped(): ArkError | undefined {
		const first = this._[0]
		if (first && this[writtenKey] === 0) {
			writeError(first, this[configKey], selectedLocaleOf(this))
			this[writtenKey] = 1
		}
		return first
	}

	/**
	 * A human-readable summary of all errors.
	 */
	override get summary(): string {
		const issues = this.issues
		return summarize(issues, selectedLocaleOf(this))
	}

	/**
	 * Each error's JSON: what it says and where, without its data or any other
	 * value only JavaScript holds, like its Type's `meta`.
	 */
	override toJSON(): JsonArray {
		return this.issues.map(jsonOf)
	}

	/**
	 * The summary in `locale`, or as configured without one.
	 */
	summaryIn(locale?: Locale): string {
		if (locale === undefined) return this.summary
		const resolved = resolveLocale(locale)
		return summarize(
			this._.map(error => writtenIn(error, resolved)),
			resolved
		)
	}

	/** @internal */
	override _merge(merged: BaseArkErrors, prefix: array<PropertyKey>): void {
		if (hasInstance.call(ArkErrors, merged))
			return mergeErrors(this, merged as ArkErrors, prefix)
		const config = this[configKey]
		for (const issue of merged.issues) {
			this._.push(
				issue._m ?
					errorOfIssue(issue._m(prefix) as never, [], config)
				:	errorOfIssue(issue, prefix, config)
			)
		}
	}

	/** @internal the config its errors are written with */
	get _config(): ResolvedConfig {
		return this[configKey]
	}

	/** @internal the errors, without their text */
	get _i(): ArkError[] {
		return this._
	}
}

// a precompiled validator's runtime returns BaseArkErrors directly, so accept
// them on ArkErrors itself while keeping normal prototype checks for subclasses.
// Non-writable so V8 inlines it: as a static method, each instanceof costs ~7 ns more
Object.defineProperty(ArkErrors, Symbol.hasInstance, {
	value(this: Function, value: unknown): boolean {
		return this === ArkErrors ?
				value instanceof BaseArkErrors
			:	hasInstance.call(this, value)
	}
})

// selected once, so each of its errors is written in the same locale, whenever
// it's read, even where a configured locale is a function
const selectedLocaleOf = (errors: ArkErrors): Locale.Resolved =>
	(errors[localeKey] ??=
		renderer?.select(errors[configKey]) ?? errors[configKey].locale)

// compared from the end, where paths usually differ
const pathEquals = (l: array<PropertyKey>, r: array<PropertyKey>) => {
	if (l.length !== r.length) return false
	for (let i = l.length - 1; i >= 0; i--) if (l[i] !== r[i]) return false
	return true
}

// keeps the text a standalone validator wrote; its actual describes its data
export const errorOfIssue = (
	issue: ArkIssue & { message: string },
	prefix: array<PropertyKey>,
	config: ResolvedConfig
): ArkError => {
	const message = issue.message ?? messageOf(issue)
	const meta: ArkEnv.meta = { expected: issue.expected ?? message, message }
	const error = stampError(
		{
			code: issue.code,
			path: [...prefix, ...issue.path],
			data: issue.data,
			meta,
			// a union's issue carries no branch errors
			...(issue.code === "union" && { errors: [] })
		} as never,
		config
	)
	// its line is the validator's, which wrote it as arktype would have
	if (!isCustomIssue(issue)) templated.add(error)
	if (issue._n !== undefined) labeledIssue(error, issue._n)
	return error
}

const mergeErrors = (
	errors: ArkErrors,
	merged: ArkErrors,
	prefix: array<PropertyKey>
): void => {
	// copies are written with the receiving errors' config
	for (const error of merged._i)
		errors._.push(unwrittenError(error, prefix, errors._config))
}

type UnreadErrors = new (
	node: BaseNode,
	data: unknown,
	config: ResolvedConfig,
	ctor: typeof Traversal
) => ArkErrors

// errors whose issues a root's traversal finds in data once they're read. What
// finds them is private, so its node and data are neither listed nor copied
// with the errors' own keys, and each is released once they're found
const UnreadErrors: UnreadErrors = /* @__PURE__ */ (() => {
	class Unread {
		declare [configKey]: ResolvedConfig;
		declare [writtenKey]: number;
		declare [localeKey]: Locale.Resolved | undefined
		#node: BaseNode | undefined
		#data: unknown
		#ctor: typeof Traversal | undefined
		#found: ArkError[] | undefined
		// the first issue, found alone
		#first: ArkError | undefined

		constructor(
			node: BaseNode,
			data: unknown,
			config: ResolvedConfig,
			ctor: typeof Traversal
		) {
			this[configKey] = config
			this.#node = node
			this.#data = data
			this.#ctor = ctor
		}

		get _(): ArkError[] {
			if (!this.#found) {
				const config = this[configKey]
				const ctx = new this.#ctor!(this.#data, config)
				this.#node!.tApply(this.#data, ctx)
				// data a write or a getter has made valid since fails as a whole
				if (!ctx.hasError()) ctx.reject(invalidInput())
				const found = (ctx.fin(null) as ArkErrors)._
				// the first, found alone, is issues[0] as it was written, in the
				// locale the rest are then written in
				const first = this.#first
				const locale = this[localeKey]
				;(this as {} as ArkErrors)._init(config)
				if (first) {
					found[0] = first
					this[writtenKey] = 1
					this[localeKey] = locale
				}
				this.#found = found
				this.#node = this.#ctor = this.#data = undefined
			}
			return this.#found
		}

		// a traversal adds only the errors at its path, unless the rest were found first
		get _first(): ArkError | undefined {
			if (this.#first || this.#found)
				return this.#first ?? (this as {} as ArkErrors)._firstGrouped()
			const node = this.#node!
			const ctx = new (firstPathTraversalOf(this.#ctor!))(
				this.#data,
				this[configKey],
				!revisitsPaths(node)
			)
			node.tApply(this.#data, ctx)
			if (!ctx.hasError()) ctx.reject(invalidInput())
			const errors = ctx.fin(null) as ArkErrors
			if (errors._.includes(skipped)) {
				const found = errors._.filter(error => error !== skipped)
				// the field a getter reads, where a build wrote errors to find
				// their issues once read
				if (findsOnRead) (errors as {} as { _f: ArkError[] })._f = found
				else errors._ = found
			}
			// written in the locale these select, which the rest are written in
			errors[localeKey] = selectedLocaleOf(this as {} as ArkErrors)
			return (this.#first = errors._first)
		}
	}
	// an ArkErrors, built without the fields its constructor sets
	Object.setPrototypeOf(Unread.prototype, ArkErrors.prototype)
	// keeps the prototype's own constructor, still not enumerable
	Unread.prototype.constructor = ArkErrors
	return Unread as never
})()

type FirstPathTraversal = new (
	root: unknown,
	config: ResolvedConfig,
	stopsElsewhere: boolean
) => ArkTraversal

// added in place of an error elsewhere than the first's path, so it's counted
const skipped = {} as ArkError

const firstPathTraversals = new WeakMap<typeof Traversal, FirstPathTraversal>()

// keeps only the errors at its first's path, counting one elsewhere so each
// check stops where it would have
const firstPathTraversalOf = (Base: typeof Traversal): FirstPathTraversal => {
	let FirstPath = firstPathTraversals.get(Base)
	if (FirstPath) return FirstPath
	FirstPath = class extends (Base as typeof ArkTraversal) {
		declare firstPath: PropertyKey[] | undefined
		declare stopsElsewhere: boolean
		declare left: boolean

		constructor(
			root: unknown,
			config: ResolvedConfig,
			stopsElsewhere: boolean
		) {
			super(root, config)
			this.firstPath = undefined
			this.stopsElsewhere = stopsElsewhere
			this.left = false
		}

		// outside the first's path, not counting a union's branches
		private isElsewhere(key?: PropertyKey): boolean {
			const first = this.firstPath
			if (first === undefined || this.branches.length !== 0) return false
			if (this.left) return true
			const path = this.path
			if (first.length !== path.length + (key === undefined ? 0 : 1))
				return true
			if (key !== undefined && first[path.length] !== key) return true
			for (let i = 0; i < path.length; i++)
				if (first[i] !== path[i]) return true
			return false
		}

		private skip(): boolean {
			if (this.stopsElsewhere) this.left = true
			super.addError(skipped)
			return this.left || this.failFast
		}

		override _at(site: FailureSite, data: unknown, key?: PropertyKey): boolean {
			return this.isElsewhere(key) ? this.skip() : super._at(site, data, key)
		}

		override _in(
			apply: CompactApply,
			data: unknown,
			key: PropertyKey,
			missing?: FailureSite,
			value?: unknown
		): boolean | undefined {
			const stops = super._in(apply, data, key, missing, value)
			if (
				this.stopsElsewhere &&
				this.firstPath !== undefined &&
				this.path.length < this.firstPath.length &&
				this.branches.length === 0
			)
				this.left = true
			return stops || this.left
		}

		override failsUnion(
			branches: readonly CompactApply[],
			site: UnionSite,
			data: unknown
		): boolean {
			return this.isElsewhere() ?
					this.skip()
				:	super.failsUnion(branches, site, data)
		}

		override addError<error extends ArkIssue>(error: error): error {
			if (this.branches.length === 0) {
				if (this.firstPath === undefined) this.firstPath = error.path
				else if (this.left || !pathEquals(error.path, this.firstPath)) {
					this.skip()
					return error
				}
			}
			return super.addError(error)
		}
	}
	firstPathTraversals.set(Base, FirstPath)
	return FirstPath
}

const revisitsPathsByNode = new WeakMap<BaseNode, boolean>()

// an index signature checks keys a prop has, as an alias can
const revisitsPaths = (node: BaseNode): boolean => {
	let revisits = revisitsPathsByNode.get(node)
	if (revisits === undefined) {
		revisits =
			node.hasAlias || node.references.some(reference => reference.is("index"))
		revisitsPathsByNode.set(node, revisits)
	}
	return revisits
}

// a root calling no user code and transforming nothing finds its issues once read
export const applyUnread = (
	node: BaseNode,
	data: unknown,
	config: ResolvedConfig,
	onFail: FailHandler | null,
	ctor: typeof Traversal
): unknown => {
	if (node.userCode || node.alters)
		return applyRejected(node, data, config, onFail, ctor)
	const errors = new UnreadErrors(node, data, config, ctor)
	return onFail ? onFail(errors as never) : errors
}

type Keyed = Record<PropertyKey, unknown>

/**
 * the traversal arktype's own compiled code reports to, which fails a site,
 * at a key where it's passed one, and enters a key passed the site it fails
 * where missing and its value. A validator's code passes neither a site nor a
 * value, so its traversal holds none of this; one of these takes a
 * validator's failures too, as each is named apart
 */
export class SiteTraversal extends Traversal implements SiteFailureContext {
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
		missing?: FailureSite,
		value?: unknown
	): boolean | undefined {
		// read first, as only a value that's undefined can be a missing key's,
		// and whether a key any site passes is in data is a call
		if (value === undefined) value = (data as Keyed)[key]
		if (value === undefined && missing && !(key in (data as object)))
			return this._at(missing, data, key)
		this.path.push(key)
		// arktype's own Apply, which reports as a SiteFailureContext takes it
		const continues = apply(value, this as never)
		this.path.pop()
		return !continues
	}
}

const { _at, _in } = SiteTraversal.prototype

// a validator's traversal, which its narrow or morph may pipe to one of
// arktype's nodes, fails what arktype's compiled code does as SiteTraversal
// would, from what every traversal holds, so the runtime needn't carry either
export const siteTraversalOf = (ctx: Traversal): SiteTraversal => {
	if (!("_at" in ctx)) Object.assign(ctx, { _at, _in })
	return ctx as never
}

export class ArkTraversal extends SiteTraversal {
	override createErrors(): ArkErrors {
		return new ArkErrors(this.config)
	}

	override nodeError<input extends NodeErrorContextInput>(
		input: input,
		data: unknown
	): ArkError<input["code"]>
	override nodeError(input: NodeErrorContextInput, data: unknown): ArkError {
		return this.addError(
			errorOfNodeContext(input, pathAt(this.path), data, this.config)
		)
	}

	// builds a site's error as compiled code does
	override _at(site: FailureSite, data: unknown, key?: PropertyKey): boolean {
		// read first, as only a value that's undefined can be a missing key's
		const value = key === undefined ? data : (data as Keyed)[key]
		const missing =
			key !== undefined &&
			value === undefined &&
			site.m &&
			!(key in (data as object))
		const context = (missing ? site.m : site.v) as NodeErrorContextInput
		// a site keeps the builder found for each of its contexts, where finding
		// one by its context is a hashed lookup for every error
		let build = (missing ? site.mb : site.vb) as ErrorBuilder | undefined
		if (build === undefined) {
			build = builderOf(context, this.config)
			if (build) {
				if (missing) site.mb = build
				else site.vb = build
			}
		}
		this.addError(
			errorBuiltBy(
				build,
				context,
				pathAt(this.path, key),
				missing ? data : value,
				this.config
			)
		)
		return this.failFast
	}

	// each branch stops at its first error, which the union's error lists
	override failsUnion(
		branches: readonly CompactApply[],
		site: UnionSite,
		data: unknown
	): boolean {
		const errors = branches.map(branch => {
			this.pushBr()
			branch(data, this as never)
			return this.popBr()!.error as ArkError
		})
		errorFromUnion(this, errors, site.meta as ArkEnv.meta, data)
		return this.failFast
	}

	protected override raise(input: ArkErrorInput): ArkError {
		throwOnProblem(input)
		// read now, so a caller's later change to its input doesn't reach the error
		const errCtx: ArkErrorContextInput =
			typeof input === "object" ?
				input.code ?
					{ ...input }
				:	{ ...input, code: "predicate" }
			:	{ code: "predicate", expected: input }
		if (!("data" in errCtx)) errCtx.data = this.data
		// as a standalone validator raises it: a code of its own expects only
		// what's supplied, not what its rule describes, and meta's text isn't
		// written
		if (
			errCtx.code !== "predicate" &&
			errCtx.expected === undefined &&
			(errCtx as { description?: string }).description === undefined &&
			(errCtx as { morph?: unknown }).morph === undefined
		)
			errCtx.expected = "valid"
		const meta = errCtx.meta
		if (
			meta &&
			(meta.expected !== undefined ||
				meta.actual !== undefined ||
				meta.message !== undefined)
		) {
			const { expected, actual, message, ...rest } = meta
			errCtx.meta = rest
		}
		// what a labeled narrow says its value must be names it by its label,
		// as the error it adds by returning false does
		if (raisesLabeled(this, errCtx as never))
			errCtx.meta = { label: this.lbl, ...errCtx.meta }
		return errorFromContext(this, errCtx)
	}
}

/** adds an error from a context at ctx's path */
export const errorFromContext = (
	ctx: InternalTraversal,
	input: ArkErrorContextInput
): ArkError => ctx.addError(errorOfContext(input, ctx.path, ctx.config))

/** adds a node's error at a path from ctx's, as a site's is added */
export const errorFromNodeAt = (
	ctx: InternalTraversal,
	context: SiteContext,
	relativePath: array<PropertyKey>,
	data: unknown
): ArkError =>
	ctx.addError(
		errorOfNodeContext(
			context as never,
			relativePath.length > 1 ?
				[...ctx.path, ...relativePath]
			:	pathAt(ctx.path, relativePath[0]),
			data,
			ctx.config
		)
	)

/** adds a union's error from each branch's first */
export const errorFromUnion = (
	ctx: InternalTraversal,
	errors: readonly ArkError[],
	meta: ArkEnv.meta,
	data: unknown
): ArkError => {
	const path = pathAt(ctx.path)
	const flat = flattenUnion(errors)
	// a description written for it is its text, as it is a standalone build's
	const isDescribed =
		meta.description !== undefined && meta.keyword === undefined
	const atBases =
		!isDescribed &&
		meta.expected === undefined &&
		meta.message === undefined &&
		flat.length !== 0 &&
		flat.every(e => failsAtBasis(e, path))
	const error = stampError(
		{
			data,
			path,
			code: "union",
			errors: atBases ? [] : flat,
			// what it lists says what it expects, as a validator's, never its actual
			meta:
				atBases && meta.actual !== undefined ? { ...meta, actual: "" } : meta,
			...(isDescribed && { description: meta.description })
		} as never,
		ctx.config
	)
	if (atBases) basesByUnion.set(error, flat)
	return ctx.addError(error)
}

// a union whose every branch fails at its basis, at the union's own path,
// holds no errors and expects what the bases are, as a standalone validator's
const basesByUnion = new WeakMap<ArkError, readonly ArkError[]>()

const failsAtBasis = (error: ArkError, path: array<PropertyKey>): boolean =>
	(error.code === "domain" ||
		error.code === "proto" ||
		error.code === "unit") &&
	pathEquals(error.path, path)

/**
 * Writes an error's `message` in `locale`: what `error.message` would be had
 * that locale been configured, never naming its path, e.g. `must be a string`
 * where its line of `summaryIn(locale)` is `name must be a string`.
 */
export const messageIn = (error: ArkError, locale: Locale): string =>
	writtenIn(error, resolveLocale(locale)).message

// what data a write or a getter has made valid since is rejected with, and
// what errors "none" says: arktype's own text, so it's written after a path
// as a message arktype writes is
const invalidInput = (): CustomErrorInput => ({
	expected: "valid",
	message: "is invalid"
})

const isInvalidInput = (input: ArkErrorContextInput | undefined): boolean =>
	input?.message === "is invalid" && input.expected === "valid"

/** an issue errors "none" added, written in en as saying its data is invalid */
export const invalidError = (
	{ data, path }: ArkIssue,
	config: ResolvedConfig
): ArkError => {
	const error = errorOfContext(
		{ code: "predicate", ...invalidInput(), data } as never,
		path,
		config
	)
	writeError(error, config, renderer?.en ?? config.locale)
	return error
}

const errorOfContext = (
	input: ArkErrorContextInput,
	basePath: array<PropertyKey>,
	config: ResolvedConfig
): ArkError => {
	const { relativePath, prefixPath } = input
	let error: Record<string, unknown>
	// an input without path keys, e.g. a union's, is copied whole
	if (
		!("path" in input) &&
		!("relativePath" in input) &&
		!("prefixPath" in input) &&
		!("propString" in input)
	)
		error = { data: input.data, path: [...basePath], ...input }
	else {
		const path = [...(input.path ?? basePath)]
		if (relativePath) path.push(...relativePath)
		if (prefixPath) path.unshift(...prefixPath)
		error = { data: input.data, path }
		for (const k in input) if (!(k in pathKeys)) error[k] = input[k as never]
		assignSymbols(error, input)
	}
	if (input.code === "union") {
		const flat = flattenUnion(input.errors)
		error.errors =
			!prefixPath && !relativePath ?
				flat
			:	flat.map(e => {
					const copy = unwrittenError(e)
					copy.path = conflatenateAll(prefixPath, e.path, relativePath) as never
					return copy
				})
	}
	return stampError(error as never, config, input)
}

// for...in skips the symbol keys a spread copies
const assignSymbols = (target: object, source: object) => {
	for (const k of Object.getOwnPropertySymbols(source))
		target[k as never] = source[k as never]
}

// flatten union errors to avoid repeating context like "foo must be foo must be"...
const flattenUnion = (errors: readonly ArkError[]): ArkError[] => {
	const flat: ArkError[] = []
	for (const inner of errors) {
		// a union of no branches, like never, is its own error
		if (inner.code !== "union" || !inner.errors.length) appendError(flat, inner)
		else for (const e of inner.errors) appendError(flat, e)
	}
	return flat
}

const appendError = (errors: ArkError[], error: ArkError) => {
	if (!errors.includes(error)) errors.push(error)
}

// a path is the error's own, and its propString is written from it
const pathKeys = {
	data: 1,
	path: 1,
	relativePath: 1,
	prefixPath: 1,
	propString: 1
}

export type ErrorBuilder = (
	context: ArkErrorContextInput,
	path: PropertyKey[],
	data: unknown,
	// the error it assigns them to, stamped already
	error: ArkError
) => ArkError

const errorOfNodeContext = (
	context: ArkErrorContextInput,
	path: PropertyKey[],
	data: unknown,
	config: ResolvedConfig
): ArkError =>
	errorBuiltBy(builderOf(context, config), context, path, data, config)

// a context's error: built by its compiled builder, or spread where there's none
const errorBuiltBy = (
	build: ErrorBuilder | undefined,
	context: ArkErrorContextInput,
	path: PropertyKey[],
	data: unknown,
	config: ResolvedConfig
): ArkError =>
	build ?
		build(context, path, data, stampError(new StampedFirst(), config))
	:	stampError({ data, path, ...context } as never, config)

// the object a compiled builder assigns an error's keys to: plain, as its
// prototype is Object's, but constructed, so each has the same shape when it's
// stamped, whatever its code adds after. Stamping a literal of each code's
// shape instead is a private field defined on as many shapes as there are
// codes, which V8 stops caching past four: about 420 instructions an error,
// against 30. Its two keys are every error's first, in a literal's order
const StampedFirst: new () => ArkError = function (
	this: Record<string, unknown>
) {
	this.data = undefined
	this.path = undefined
} as never
StampedFirst.prototype = Object.prototype

// compiled the first time a context fails, unless its config is jitless
const builderOf = (
	context: ArkErrorContextInput,
	config: ResolvedConfig
): ErrorBuilder | undefined => {
	let build = buildersByContext.get(context)
	if (!build && compileBuilder && !config.jitless) {
		build = compileBuilder(context)
		if (build) buildersByContext.set(context, build)
	}
	return build
}

const buildersByContext = new WeakMap<object, ErrorBuilder>()

let compileBuilder:
	| ((context: ArkErrorContextInput) => ErrorBuilder | undefined)
	| undefined

// set by arktype's compiler; the runtime never generates code
export const registerBuilderCompiler = (
	compile: (context: ArkErrorContextInput) => ErrorBuilder | undefined
): void => {
	compileBuilder = compile
}

// returns o, so a subclass adds its fields to it
class Identity {
	constructor(o: object) {
		return o as never
	}
}

// the context an error was given, whose text a copy keeps, with its config
class Supplied {
	declare readonly config: ResolvedConfig
	declare readonly input: ArkErrorContextInput

	constructor(config: ResolvedConfig, input: ArkErrorContextInput) {
		this.config = config
		this.input = input
	}
}

// a private field, so an error stays a plain object. One field, its config or
// what it was supplied with, since asking an error for a field it lacks costs
// several times what reading the one it has does
class ErrorSource extends Identity {
	#source: ResolvedConfig | Supplied

	constructor(error: ArkError, source: ResolvedConfig | Supplied) {
		super(error)
		this.#source = source
	}

	// a copy holds no source, so reading its config or input throws
	static of(error: ArkError): ResolvedConfig | Supplied {
		return #source in error ? error.#source : throwError(copiedErrorMessage)
	}

	static stamps(issue: ArkIssue): boolean {
		return #source in issue
	}
}

/** an ArkError, not an issue errors "none" writes once read */
export const isArkError = (issue: ArkIssue): issue is ArkError =>
	ErrorSource.stamps(issue)

const configOf = (error: ArkError): ResolvedConfig => {
	const source = ErrorSource.of(error)
	return source instanceof Supplied ? source.config : source
}

const inputOf = (error: ArkError): ArkErrorContextInput | undefined => {
	const source = ErrorSource.of(error)
	return source instanceof Supplied ? source.input : undefined
}

const stampError = (
	error: ArkError,
	config: ResolvedConfig,
	input?: ArkErrorContextInput
): ArkError => {
	new ErrorSource(error, input ? new Supplied(config, input) : config)
	return error
}

export const suppliedText = (
	error: ArkError,
	slot: "expected" | "actual" | "message"
): string | undefined => inputOf(error)?.[slot]

// records the locale an error was written in when it differs from its config's
// (e.g. a function locale or summaryIn), so lineOf(error) formats it identically
const writtenLocales = new WeakMap<ArkError, Locale.Resolved>()

const writtenLocaleOf = (error: ArkError): Locale.Resolved =>
	writtenLocales.get(error) ?? configOf(error).locale

const writeError = (
	error: ArkError,
	config: ResolvedConfig,
	locale: Locale.Resolved
): void => {
	if (locale !== config.locale) writtenLocales.set(error, locale)
	const code = error.code
	if (code === "union") {
		writeAtPaths(error, config, locale)
		writeRelative(error, config, locale)
		return
	}
	// any other holds no errors and no bases, so it's written once at its path:
	// what writeAtPaths does for it, without reading its code again for each
	// question only a union answers
	error.propString ??= stringifyPath(error.path)
	if (renderer && locale !== renderer.en) renderer.write(error, config, locale)
	else writeText(error, config, locale, code)
}

// the line of a union that lists its errors' whole paths, held as a
// standalone validator's issue holds it, where another copy of arktype reads
// it too. Not enumerable, so it's neither copied, printed nor serialized
const noteLine = (error: ArkIssue, line: string): void => {
	Object.defineProperty(error, "_l", { value: line, configurable: true })
}

// a union's or intersection's message is about its own value, and is what a
// form shows beside its path, so the paths of its errors are written from its
// own; the line of one listing its errors, read first, keeps them whole
const writeRelative = (
	error: ArkError,
	config: ResolvedConfig,
	locale: Locale.Resolved
): void => {
	if (error.code !== "union") return
	for (const e of error.errors) writeRelative(e, config, locale)
	if (error.path.length === 0) return
	if (isCustom(error)) {
		// one configured for it was written at its own path from what it expects
		// there; one its errors share, or it was raised with, is kept as well
		if (unconfigured(error, config))
			error.expected = relativeTo(error, config, locale, error.message).expected
		return
	}
	// a union listing its errors names each one's path, so its line is as
	// written. Noted once: written again, as an error two unions list is, its
	// message is already the one written from its own path
	if (
		error.code === "union" &&
		listsErrors(error) &&
		(error as ArkIssue)._l === undefined
	)
		noteLine(error, error.message)
	const relative = relativeTo(error, config, locale)
	error.expected = relative.expected
	error.message = relative.message
}

// a union or intersection written as if the data at its path were validated
// alone. A message is the error's own: a writer configured for it reads its
// path, like one looking up a label, so it's never called for the copy
const relativeTo = (
	error: ArkError,
	config: ResolvedConfig,
	locale: Locale.Resolved,
	message?: string
): ArkError => {
	const relative = unwrittenError(error)
	unprefix(relative, error.path.length)
	if (message !== undefined) relative.message = message
	writeAtPaths(relative, config, locale)
	return relative
}

// errors whose message is one a union or intersection's errors share
const sharing = new WeakSet<ArkError>()

// errors whose message a standalone validator or another copy of arktype
// wrote from what it expected, though it's held as if it were configured
const templated = new WeakSet<ArkError>()

// what tells that of a standalone validator's issue, for what reads one
export { isCustomIssue }

/**
 * @internal marks an error raised with a message arktype wrote from what it
 * expected, like one read from another copy of arktype, so a summary writes it
 * after its path as it does its own, or as `line`, where it listed its
 * errors' whole paths
 */
export const asTemplated = <error extends ArkIssue>(
	error: error,
	line?: string
): error => {
	if (isArkError(error)) {
		templated.add(error)
		if (line !== undefined) noteLine(error, line)
	} else if (line !== undefined) (error as mutable<ArkIssue>)._l = line
	// read what was expected back from a templated message so both dynamic
	// ArkErrors and standalone issues expose the same expected and JSON shape
	if (error.message?.startsWith("must be "))
		error.expected = error.message.slice(8)
	else if (error.message === "is invalid") error.expected = "valid"
	else if (
		!isArkError(error) &&
		error._l === undefined &&
		error.message !== undefined
	) {
		const path = pathOf(error)
		;(error as mutable<ArkIssue>)._l =
			path ? `${path} ${error.message}` : error.message
	}
	return error
}

/**
 * @internal marks an error raised with a message another copy of arktype
 * wrote from what it expected of a value it names by `label`, so a summary
 * writes it as it does its own labeled errors
 */
export const asLabeled = <error extends ArkIssue>(
	error: error,
	label: string
): error => {
	if (isArkError(error)) templated.add(error)
	labeledIssue(error, label)
	const unlabeled = error.message?.slice(label.length + 1)
	if (unlabeled?.startsWith("must be ")) error.expected = unlabeled.slice(8)
	return error
}

/**
 * @internal whether an error's message was configured for its Type or code or
 * supplied where it was raised, rather than written from what it expected
 */
export const isCustom = (error: ArkError): boolean => {
	if (templated.has(error)) return false
	if (sharing.has(error)) return true
	const source = ErrorSource.of(error)
	let config: ResolvedConfig
	if (source instanceof Supplied) {
		if (source.input.message !== undefined) return !isInvalidInput(source.input)
		config = source.config
	} else config = source
	return (
		configuredMessageOf(error) !== undefined ||
		configuresMessage(config, error.code)
	)
}

// whether each config writes every code's message as the default does, found
// once: nearly all do, and reading a code's writers from two configs for each
// line of a summary cost a tenth of writing it
let messagesDefaulted = new WeakMap<ResolvedConfig, boolean>()

// the config last found to, so errors of one config ask nothing of the map
let lastDefaulted: ResolvedConfig | undefined

const defaultsMessages = (config: ResolvedConfig): boolean => {
	if (config === lastDefaulted) return true
	let defaulted = messagesDefaulted.get(config)
	if (defaulted === undefined) {
		defaulted = true
		let k: keyof ResolvedConfig
		for (k in defaultConfig) {
			const writers = defaultConfig[k] as { message?: unknown } | undefined
			if (
				typeof writers === "object" &&
				writers !== null &&
				"message" in writers &&
				(config[k] as { message?: unknown } | undefined)?.message !==
					writers.message
			) {
				defaulted = false
				break
			}
		}
		messagesDefaulted.set(config, defaulted)
	}
	if (defaulted) lastDefaulted = config
	return defaulted
}

const configuresMessage = (
	config: ResolvedConfig,
	code: ArkErrorCode
): boolean =>
	!defaultsMessages(config) &&
	config[code].message !== defaultConfig[code].message

/**
 * @internal whether an issue is an error of this copy of arktype whose message
 * is custom: what a Type's Standard Schema props answer another copy reading
 * one, which can't tell from what this copy's errors keep to themselves
 */
export const isCustomError = (issue: object): boolean =>
	isArkError(issue as ArkIssue) && isCustom(issue as ArkError)

/**
 * @internal the message configured for an error's Type. A message written out
 * for a value says what's wrong with it however it fails, so it's a missing
 * key's too
 */
export const configuredMessageOf = (
	error: ArkError
): MessageConfig<never> | undefined => {
	const message = error.meta?.message
	if (message !== undefined || error.code !== "required") return message
	const ofValue = error.valueMeta?.message
	// a writer reads the context of an error of its value, which a key has none of
	return typeof ofValue === "string" ? ofValue : undefined
}

// a written error's line of a summary: its message alone at the root or
// where it lists its errors, and after its path anywhere else
const errorLineOf = (error: ArkError, locale: Locale.Resolved): string => {
	if (error.path.length === 0) return error.message
	const listed = (error as ArkIssue)._l
	if (listed !== undefined) return listed
	// a labeled message names its value, so the key naming it is left out
	const label = (error as ArkIssue)._n
	if (label !== undefined) return labeledPathOf(error) + error.message
	// a sentence of its own unless it begins as the locale's own would, so
	// one configured as that text reads on from its path
	const custom = isCustom(error) && !beginsAsOwn(error, locale)
	const line = locale.line as LineWriter | undefined
	// en's, also where a locale passed as is lacks one, is written here
	if (line === undefined || line === writeLine)
		return `${error.propString}${custom ? ":" : ""} ${error.message}`
	// a writer's context is the error itself, copied only to say its message
	// is custom, since a copy costs more than the line it's read for
	return line((custom ? { ...error, custom } : error) as never, locale)
}

/**
 * whether an error's message begins as the locale's own would from what it
 * expects, like `must be a string` in en or `muss eine Zeichenkette sein` in
 * de, so a summary writes it after its path as that, though it's custom. en's
 * is what a standalone validator, whose issue holds only its message, tells a
 * custom one by, so a summary reads alike in both
 */
const beginsAsOwn = (error: ArkError, locale: Locale.Resolved): boolean =>
	error.message.startsWith(
		// a standalone runtime's locale is en's info alone
		locale.message === undefined || locale.message === writeMessage ?
			messageOf(error)
			// with no actual, which a custom message may say or not
		:	locale.message({ ...error, actual: "" } as never, locale)
	)

const unprefix = (error: ArkError, depth: number): void => {
	error.path = error.path.slice(depth)
	if (error.code === "union") for (const e of error.errors) unprefix(e, depth)
}

// each error's text, any path in it written whole
const writeAtPaths = (
	error: ArkError,
	config: ResolvedConfig,
	locale: Locale.Resolved
): void => {
	if (locale !== config.locale) writtenLocales.set(error, locale)
	error.propString ??= stringifyPath(error.path)
	const bases = basesByUnion.get(error)
	if (bases && error.expected === undefined) {
		const expected: string[] = []
		for (const e of bases) {
			writeError(e, config, locale)
			if (!expected.includes(e.expected)) expected.push(e.expected)
		}
		// as the locale lists alternatives, which for en is as describeBranches
		// does and a standalone validator writes
		error.expected = locale.list(expected, "or")
	}
	if (error.code === "union") {
		for (const e of error.errors) {
			// usually at its own path, whose string is then written once
			if (pathEquals(e.path, error.path)) e.propString ??= error.propString
			writeAtPaths(e, config, locale)
		}
		// a message configured for each of its errors is its own
		const shared =
			error.message === undefined &&
			unconfigured(error, config) &&
			sharedMessageOf(error.errors, locale)
		if (shared) {
			error.message = shared
			sharing.add(error)
		}
		// a message configured for one below the root is written once, at its
		// whole path, from what it expects of the value there
		if (
			error.path.length !== 0 &&
			error.expected === undefined &&
			error.message === undefined &&
			!unconfigured(error, config)
		)
			error.expected = relativeTo(error, config, locale, "").expected
	}
	if (renderer && locale !== renderer.en) renderer.write(error, config, locale)
	else writeText(error, config, locale)
}

const unconfigured = (error: ArkError, config: ResolvedConfig): boolean => {
	const message = configuredMessageOf(error)
	return message === undefined ?
			!configuresMessage(config, error.code)
		:	message === defaultConfig[error.code].message
}

// the message each error was configured or supplied with, if they agree. One
// that begins as the locale's own would is listed with what the others
// expect, as a validator's is, whose issue holds only its message
const sharedMessageOf = (
	errors: readonly ArkError[],
	locale: Locale.Resolved
): string | undefined => {
	let shared: string | undefined
	for (const e of errors) {
		const text =
			(
				configuredMessageOf(e) !== undefined ||
				suppliedText(e, "message") !== undefined
			) ?
				beginsAsOwn(e, locale) ? undefined
				:	e.message
			: e.code === "union" ? sharedMessageOf(e.errors, locale)
			: undefined
		if (text === undefined || (shared !== undefined && text !== shared)) return
		shared = text
	}
	return shared
}

export const writeText = (
	error: ArkError,
	config: ResolvedConfig,
	locale: Locale.Resolved,
	// read once by a caller that has, as an error's shape differs by its code,
	// so no read of one is cached where errors of many codes are written
	code: ArkErrorCode = error.code
): void => {
	const writers = config[code]
	const meta = error.meta
	// each slot is read once and kept, where reading back what was just
	// written is another read no error's shape caches
	let expected: string | undefined = error.expected
	if (expected === undefined || expected === null) {
		const configured = meta?.expected ?? writers.expected
		error.expected = expected =
			typeof configured === "function" ?
				configured(error as never, locale)
			:	configured
	}
	// whether its actual was described here, which en's message then leaves out
	let described = false
	if (error.actual === undefined || error.actual === null) {
		const configured: string | ActualWriter<never> =
			meta?.actual ?? writers.actual
		if (typeof configured === "string") error.actual = configured
		else {
			if (describesData(configured)) {
				describeUnwrittenActual(error)
				described = true
			}
			error.actual = configured(error.data as never, error as never, locale)
		}
	}
	if (error.message === undefined || error.message === null) {
		const message =
			meta?.message ??
			(code === "required" ? configuredMessageOf(error) : undefined) ??
			writers.message
		error.message =
			// en's own, written as it writes one whose actual describes its data
			message === writeMessage && described ? `must be ${expected}`
			: typeof message === "function" ? message(error as never, locale)
			: message
		if (message === defaultConfig[code].message) labelMessage(error, locale)
	}
}

/**
 * @internal names the value in a message its code's default writer wrote, by
 * the label its Type was configured with, as `Unit price must be positive`. A
 * message configured or supplied says what it says, so it's never labeled
 */
export const labelMessage = (error: ArkError, locale: Locale.Info): void => {
	const label = labelOfValue(error)
	if (label === undefined) return
	error.message = `${locale.verbatim(label)} ${error.message}`
	labeledIssue(error, label)
}

/**
 * the label of the value an error is about: a missing key's value's, or the
 * label each base of a union failing at them shares, as a standalone
 * validator's union of them can read only that. A union listing its errors
 * names each by its own label, and an undeclared key or the key a
 * discriminant misses isn't the value its meta is about
 */
const labelOfValue = (error: ArkError): string | undefined => {
	switch (error.code) {
		case "required":
			return error.valueMeta.label
		case "undeclared":
			return
		case "discriminant":
			return error.onKey ? undefined : error.meta?.label
		case "union": {
			if (listsErrors(error)) return
			const bases = basesByUnion.get(error)
			return bases ? labelSharedBy(bases) : error.meta?.label
		}
		default:
			return error.meta?.label
	}
}

/**
 * an error's actual, noting one that describes its data, which en's messages
 * leave out, so a configured writer still reads what the data was
 */
export const writeActual = (
	error: ArkError,
	actual: string | ActualWriter<never>,
	locale: Locale.Info
): string => {
	if (typeof actual === "string") return actual
	if (describesData(actual)) describeActual(error)
	return actual(error.data as never, error as never, locale)
}

// registered by arktype/i18n
interface LocaleRenderer {
	/** the locale errors.ts writes itself */
	readonly en: Locale.Resolved
	/** the locale a configured locale resolves to, en if it's a function */
	configure: (
		locale: ArkSchemaConfig["locale"],
		base: ResolvedConfig
	) => Locale.Resolved
	/** the locale errors are written in when they are first read */
	select: (config: ResolvedConfig) => Locale.Resolved
	write: (
		error: ArkError,
		config: ResolvedConfig,
		locale: Locale.Resolved
	) => void
	/** a locale completed from en where it lacks a part */
	normalize: (locale: Locale) => Locale.Resolved
}

let renderer: LocaleRenderer | undefined

export const registerLocaleRenderer = (registered: LocaleRenderer): void => {
	renderer = registered
}

/** the default config, once one has resolved */
export let defaultConfig: ResolvedConfig

export const configureLocale = (
	locale: ArkSchemaConfig["locale"],
	base: ResolvedConfig
): Locale.Resolved => {
	if (defaultConfig !== base) {
		defaultConfig = base
		// what each config was compared with
		messagesDefaulted = new WeakMap()
		lastDefaulted = undefined
	}
	return (
		renderer ? renderer.configure(locale, base)
		: locale === undefined || locale === base.locale ? base.locale
		: throwError(unrenderedLocaleMessage)
	)
}

// a locale passed to write errors in, which without arktype/i18n is only
// written in if it's the configured one, as writtenIn checks
const resolveLocale = (locale: Locale): Locale.Resolved => {
	if (typeof locale !== "object" || locale === null || Array.isArray(locale))
		throwParseError(writeInvalidLocaleObjectMessage(locale))
	return renderer ? renderer.normalize(locale) : (locale as Locale.Resolved)
}

export const writeInvalidLocaleObjectMessage = (locale: unknown): string =>
	`Expected a Locale object like \`de\` from "arktype/locales/de" (was ${printable(locale)})`

const writtenIn = (error: ArkError, locale: Locale.Resolved): ArkError => {
	const config = configOf(error)
	if (!renderer && locale !== config.locale)
		return throwError(unrenderedLocaleMessage)
	const copy = unwrittenError(error)
	writeError(copy, config, locale)
	return copy
}

export const unwrittenError = (
	error: ArkError,
	prefix?: array<PropertyKey>,
	config: ResolvedConfig = configOf(error)
): ArkError => {
	const input = inputOf(error)
	const copy: Record<string, unknown> = {}
	for (const k in error) {
		if (!(k in writtenKeys)) copy[k] = error[k as never]
		else if (k !== "propString" && input?.[k as never] !== undefined)
			copy[k] = input[k as never]
	}
	// only an input has symbol keys, which for...in skips
	if (input) assignSymbols(copy, input)
	copy.path = prefix ? [...prefix, ...error.path] : [...error.path]
	if (error.code === "union")
		copy.errors = error.errors.map(e => unwrittenError(e, prefix, config))
	const stamped = stampError(copy as never, config, input)
	if (templated.has(error)) {
		templated.add(stamped)
		// a line another validator listed whole paths in holds at the same path
		const line = (error as ArkIssue)._l
		if (!prefix && line !== undefined) noteLine(stamped, line)
	}
	const bases = basesByUnion.get(error)
	if (bases) {
		basesByUnion.set(
			stamped,
			bases.map(e => unwrittenError(e, prefix, config))
		)
	}
	return stamped
}

const writtenKeys = {
	propString: 1,
	expected: 1,
	actual: 1,
	message: 1
}

// each error's line: its message after its path, a custom one after a colon
const summarize = (
	issues: readonly ArkError[],
	locale: Locale.Resolved
): string => {
	let result = ""
	for (let i = 0; i < issues.length; i++)
		result += (i ? "\n" : "") + errorLineOf(issues[i], locale)
	return result
}

// what an error says and where, as JSON: the same wire shape a standalone
// validator writes. Never its data or actual, which may be private (as a
// password is), nor internal or non-JSON fields like meta, rule, unit, proto,
// or cause, any of which may be a bigint, a symbol, a function, or circular.
const jsonOf = (error: ArkError): JsonObject => ({
	code: error.code,
	path: error.path.map(jsonKeyOf),
	...(error.expected !== undefined && { expected: error.expected }),
	message: error.message,
	...(error.code === "union" && error.errors.length > 0 ?
		{ errors: error.errors.map(jsonOf) }
	:	{})
})

// as String writes it, as propString and a standalone validator's JSON do
const jsonKeyOf = (k: PropertyKey) => (typeof k === "symbol" ? String(k) : k)

const errorsToJson: PropertyDescriptor & ThisType<readonly ArkError[]> = {
	value() {
		return this.map(jsonOf)
	},
	writable: true,
	configurable: true
}

type ErrorsWithToJson = ArkError[] & { toJSON?: () => JsonArray }

/** @internal attaches non-enumerable toJSON to an errors' issues array */
export const serializableErrors = (issues: ArkError[]): readonly ArkError[] =>
	(issues as ErrorsWithToJson).toJSON ?
		issues
	:	Object.defineProperty(issues, "toJSON", errorsToJson)

/**
 * The first of `errors.issues`, its text written without the rest's.
 */
export const firstIssue = (errors: ArkErrors): ArkError =>
	errors._first ?? errors.issues[0]

registerErrorLineFormatter(error =>
	isArkError(error as ArkIssue) ?
		errorLineOf(error as ArkError, writtenLocaleOf(error as ArkError))
	:	undefined
)

export { lineOf, type ReadableIssue } from "./issues.ts"

// read from errorReaders.ts, which arktype/runtime exports alone
export {
	byAncestorPath,
	byPath,
	flatByPath,
	flatMessagesByPath,
	type PathedIssue,
	type ReadableErrors
} from "./errorReaders.ts"

export interface DerivableErrorContext<
	code extends ArkErrorCode = ArkErrorCode
> {
	expected: string
	actual: string
	/** what failed, without the path it failed at, which a summary writes */
	message: string
	data: getAssociatedDataForError<code>
	path: array<PropertyKey>
	propString: string
}

export type DerivableErrorContextInput<
	code extends ArkErrorCode = ArkErrorCode
> = Partial<DerivableErrorContext<code>> &
	propwiseXor<
		{ path?: array<PropertyKey> },
		{ relativePath?: array<PropertyKey>; prefixPath?: array<PropertyKey> }
	>

export interface ErrorContextsByCode extends NodeErrorContextsByKind {
	undeclared: UndeclaredErrorContext
	discriminant: DiscriminantErrorContext
}

// every key is a string already: intersected, the union is this alias's own, so
// an error is shown as ArkError<ArkErrorCode>, not <keyof ErrorContextsByCode>
export type ArkErrorCode = keyof ErrorContextsByCode & string

type ArkErrorContextInputsByCode = {
	[code in ArkErrorCode]: errorCtx<code> & DerivableErrorContextInput<code>
}

export type ArkErrorContextInput<code extends ArkErrorCode = ArkErrorCode> =
	merge<ArkErrorContextInputsByCode[code], { meta?: ArkEnv.meta }>

export type NodeErrorContextInput<code extends ArkErrorCode = ArkErrorCode> =
	ArkErrorContextInputsByCode[code] & { meta: ArkEnv.meta }

// no context reaches the slot its writer computes or one that could read it
export type MessageContext<code extends ArkErrorCode = ArkErrorCode> =
	code extends unknown ? omit<ArkError<code>, "message"> & unstringifiable
	:	never

// shadows Object's toString and toLocaleString, which print [object Object]
type unstringifiable = {
	toString(never: never): string
	toLocaleString(never: never): string
}

/** an error as its line of a summary is written, once its message is */
export type LineContext<code extends ArkErrorCode = ArkErrorCode> =
	code extends unknown ?
		ArkError<code> & {
			/** `true` where its message was configured or supplied, not written from what it expected */
			readonly custom?: true
		} & unstringifiable
	:	never

export type LineWriter = (error: LineContext, locale: Locale.Info) => string

export type CustomErrorInput = show<
	// ensure a custom error can be discriminated on the lack of a code. meta
	// as a coded input takes it, which its writers are typed by once a code's
	// absence discriminates the input to this one
	{ code?: undefined; meta?: ArkEnv.meta } & DerivableErrorContextInput
>

/**
 * the parts of an error `ctx.reject` takes. A string isn't one: it would be
 * what the value must be, which `ctx.mustBe` takes, though it reads as the
 * sentence a `message` is
 */
export type RejectInput = ArkErrorContextInput | CustomErrorInput

export type ArkErrorInput = string | RejectInput

export type MessageConfig<code extends ArkErrorCode = ArkErrorCode> =
	| string
	| MessageWriter<code>

export type MessageWriter<code extends ArkErrorCode = ArkErrorCode> = (
	error: MessageContext<code>,
	locale: Locale.Info
) => string

export type getAssociatedDataForError<code extends ArkErrorCode> =
	code extends NodeKind ? Prerequisite<code> : unknown

export type ExpectedConfig<code extends ArkErrorCode = ArkErrorCode> =
	| string
	| ExpectedWriter<code>

export type ExpectedContext<code extends ArkErrorCode = ArkErrorCode> =
	code extends unknown ?
		omit<ArkError<code>, "expected" | "actual" | "message"> & unstringifiable
	:	never

export type ExpectedWriter<code extends ArkErrorCode = ArkErrorCode> = (
	error: ExpectedContext<code>,
	locale: Locale.Info
) => string

export type ActualConfig<code extends ArkErrorCode = ArkErrorCode> =
	| string
	| ActualWriter<code>

export type ActualContext<code extends ArkErrorCode = ArkErrorCode> =
	code extends unknown ?
		omit<ArkError<code>, "expected" | "description" | "actual" | "message"> &
			unstringifiable
	:	never

export type ActualWriter<code extends ArkErrorCode = ArkErrorCode> = (
	data: getAssociatedDataForError<code>,
	error: ActualContext<code>,
	locale: Locale.Info
) => string

export const configureAfterTypeMessage =
	"configure() must be called before any Type is created, so import the module calling it before any module that creates one"

export const writeConfigureAfterTypeMessage = (firstType?: string): string =>
	firstType ?
		`${configureAfterTypeMessage} (first Type created: ${firstType})`
	:	configureAfterTypeMessage

export const unrenderedLocaleMessage =
	'import "arktype/i18n" to write errors in locales other than en'

export const copiedErrorMessage =
	"Only errors validation returned can be written again, not copies"
