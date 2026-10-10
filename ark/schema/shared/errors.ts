import {
	appendStringifiedKey,
	arkKind,
	conflatenateAll,
	printable,
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
import type { StandardSchemaV1 } from "./standardSchema.ts"

export type ArkErrorResult = ArkError | ArkErrors

// a morph fails by returning errors, or an error ctx.error added, which only a morph passed ctx can
export const isArkErrorResult = (
	result: unknown,
	errors?: ArkErrors
): result is ArkErrorResult =>
	typeof result === "object" &&
	(result instanceof ArkErrors ||
		(errors !== undefined && errors._added.includes(result as never)))

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
export class ArkErrors implements StandardSchemaV1.FailureResult {
	readonly [arkKind] = "errors"

	// errors are grouped by path when read, which a program that only checks for failure never does
	_added: ArkError[] = []
	private grouped: ArkError[] = []
	private groupedCount = 0
	// errors by the string of their path, once there are enough to index
	private byPath: Record<string, ArkError> | undefined
	private written = true
	private locale: Locale | undefined
	private config: ResolvedConfig

	constructor(config: ResolvedConfig) {
		this.config = config
	}

	/**
	 * The number of errors added, including those merged at a path.
	 */
	get count(): number {
		return this._added.length
	}

	/**
	 * One error per path, in the order each path first failed, each with its
	 * text written in the locale selected when they were first read.
	 */
	get issues(): readonly ArkError[] {
		const issues = this._issues
		if (this.written) return issues
		this.written = true
		const locale = (this.locale ??= renderer?.select() ?? this.config.locale)
		for (const error of issues) writeError(error, this.config, locale)
		return issues
	}

	/**
	 * A human-readable summary of all errors.
	 */
	get summary(): string {
		return summarize(this.issues)
	}

	/**
	 * Throw a TraversalError based on these errors.
	 */
	throw(): never {
		throw new TraversalError(this)
	}

	toJSON(): JsonArray {
		return this.issues.map(jsonOf)
	}

	toString(): string {
		return this.summary
	}

	/**
	 * The summary in `locale`, or as configured without one.
	 */
	toLocaleString(locale?: Locale): string {
		// Array.prototype.toLocaleString passes each element its own arguments, a tag
		if (!isLocale(locale)) return this.summary
		return summarize(this._issues.map(error => writtenIn(error, locale)))
	}

	/** @internal the errors grouped by path, without their text */
	get _issues(): ArkError[] {
		const added = this._added
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
			if (this.byPath) this.byPath[pathKeyOf(error)] = error
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
						errors:
							existing.code === "intersection" ?
								[...existing.errors, error]
							:	[existing, error]
					} as never,
					this.config
				)
		const grouped = this.grouped
		grouped[grouped.indexOf(existing)] = errorIntersection
		if (this.byPath) this.byPath[pathKeyOf(error)] = errorIntersection
	}

	private errorAt(error: ArkError): ArkError | undefined {
		const { grouped } = this
		const { path } = error
		if (this.byPath || grouped.length >= maxScannedLength) {
			this.byPath ??= indexByPath(grouped)
			const indexed = this.byPath[pathKeyOf(error)]
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

/** adds an error, which is merged into an intersection with any at its path when read */
export const addError = (errors: ArkErrors, error: ArkError): void => {
	errors._added.push(error)
}

/** adds copies of another traversal's errors, prefixing their paths */
export const mergeErrors = (
	errors: ArkErrors,
	merged: ArkErrors,
	prefix: array<PropertyKey>
): void => {
	for (const error of merged._issues)
		addError(errors, unwrittenError(error, prefix))
}

/**
 * Writes an error's text in `locale`, as its errors would be written if it
 * were configured.
 */
export const messageIn = (error: ArkError, locale: Locale): string =>
	writtenIn(error, locale).message

/** an error's message as if it had been raised at another path */
export const messageAt = (error: ArkError, path: PropertyKey[]): string => {
	const config = ErrorSource.configOf(error)
	const copy = unwrittenError(error)
	copy.path = path
	writeError(copy, config, renderer?.select() ?? config.locale)
	return copy.message
}

/** an error from a context compiled code or a callback raises, which may be at another path */
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

/** an error a node's context raises, built with its keys in order */
export type ErrorBuilder = (
	context: ArkErrorContextInput,
	path: PropertyKey[],
	data: unknown
) => ArkError

/** builds an error from a node's context with the builder of its shape */
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

// what a copy of an error is written from, kept in private fields so that it stays a plain object
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
		return (error as {} as ErrorSource).#config
	}

	static inputOf(error: ArkError): ArkErrorContextInput | undefined {
		return (error as {} as ErrorSource).#input
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

/** the text supplied for an error's slot, which writing it again reads */
export const suppliedText = (
	error: ArkError,
	slot: "expected" | "actual" | "problem" | "message"
): string | undefined => ErrorSource.inputOf(error)?.[slot]

/**
 * writes an error's text in its slots that weren't supplied, after its
 * children's. An error written again, e.g. as a child of another, is unchanged
 */
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

/** writes an error's text with its meta's writers or its config's */
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

/** writes errors in arktype's locales, which a standalone runtime ships without */
export interface LocaleRenderer {
	/** the locale errors.ts writes itself */
	en: Locale
	/** the locale errors are written in when they are first read */
	select: () => Locale
	write: (error: ArkError, config: ResolvedConfig, locale: Locale) => void
}

let renderer: LocaleRenderer | undefined

export const registerLocaleRenderer = (registered: LocaleRenderer): void => {
	renderer = registered
}

// a copy of an error written in a locale, which leaves the error as written
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

/** a copy of an error with the text it was created with, its paths prefixed */
export const unwrittenError = (
	error: ArkError,
	prefix?: array<PropertyKey>
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
		copy.errors = error.errors.map(e => unwrittenError(e, prefix))
	return stampError(copy as never, ErrorSource.configOf(error), input)
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

const jsonKeyOf = (k: PropertyKey) => (typeof k === "symbol" ? printable(k) : k)

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
export const flatByPath = (errors: ArkErrors): Record<string, ArkError[]> => {
	const result: Record<string, ArkError[]> = Object.create(null)
	for (const error of errors.issues) result[error.propString] = flat(error)
	return result
}

/**
 * {@link byPath} flattened so that each value is an array of problem strings at that path.
 */
export const flatProblemsByPath = (
	errors: ArkErrors
): Record<string, string[]> => {
	const result: Record<string, string[]> = Object.create(null)
	for (const error of errors.issues)
		result[error.propString] = flat(error).map(e => e.problem)
	return result
}

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

const flat = (error: ArkError): ArkError[] =>
	error.code === "intersection" ? [...error.errors] : [error]

export class TraversalError extends Error {
	readonly name = "TraversalError"
	declare arkErrors: ArkErrors

	constructor(errors: ArkErrors) {
		super(writeTraversalMessage(errors.issues))

		Object.defineProperty(this, "arkErrors", {
			value: errors,
			enumerable: false
		})
	}
}

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
