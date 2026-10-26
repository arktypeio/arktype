import {
	appendStringifiedKey,
	conflatenateAll,
	printSymbol,
	stringifyPath,
	throwError,
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
	errorContext
} from "../kinds.ts"
import type { BaseNode } from "../node.ts"
import type { DiscriminantErrorContext } from "../roots/union.ts"
import type { UndeclaredErrorContext } from "../structure/structure.ts"
import type { NodeKind } from "./implement.ts"
import type { Locale } from "./locale.ts"
import { writeMessage } from "./errorWriters.ts"
import {
	ArkErrors as BaseArkErrors,
	messageOf,
	problemOf,
	TraversalError as BaseTraversalError,
	type ArkIssue,
	type CompactApply,
	type FailureSite,
	type UnionSite
} from "./issues.ts"
import {
	applyRejected,
	Traversal,
	type FailHandler,
	type InternalTraversal
} from "./traversal.ts"

export { throwOnDefault } from "./issues.ts"

/**
 * Thrown by a Type's `assert`, holding the errors it returned.
 */
export interface TraversalError extends BaseTraversalError {
	arkErrors: ArkErrors
}

export const TraversalError: new (errors: ArkErrors) => TraversalError =
	BaseTraversalError as never

/**
 * A failed check: its context, the data and path it failed at, and the text
 * written for it when its errors are first read.
 */
export type ArkError<code extends ArkErrorCode = ArkErrorCode> =
	code extends unknown ?
		mutable<omit<errorContext<code>, "meta">> & WrittenErrorContext<code>
	:	never

export interface WrittenErrorContext<code extends ArkErrorCode>
	extends DerivableErrorContext<code> {
	data: getAssociatedDataForError<code>
	path: PropertyKey[]
	meta?: ArkEnv.meta
}

export declare namespace ArkErrors {
	export type Handler<returns = unknown> = (errors: ArkErrors) => returns
}

// paths are scanned rather than indexed below this many
const maxScannedLength = 8

/**
 * The errors returned by a Type on invalid input.
 *
 * Subsequent errors added at an existing path are merged into an
 * intersection error.
 */
export class ArkErrors extends BaseArkErrors {
	// grouped by path only when read
	declare _: ArkError[]
	declare private grouped: ArkError[]
	declare private groupedCount: number
	// errors by the string of their path, once there are enough to index
	declare private index: Record<string, ArkError> | undefined
	declare private written: boolean
	declare private locale: Locale | undefined
	declare private config: ResolvedConfig

	constructor(config: ResolvedConfig) {
		super()
		this._init(config)
	}

	/** @internal resets the fields its constructor sets */
	_init(config: ResolvedConfig): void {
		this.grouped = []
		this.groupedCount = 0
		this.index = undefined
		this.written = true
		this.locale = undefined
		this.config = config
	}

	// arkKind's value, since a computed key keeps the class in a bundle
	// that never reads it
	get " arkKind"(): "errors" {
		return "errors"
	}

	/**
	 * One error per path, in the order each path first failed, each with its
	 * text written in the locale selected when they were first read.
	 */
	override get issues(): readonly ArkError[] {
		const issues = this._i
		if (this.written) return issues
		this.written = true
		const locale = this.selectedLocale
		for (const error of issues) writeError(error, this.config, locale)
		return issues
	}

	/** @internal the first of issues, its text written alone */
	get _first(): ArkError | undefined {
		return this._firstGrouped()
	}

	/** @internal the first of issues, found with the rest */
	_firstGrouped(): ArkError | undefined {
		const added = this._
		const first = added[0]
		// the first added is the first grouped, unless another shares its path,
		// so the rest are grouped only then
		if (this.groupedCount === 0 && first && isFirstAloneAtPath(added)) {
			writeError(first, this.config, this.selectedLocale)
			return first
		}
		const grouped = this._i[0]
		if (grouped && !this.written)
			writeError(grouped, this.config, this.selectedLocale)
		return grouped
	}

	private get selectedLocale(): Locale {
		return (this.locale ??= renderer?.select(this.config) ?? this.config.locale)
	}

