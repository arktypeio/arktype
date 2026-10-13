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
import type { ResolvedConfig } from "../config.ts"
import type {
	NodeErrorContextsByKind,
	Prerequisite,
	errorContext
} from "../kinds.ts"
import type { DiscriminantErrorContext } from "../roots/union.ts"
import type { UndeclaredErrorContext } from "../structure/structure.ts"
import type { NodeKind } from "./implement.ts"
import type { Locale } from "./locale.ts"
import { writeMessage } from "./errorWriters.ts"
import {
	ArkErrors as BaseArkErrors,
	messageOf,
	problemOf,
	type FailureInput,
	type FailureSite,
	type CompactApply,
	type UnionSite
} from "./issues.ts"
import { Traversal, type InternalTraversal } from "./traversal.ts"

export { throwOnDefault, TraversalError } from "./issues.ts"

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

// below this many paths, comparing paths is faster than indexing them
const maxScannedLength = 8

/**
 * The errors returned by a Type on invalid input.
 *
 * Subsequent errors added at an existing path are merged into an
 * intersection error.
 */
export class ArkErrors extends BaseArkErrors {
	// errors are grouped by path when read, which a program that only checks for failure never does
	declare _: ArkError[]
	private grouped: ArkError[] = []
	private groupedCount = 0
	// errors by the string of their path, once there are enough to index
	private index: Record<string, ArkError> | undefined
	private written = true
	private locale: Locale | undefined
	private config: ResolvedConfig

	constructor(config: ResolvedConfig) {
		super()
		this.config = config
	}

	/**
	 * One error per path, in the order each path first failed, each with its
	 * text written in the locale selected when they were first read.
	 */
	override get issues(): readonly ArkError[] {
		const issues = this._issues
		if (this.written) return issues
		this.written = true
		const locale = (this.locale ??=
			renderer?.select(this.config) ?? this.config.locale)
		for (const error of issues) writeError(error, this.config, locale)
		return issues
	}

	/**
	 * A human-readable summary of all errors.
	 */
	override get summary(): string {
		return summarize(this.issues)
	}

	/** @internal a thrown error's message, listing each error apart */
	get _thrown(): string {
		return writeTraversalMessage(this.issues)
	}

	override toJSON(): JsonArray {
		return this.issues.map(jsonOf)
	}

	/**
	 * The summary in `locale`, or as configured without one.
	 */
	toLocaleString(locale?: Locale): string {
		// Array.prototype.toLocaleString passes each element its own arguments, a tag
		if (!isLocale(locale)) return this.summary
		return summarize(this._issues.map(error => writtenIn(error, locale)))
	}

	/** @internal */
	override _merge(merged: BaseArkErrors, prefix: array<PropertyKey>): void {
		if (merged instanceof ArkErrors) return mergeErrors(this, merged, prefix)
		// a standalone validator's issues keep the text it wrote, in any locale
		for (const issue of merged.issues) {
			const problem = problemOf(issue)
			const meta: ArkEnv.meta = {
				expected: issue.expected ?? problem,
				actual: "",
				problem,
				message:
					issue.message === messageOf(issue) ? writeMessage : issue.message
			}
			this._.push(
				stampError(
					{
						code: issue.code,
						path: [...prefix, ...issue.path],
						data: issue.data,
						meta,
						// a union's issue names what the union describes, without its branches' errors
						...(issue.code === "union" && { errors: [] })
					} as never,
					this.config
				)
			)
		}
	}

	/** @internal the config its errors are written with */
	get _config(): ResolvedConfig {
		return this.config
	}