	/**
	 * A human-readable summary of all errors.
	 */
	override get summary(): string {
		return summarize(this.issues)
	}

	/** @internal a thrown error's message, listing each error apart */
	get _t(): string {
		return writeTraversalMessage(this.issues)
	}

	override toJSON(): JsonArray {
		return this.issues.map(jsonOf)
	}

	/**
	 * The summary in `locale`, or as configured without one.
	 */
	toLocaleString(locale?: Locale): string {
		// Array.prototype.toLocaleString passes each element a tag
		if (!isLocale(locale)) return this.summary
		return summarize(this._i.map(error => writtenIn(error, locale)))
	}

	/** @internal */
	override _merge(merged: BaseArkErrors, prefix: array<PropertyKey>): void {
		if (merged instanceof ArkErrors) return mergeErrors(this, merged, prefix)
		for (const issue of merged.issues)
			this._.push(errorOfIssue(issue, prefix, this.config))
	}

	/** @internal the config its errors are written with */
	get _config(): ResolvedConfig {
		return this.config
	}

	/** @internal the errors grouped by path, without their text */
	get _i(): ArkError[] {
		const added = this._
		if (this.groupedCount === added.length) return this.grouped
		this.written = false
		while (this.groupedCount < added.length)
			this.group(added[this.groupedCount++])
		return this.grouped
	}

	private group(error: ArkError): void {
		const existing = this.errorAt(error)
		if (!existing) {
			if (this.grouped.length) this.grouped.push(error)
			else this.grouped = [error]
			if (this.index) this.index[pathKeyOf(error)] = error
			return
		}
		// If the existing error is an error for a value constrained to "never",
		// then we don't want to intersect the error messages.
		if (existing.code === "union" && existing.errors.length === 0) return

		// If the new error is an error for a value constrained to "never",
		// then we want to override any existing errors.
		const errorIntersection: ArkError =
			error.code === "union" && error.errors.length === 0 ?
				error
			:	stampError(
					{
						data: existing.data,
						// an error added with its own path isn't at ctx.path
						path: [...existing.path],
						code: "intersection",
						errors: [
							...(existing.code === "intersection" ?
								existing.errors
							:	[existing]),
							...(error.code === "intersection" ? error.errors : [error])
						]
					} as never,
					this.config
				)
		const grouped = this.grouped
		grouped[grouped.indexOf(existing)] = errorIntersection
		if (this.index) this.index[pathKeyOf(error)] = errorIntersection
	}

	private errorAt(error: ArkError): ArkError | undefined {
		const { grouped } = this
		const { path } = error
		if (this.index || grouped.length >= maxScannedLength) {
			this.index ??= indexByPath(grouped)
			const indexed = this.index[pathKeyOf(error)]
			// distinct symbols can print alike, so an indexed error may be elsewhere
			if (!indexed || pathEquals(indexed.path, path)) return indexed
		}
		// an error at an existing path usually follows the last one added
		for (let i = grouped.length - 1; i >= 0; i--)
			if (pathEquals(grouped[i].path, path)) return grouped[i]
	}
}

// a path's string is its error's propString, written once
const pathKeyOf = (error: ArkError): string =>
	(error.propString ??= stringifyPath(error.path))

const indexByPath = (issues: ArkError[]): Record<string, ArkError> => {
	const byPath: Record<string, ArkError> = Object.create(null)
	for (const error of issues) byPath[pathKeyOf(error)] = error
	return byPath
}

const isFirstAloneAtPath = (errors: readonly ArkError[]) => {
	for (let i = 1; i < errors.length; i++)
		if (pathEquals(errors[i].path, errors[0].path)) return false
	return true
}

// compared from the end, where paths usually differ
const pathEquals = (l: array<PropertyKey>, r: array<PropertyKey>) => {
	if (l.length !== r.length) return false
	for (let i = l.length - 1; i >= 0; i--) if (l[i] !== r[i]) return false
	return true
}

// keeps the text a standalone validator wrote
export const errorOfIssue = (
	issue: ArkIssue & { message: string },
	prefix: array<PropertyKey>,
	config: ResolvedConfig
): ArkError => {
	const problem = problemOf(issue)
	const meta: ArkEnv.meta = {
		expected: issue.expected ?? problem,
		actual: "",
		problem,
		message: issue.message === messageOf(issue) ? writeMessage : issue.message
	}
	return stampError(
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

// errors whose issues a root's traversal finds in data once they're read
const UnreadErrors: UnreadErrors = /* @__PURE__ */ (() => {
	class Unread {
		declare config: ResolvedConfig
		declare _node: BaseNode
		// the data, and once read, the issues found, named as a standalone
		// Unread's are
		declare _d: unknown
		declare _ctor: typeof Traversal
		declare _f?: ArkError[]
		// the first issue, found alone
		declare _1?: ArkError | undefined

		constructor(
			node: BaseNode,
			data: unknown,
			config: ResolvedConfig,
			ctor: typeof Traversal
		) {
			this.config = config
			this._node = node
			this._d = data
			this._ctor = ctor
		}

		get _(): ArkError[] {
			if (!this._f) {
				const ctx = new this._ctor(this._d, this.config)
				this._node.traverseApply(this._d, ctx)
				// data a write or a getter has made valid since fails as a whole
				if (!ctx.hasError())
					ctx.reject({ expected: "valid", problem: "is invalid" })
				const errors = this as {} as ArkErrors
				// an ArkErrors holding what its traversal found
				errors._init(this.config)
				this._f = (ctx.finalize(null) as ArkErrors)._
			}
			return this._f
		}

		// found by a traversal adding only the errors at its path, unless the
		// rest were found first
		get _first(): ArkError | undefined {
			if (this._1 || this._f)
				return this._1 ?? (this as {} as ArkErrors)._firstGrouped()
			const node = this._node
			// an index signature checks keys a prop has, as an alias can
			const revisitsPaths =
				node.includesAlias || node.selectReferences(isIndex).length !== 0
			const ctx = new (firstPathTraversalOf(this._ctor))(
				this._d,
				this.config,
				!revisitsPaths
			)
			node.traverseApply(this._d, ctx)
			if (!ctx.hasError())
				ctx.reject({ expected: "valid", problem: "is invalid" })
			return (this._1 = (ctx.finalize(null) as ArkErrors)._first)
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

const firstPathTraversals = new WeakMap<typeof Traversal, FirstPathTraversal>()

// a traversal keeping only the errors at the path of its first, as firstIssue
// groups them, so it builds no others. Each counts as added, so traversal
// stops where it would have, or, where no node revisits a path, at the first
// error elsewhere after it
const firstPathTraversalOf = (Base: typeof Traversal): FirstPathTraversal => {
	let FirstPath = firstPathTraversals.get(Base)
	if (FirstPath) return FirstPath
	FirstPath = class extends (Base as typeof ArkTraversal) {
		declare firstPath: PropertyKey[] | undefined
		declare elsewhere: number
		declare stopsElsewhere: boolean
		declare left: boolean

		constructor(
			root: unknown,
			config: ResolvedConfig,
			stopsElsewhere: boolean
		) {
			super(root, config)
			this.firstPath = undefined
			this.elsewhere = 0
			this.stopsElsewhere = stopsElsewhere
			this.left = false
		}

		override get failFast(): boolean {
			return this.left || super.failFast
		}

		override get currentErrorCount(): number {
			return (
				super.currentErrorCount +
				(this.branches.length === 0 ? this.elsewhere : 0)
			)
		}

		// whether an error at this path, or a key below it, is elsewhere than
		// the first, outside a union's branches, which build its error
		private isElsewhere(key?: PropertyKey): boolean {
			const first = this.firstPath
			if (first === undefined || this.branches.length !== 0) return false
			const path = this.path
			if (first.length !== path.length + (key === undefined ? 0 : 1))
				return true
			if (key !== undefined && first[path.length] !== key) return true
			for (let i = 0; i < path.length; i++)
				if (first[i] !== path[i]) return true
			return false
		}

		private failElsewhere(): boolean {
			this.elsewhere++
			if (this.stopsElsewhere) this.left = true
			return this.failFast
		}

		override _at(site: FailureSite, data: unknown, key?: PropertyKey): boolean {
			return this.isElsewhere(key) ?
					this.failElsewhere()
				:	super._at(site, data, key)
		}

		override failsUnion(
			branches: readonly CompactApply[],
			site: UnionSite,
			data: unknown
		): boolean {
			return this.isElsewhere() ?
					this.failElsewhere()
				:	super.failsUnion(branches, site, data)
		}

		override addError<error extends ArkIssue>(error: error): error {
			if (this.branches.length === 0) {
				if (this.firstPath === undefined) this.firstPath = error.path
				else if (!pathEquals(error.path, this.firstPath)) {
					this.failElsewhere()
					return error
				}
			}
			return super.addError(error)
		}
	}
	firstPathTraversals.set(Base, FirstPath)
	return FirstPath
}

const isIndex = (node: BaseNode) => node.hasKind("index")

// a root calling no user code and transforming nothing finds its issues once
// they're read
export const applyUnread = (
	node: BaseNode,
	data: unknown,
	config: ResolvedConfig,
	onFail: FailHandler | null,
	ctor: typeof Traversal
): unknown => {
	if (node.hasUserCode || node.hasTransform)
		return applyRejected(node, data, config, onFail, ctor)
	const errors = new UnreadErrors(node, data, config, ctor)
	return onFail ? onFail(errors as never) : errors
}

type Keyed = Record<PropertyKey, unknown>

// arktype's traversal, writing errors from node contexts
export class ArkTraversal extends Traversal {
	override createErrors(): ArkErrors {
		return new ArkErrors(this.config)
	}

	override errorFromNode<input extends NodeErrorContextInput>(
		input: input,
		data: unknown
	): ArkError<input["code"]>
	override errorFromNode(
		input: NodeErrorContextInput,
		data: unknown
	): ArkError {
		return this.addError(
			errorOfNodeContext(input, this.path.slice(), data, this.config)
		)
	}

	// builds a site's error as compiled code does
	override _at(site: FailureSite, data: unknown, key?: PropertyKey): boolean {
		const missing = key !== undefined && site.m && !(key in (data as object))
		this.addError(
			errorOfNodeContext(
				(missing ? site.m : site.v) as NodeErrorContextInput,
				key === undefined ? this.path.slice() : [...this.path, key],
				key === undefined || missing ? data : (data as Keyed)[key],
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
			this.pushBranch()
			branch(data, this)
			return this.popBranch()!.error as ArkError
		})
		errorFromUnion(this, errors, site.meta as ArkEnv.meta, data)
		return this.failFast
	}

	protected override raise(input: ArkErrorInput): ArkError {
		// an error's supplied text is read from its input, so a caller's
		// later change to an object it passed must not reach it
		const errCtx: ArkErrorContextInput =
			typeof input === "object" ?
				input.code ?
					{ ...input }
				:	{ ...input, code: "predicate" }
			:	{ code: "predicate", expected: input }
		if (!("data" in errCtx)) errCtx.data = this.data
		return errorFromContext(this, errCtx)
	}
}

/** adds an error from a context at ctx's path */
export const errorFromContext = (
	ctx: InternalTraversal,
	input: ArkErrorContextInput
): ArkError => ctx.addError(errorOfContext(input, ctx.path, ctx.config))

/** adds a union's error from each branch's first */
export const errorFromUnion = (
	ctx: InternalTraversal,
	errors: readonly ArkError[],
	meta: ArkEnv.meta,
	data: unknown
): ArkError =>
	ctx.addError(
		stampError(
			{
				data,
				path: ctx.path.slice(),
				code: "union",
				errors: flattenUnion(errors),
				meta,
				// a description written for it is its text, as it is a standalone build's
				...(meta.description !== undefined &&
					meta.keyword === undefined && { description: meta.description })
			} as never,
			ctx.config
		)
	)

/**
 * Writes an error's text in `locale`, as its errors would be written if it
 * were configured.
 */
export const messageIn = (error: ArkError, locale: Locale): string =>
	writtenIn(error, locale).message

/** errors as Standard Schema issues, whose consumers prefix their path */
export const standardIssuesOf = (errors: ArkErrors): readonly ArkError[] =>
	errors.issues.map(error =>
		error.path.length === 0 ?
			error
		:	{ ...error, message: messageFromPath(error) }
	)

// an error's message, as if the data at its path were validated alone
const messageFromPath = (error: ArkError): string => {
	const config = ErrorSource.configOf(error)
	const copy = unwrittenError(error)
	unprefix(copy, error.path.length)
	writeError(copy, config, renderer?.select(config) ?? config.locale)
	return copy.message
}

const unprefix = (error: ArkError, depth: number): void => {
	error.path = error.path.slice(depth)
	if (error.code === "union" || error.code === "intersection")
		for (const e of error.errors) unprefix(e, depth)
}

/** an issue errors "none" added, written in en as saying its data is invalid */
export const invalidError = (
	{ data, path }: ArkIssue,
	config: ResolvedConfig
): ArkError => {
	const error = errorOfContext(
		{ code: "predicate", expected: "valid", problem: "is invalid", data },
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
		if (inner.code !== "union") appendError(flat, inner)
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
	data: unknown
) => ArkError

const errorOfNodeContext = (
	context: ArkErrorContextInput,
	path: PropertyKey[],
	data: unknown,
	config: ResolvedConfig
): ArkError => {
	let build = buildersByContext.get(context)
	if (!build && compileBuilder && !config.jitless) {
		build = compileBuilder(context)
		if (build) buildersByContext.set(context, build)
	}
	return stampError(
		build ? build(context, path, data) : ({ data, path, ...context } as never),
		config
	)
}

// builders by context, shared by a node's errors
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

// a private field, so an error stays a plain object
class ErrorSource extends Identity {
	#config: ResolvedConfig

	constructor(error: ArkError, config: ResolvedConfig) {
		super(error)
		this.#config = config
	}

	static configOf(error: ArkError): ResolvedConfig {
		return #config in error ? error.#config : throwError(copiedErrorMessage)
	}

	static stamps(issue: ArkIssue): boolean {
		return #config in issue
	}
}

/** an ArkError, not an issue errors "none" writes once read */
export const isArkError = (issue: ArkIssue): issue is ArkError =>
	ErrorSource.stamps(issue)

// an error given a context, whose text a copy keeps
class SuppliedSource extends ErrorSource {
	#input: ArkErrorContextInput

	constructor(
		error: ArkError,
		config: ResolvedConfig,
		input: ArkErrorContextInput
	) {
		super(error, config)
		this.#input = input
	}

	static inputOf(error: ArkError): ArkErrorContextInput | undefined {
		if (#input in error) return error.#input
		// a copy holds neither field, so reading its config throws
		ErrorSource.configOf(error)
	}
}

const stampError = (
	error: ArkError,
	config: ResolvedConfig,
	input?: ArkErrorContextInput
): ArkError => {
	if (input) new SuppliedSource(error, config, input)
	else new ErrorSource(error, config)
	return error
}

export const suppliedText = (
	error: ArkError,
	slot: "expected" | "actual" | "problem" | "message"
): string | undefined => SuppliedSource.inputOf(error)?.[slot]

const writeError = (
	error: ArkError,
	config: ResolvedConfig,
	locale: Locale
): void => {
	error.propString ??= stringifyPath(error.path)
	if (error.code === "union" || error.code === "intersection") {
		for (const e of error.errors) {
			// usually at its own path, whose string is then written once
			if (pathEquals(e.path, error.path)) e.propString ??= error.propString
			writeError(e, config, locale)
		}
		const shared =
			(error.meta?.message ?? config[error.code].message) ===
				defaultConfig[error.code].message && sharedMessageOf(error.errors)
		if (shared) error.message ??= shared
	}
	if (renderer && locale !== renderer.en) renderer.write(error, config, locale)
	else writeText(error, config, locale)
}

// the message each error was configured or supplied with, if they agree
const sharedMessageOf = (errors: readonly ArkError[]): string | undefined => {
	let shared: string | undefined
	for (const e of errors) {
		const message =
			(
				e.meta?.message !== undefined ||
				suppliedText(e, "message") !== undefined
			) ?
				e.message
			: e.code === "union" || e.code === "intersection" ?
				sharedMessageOf(e.errors)
			:	undefined
		if (message === undefined || (shared !== undefined && message !== shared))
			return
		shared = message
	}
	return shared
}

export const writeText = (
	error: ArkError,
	config: ResolvedConfig,
	locale: Locale
): void => {
	const writers = config[error.code]
	const meta = error.meta
	const expected = meta?.expected ?? writers.expected
	error.expected ??=
		typeof expected === "function" ? expected(error as never, locale) : expected
	const actual = meta?.actual ?? writers.actual
	error.actual ??=
		typeof actual === "function" ?
			actual(error.data as never, error as never, locale)
		:	actual
	const problem = meta?.problem ?? writers.problem
	error.problem ??=
		typeof problem === "function" ? problem(error as never, locale) : problem
	const message = meta?.message ?? writers.message
	error.message ??=
		typeof message === "function" ? message(error as never, locale) : message
}

// registered by arktype/i18n
interface LocaleRenderer {
	/** the locale errors.ts writes itself */
	readonly en: Locale
	/** the locale a configured locale resolves to, en if it's a function */
	configure: (locale: ArkSchemaConfig["locale"], base: ResolvedConfig) => Locale
	/** the locale errors are written in when they are first read */
	select: (config: ResolvedConfig) => Locale
	write: (error: ArkError, config: ResolvedConfig, locale: Locale) => void
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
): Locale => {
	defaultConfig = base
	return (
		renderer ? renderer.configure(locale, base)
		: locale === undefined || locale === base.locale ? base.locale
		: throwError(unrenderedLocaleMessage)
	)
}

const writtenIn = (error: ArkError, locale: Locale): ArkError => {
	const config = ErrorSource.configOf(error)
	if (!renderer && locale !== config.locale)
		return throwError(unrenderedLocaleMessage)
	const copy = unwrittenError(error)
	writeError(copy, config, locale)
	return copy
}

const isLocale = (locale: unknown): locale is Locale =>
	typeof locale === "object" && locale !== null

export const unwrittenError = (
	error: ArkError,
	prefix?: array<PropertyKey>,
	config: ResolvedConfig = ErrorSource.configOf(error)
): ArkError => {
	const input = SuppliedSource.inputOf(error)
	const copy: Record<string, unknown> = {}
	for (const k in error) {
		if (!(k in writtenKeys)) copy[k] = error[k as never]
		else if (k !== "propString" && input?.[k as never] !== undefined)
			copy[k] = input[k as never]
	}
	// only an input has symbol keys, which for...in skips
	if (input) assignSymbols(copy, input)
	copy.path = prefix ? [...prefix, ...error.path] : [...error.path]
	if (error.code === "union" || error.code === "intersection")
		copy.errors = error.errors.map(e => unwrittenError(e, prefix, config))
	return stampError(copy as never, config, input)
}

const writtenKeys = {
	propString: 1,
	expected: 1,
	actual: 1,
	problem: 1,
	message: 1
}

const summarize = (issues: readonly ArkError[]): string => {
	let result = issues.length === 0 ? "" : issues[0].message
	for (let i = 1; i < issues.length; i++) result += `\n${issues[i].message}`
	return result
}

// the rest reference values, which may not serialize
const jsonOf = (error: ArkError): JsonObject => {
	const json: Record<string, unknown> = {}
	for (const k in error) {
		if (k in excludedFromJson) continue
		const v = error[k as never] as unknown
		json[k] =
			k === "path" ? (v as PropertyKey[]).map(jsonKeyOf)
			: k === "errors" ? (v as ArkError[]).map(jsonOf)
			: v
	}
	return json as never
}

const jsonKeyOf = (k: PropertyKey) =>
	typeof k === "symbol" ? printSymbol(k) : k

const excludedFromJson = {
	predicate: 1,
	morph: 1,
	cause: 1,
	missing: 1,
	valueMeta: 1,
	cases: 1
}

/**
 * The first of `errors.issues`, its text written without the rest's.
 */
export const firstIssue = (errors: ArkErrors): ArkError =>
	errors._first ?? errors.issues[0]

/**
 * Errors by the string of their path.
 */
export const byPath = (errors: ArkErrors): Record<string, ArkError> => {
	const result: Record<string, ArkError> = Object.create(null)
	for (const error of errors.issues) result[error.propString] = error
	return result
}

/**
 * {@link byPath} flattened so that each value is an array of errors at that path.
 *
 * ✅ Since "intersection" errors will be flattened to their constituent `errors`,
 * they will never be directly present in this representation.
 */
export const flatByPath = (errors: ArkErrors): Record<string, ArkError[]> =>
	recordByPath(errors, flat)

/**
 * {@link byPath} flattened so that each value is an array of problem strings at that path.
 */
export const flatProblemsByPath = (
	errors: ArkErrors
): Record<string, string[]> =>
	recordByPath(errors, error => flat(error).map(e => e.problem))

/**
 * All path strings at which errors are present mapped to the errors occuring
 * at that path or any nested path within it.
 */
export const byAncestorPath = (
	errors: ArkErrors
): Record<string, ArkError[]> => {
	const result: Record<string, ArkError[]> = Object.create(null)
	for (const error of errors.issues) {
		const errorsAtPath = flat(error)
		let propString = ""
		;(result[propString] ??= []).push(...errorsAtPath)
		for (const k of error.path) {
			propString = appendStringifiedKey(propString, k)
			;(result[propString] ??= []).push(...errorsAtPath)
		}
	}
	return result
}

// a path __proto__ is defined, since assigning it would set the prototype
const recordByPath = <v>(
	errors: ArkErrors,
	valueOf: (error: ArkError) => v
): Record<string, v> => {
	const result: Record<string, v> = {}
	for (const error of errors.issues) {
		if (error.propString !== "__proto__")
			result[error.propString] = valueOf(error)
		else {
			Object.defineProperty(result, "__proto__", {
				value: valueOf(error),
				enumerable: true,
				writable: true,
				configurable: true
			})
		}
	}
	return result
}

const flat = (error: ArkError): ArkError[] =>
	error.code === "intersection" ? [...error.errors] : [error]

const writeTraversalMessage = (issues: readonly ArkError[]): string =>
	issues.length === 1 ?
		issues[0].message
	:	"\n" + issues.map(e => `  • ${indent(e)}`).join("\n")

const indent = (error: ArkError): string =>
	error.message.split("\n").join("\n  ")

export interface DerivableErrorContext<
	code extends ArkErrorCode = ArkErrorCode
> {
	expected: string
	actual: string
	problem: string
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

export type ArkErrorCode = keyof ErrorContextsByCode

type ArkErrorContextInputsByCode = {
	[code in ArkErrorCode]: errorContext<code> & DerivableErrorContextInput<code>
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

export type ProblemContext<code extends ArkErrorCode = ArkErrorCode> =
	code extends unknown ?
		omit<ArkError<code>, "problem" | "message"> & unstringifiable
	:	never

export type CustomErrorInput = show<
	// ensure a custom error can be discriminated on the lack of a code
	{ code?: undefined } & DerivableErrorContextInput
>

export type ArkErrorInput = string | ArkErrorContextInput | CustomErrorInput

export type ProblemConfig<code extends ArkErrorCode = ArkErrorCode> =
	| string
	| ProblemWriter<code>

export type ProblemWriter<code extends ArkErrorCode = ArkErrorCode> = (
	error: ProblemContext<code>,
	locale: Locale.Info
) => string

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
		omit<ArkError<code>, "expected" | "actual" | "problem" | "message"> &
			unstringifiable
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
		omit<
			ArkError<code>,
			"expected" | "description" | "actual" | "problem" | "message"
		> &
			unstringifiable
	:	never

export type ActualWriter<code extends ArkErrorCode = ArkErrorCode> = (
	data: getAssociatedDataForError<code>,
	error: ActualContext<code>,
	locale: Locale.Info
) => string

export const configureAfterTypeMessage =
	"configure() must be called before any Type is created, so import the module calling it before any module that creates one"

export const unrenderedLocaleMessage =
	'import "arktype/i18n" to write errors in locales other than en'

export const copiedErrorMessage =
	"only errors validation returned can be written again, not copies"