	/** @internal the errors grouped by path, without their text */
	get _issues(): ArkError[] {
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
			this.grouped.push(error)
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

// paths that differ usually share a prefix, so their last keys are compared first
const pathEquals = (l: array<PropertyKey>, r: array<PropertyKey>) => {
	if (l.length !== r.length) return false
	for (let i = l.length - 1; i >= 0; i--) if (l[i] !== r[i]) return false
	return true
}

export const mergeErrors = (
	errors: ArkErrors,
	merged: ArkErrors,
	prefix: array<PropertyKey>
): void => {
	// a copy is written with the config of the errors holding it, as their summary is
	for (const error of merged._issues)
		errors._.push(unwrittenError(error, prefix, errors._config))
}

type Keyed = Record<PropertyKey, unknown>

// errors whose text arktype writes from their node's context, in the locale it selects
export class ArkTraversal extends Traversal {
	override createErrors(): ArkErrors {
		return new ArkErrors(this.config)
	}

	override errorFromNodeContext<input extends NodeErrorContextInput>(
		input: input,
		data: unknown
	): ArkError<input["code"]>
	override errorFromNodeContext(
		input: NodeErrorContextInput,
		data: unknown
	): ArkError {
		return this.addError(
			errorOfNodeContext(input, this.path.slice(), data, this.config)
		)
	}

	// a site holds its node's full error context, from which an error is built as a compiled one is
	override failsAt(
		site: FailureSite,
		data: unknown,
		key?: PropertyKey
	): boolean {
		const missing =
			key !== undefined && site.missing && !(key in (data as object))
		this.addError(
			errorOfNodeContext(
				(missing ? site.missing : site.value) as NodeErrorContextInput,
				key === undefined ? this.path.slice() : [...this.path, key],
				key === undefined || missing ? data : (data as Keyed)[key],
				this.config
			)
		)
		return this.failFast
	}

	override failsWith(input: FailureInput): boolean {
		errorFromContext(this, input as ArkErrorContextInput)
		return this.failFast
	}

	// each branch stops at its first error, which the union's error lists
	override failsUnion(
		branches: readonly CompactApply[],
		site: UnionSite,
		data: unknown
	): boolean {
		const errors: ArkError[] = []
		for (const branch of branches) {
			this.pushBranch()
			branch(data, this)
			errors.push(this.popBranch()!.error as ArkError)
		}
		errorFromContext(this, {
			code: "union",
			errors,
			meta: site.meta as ArkEnv.meta,
			data
		})
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

/** adds an error a union, a structure or a callback describes, at ctx's path */
export const errorFromContext = (
	ctx: InternalTraversal,
	input: ArkErrorContextInput
): ArkError => ctx.addError(errorOfContext(input, ctx.path, ctx.config))

/**
 * Writes an error's text in `locale`, as its errors would be written if it
 * were configured.
 */
export const messageIn = (error: ArkError, locale: Locale): string =>
	writtenIn(error, locale).message

export const messageAt = (error: ArkError, path: PropertyKey[]): string => {
	const config = ErrorSource.configOf(error)
	const copy = unwrittenError(error)
	copy.path = path
	writeError(copy, config, renderer?.select(config) ?? config.locale)
	return copy.message
}

export const errorOfContext = (
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
		// flatten union errors to avoid repeating context like "foo must be foo must be"...
		const flat: ArkError[] = []
		for (const inner of input.errors) {
			if (inner.code !== "union") appendError(flat, inner)
			else for (const e of inner.errors) appendError(flat, e)
		}
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

export const errorOfNodeContext = (
	context: ArkErrorContextInput,
	path: PropertyKey[],
	data: unknown,
	config: ResolvedConfig
): ArkError => {
	let build = buildersByContext.get(context)
	if (!build && compileBuilder && !config.jitless)
		buildersByContext.set(context, (build = compileBuilder(context)))
	return stampError(
		build ? build(context, path, data) : ({ data, path, ...context } as never),
		config
	)
}

// a node's errors share its context, so a function written once for its keys builds them
const buildersByContext = new WeakMap<object, ErrorBuilder>()

let compileBuilder:
	| ((context: ArkErrorContextInput) => ErrorBuilder)
	| undefined

// registered beside arktype's compiler, so the runtime, which never generates code, ships without it
export const registerBuilderCompiler = (
	compile: (context: ArkErrorContextInput) => ErrorBuilder
): void => {
	compileBuilder = compile
}

// a standalone artifact writes its contexts' builders, since its runtime can't compile them
export const registerErrorBuilder = (
	build: ErrorBuilder,
	contexts: readonly object[]
): void => {
	for (const context of contexts) buildersByContext.set(context, build)
}

// returns the object it's passed, so that a subclass adds its fields to that object
class Identity {
	constructor(o: object) {
		return o as never
	}
}

// private fields, so an error stays a plain object
class ErrorSource extends Identity {
	#config: ResolvedConfig
	// a context with any text supplied for the error, which a copy keeps
	#input: ArkErrorContextInput | undefined

	constructor(
		error: ArkError,
		config: ResolvedConfig,
		input: ArkErrorContextInput | undefined
	) {
		super(error)
		this.#config = config
		this.#input = input
	}

	static configOf(error: ArkError): ResolvedConfig {
		return #config in error ? error.#config : throwError(copiedErrorMessage)
	}

	static inputOf(error: ArkError): ArkErrorContextInput | undefined {
		return #input in error ? error.#input : throwError(copiedErrorMessage)
	}
}

const stampError = (
	error: ArkError,
	config: ResolvedConfig,
	input?: ArkErrorContextInput
): ArkError => {
	new ErrorSource(error, config, input)
	return error
}

export const suppliedText = (
	error: ArkError,
	slot: "expected" | "actual" | "problem" | "message"
): string | undefined => ErrorSource.inputOf(error)?.[slot]

export const writeError = (
	error: ArkError,
	config: ResolvedConfig,
	locale: Locale
): void => {
	if (error.code === "union" || error.code === "intersection")
		for (const e of error.errors) writeError(e, config, locale)
	error.propString ??= stringifyPath(error.path)
	if (renderer && locale !== renderer.en) renderer.write(error, config, locale)
	else writeText(error, config, locale)
}

export const writeText = (
	error: ArkError,
	config: ResolvedConfig,
	locale: Locale
): void => {
	const writers = config[error.code]
	const meta = error.meta
	// each slot calls its writer from its own site, which usually sees one
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

// registered by arktype, so a standalone runtime ships without its locales
export interface LocaleRenderer {
	/** the locale errors.ts writes itself */
	en: Locale
	/** the locale errors are written in when they are first read */
	select: (config: ResolvedConfig) => Locale
	write: (error: ArkError, config: ResolvedConfig, locale: Locale) => void
}

let renderer: LocaleRenderer | undefined

export const registerLocaleRenderer = (registered: LocaleRenderer): void => {
	renderer = registered
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
	const input = ErrorSource.inputOf(error)
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
	"configure must be called before any Type is created, e.g. from a module imported first"

export type configureAfterTypeMessage = typeof configureAfterTypeMessage

export const unrenderedLocaleMessage =
	"a standalone validator's errors can only be written in en, since writing another locale requires arktype"

export type unrenderedLocaleMessage = typeof unrenderedLocaleMessage

export const copiedErrorMessage =
	"an error can only be written again as validation returned it, not as a copy"

export type copiedErrorMessage = typeof copiedErrorMessage
