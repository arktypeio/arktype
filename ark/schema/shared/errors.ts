import {
	CastableBase,
	ReadonlyPath,
	append,
	appendUnique,
	conflatenateAll,
	defineValue,
	flatMorph,
	type JsonArray,
	type JsonObject,
	type array,
	type merge,
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
import {
	keywordPhraseOf,
	keywordWriterOf,
	normalizeLocale,
	writeKeywordExpected,
	type Locale
} from "./locale.ts"
import { $ark } from "./registry.ts"
import type { StandardSchemaV1 } from "./standardSchema.ts"
import type { Traversal } from "./traversal.ts"
import { arkKind } from "./utils.ts"

export type ArkErrorResult = ArkError | ArkErrors

export const isArkErrorResult = (result: unknown): result is ArkErrorResult =>
	typeof result === "object" &&
	(result instanceof ArkError || result instanceof ArkErrors)

type ErrorSlot = "expected" | "actual" | "problem" | "message"

type SlotConfig = string | ((...args: never[]) => string)

// the locale of the outermost read in progress, which the reads it makes share
let renderLocale: Locale | undefined

// false until configure is passed a locale, so English reads check nothing else
let localeConfigured = false

export const noteLocaleConfigured = (): void => {
	localeConfigured = true
}

const localizes = (): boolean => renderLocale !== undefined || localeConfigured

// an outermost read selects a locale when a function is configured
const selectsLocale = (): boolean =>
	localeConfigured &&
	renderLocale === undefined &&
	typeof $ark.config.locale === "function"

const selectLocale = (): Locale => {
	try {
		const locale = ($ark.config.locale as () => Locale<any> | undefined)()
		return locale === undefined ?
				$ark.defaultConfig.locale
			:	normalizeLocale(locale)
	} catch {
		// a throw from a getter would replace the TraversalError assert throws
		return $ark.defaultConfig.locale
	}
}

const readIn = <t>(locale: Locale, read: () => t): t => {
	const outer = renderLocale
	renderLocale = locale
	try {
		return read()
	} finally {
		renderLocale = outer
	}
}

// Array.prototype.toLocaleString passes each element its own arguments, a tag
const isLocale = (locale: unknown): locale is Locale<any> =>
	typeof locale === "object" && locale !== null

export class ArkError<
	code extends ArkErrorCode = ArkErrorCode
> extends CastableBase<ArkErrorContextInput<code>> {
	readonly [arkKind] = "error"
	path: ReadonlyPath
	data: getAssociatedDataForError<code>
	private nodeConfig: ResolvedConfig[code]
	protected input: ArkErrorContextInput<code>
	protected ctx: Traversal

	constructor(input: ArkErrorContextInput<code>, ctx: Traversal)
	// TS gets confused by <code>, so internally we just use the base type for input
	constructor(input: ArkErrorContextInput, ctx: Traversal) {
		super()
		let prefixPath: array<PropertyKey> | undefined
		let relativePath: array<PropertyKey> | undefined
		if (input.code === "union") {
			prefixPath = input.prefixPath
			relativePath = input.relativePath
			// flatten union errors to avoid repeating context like "foo must be foo must be"...
			let flat: ArkError[] = []
			for (const innerError of input.errors) {
				const innerFlat =
					innerError.hasCode("union") ? innerError.errors : [innerError]
				flat = flat.length ? appendUnique(flat, innerFlat) : [...innerFlat]
			}
			input = {
				...input,
				errors:
					!prefixPath && !relativePath ?
						flat
					:	flat.map(e =>
							e.transform(
								e =>
									({
										...e,
										path: conflatenateAll(prefixPath, e.path, relativePath)
									}) as never
							)
						)
			}
		}
		this.input = input as never
		this.ctx = ctx
		// assigning defines the same property unless this has or inherits k, e.g. propString
		for (const k in input) {
			if (k === "relativePath") relativePath = input.relativePath
			else if (k === "prefixPath") prefixPath = input.prefixPath
			else if (!(k in this)) (this as any)[k] = input[k as never]
			// path and data are assigned below, and text supplied for a slot
			// stays in input, where its getter reads it
			else if (k !== "path" && k !== "data" && !isSlot(k))
				defineValue(this, k, input[k as never])
		}
		for (const k of Object.getOwnPropertySymbols(input))
			defineValue(this, k, input[k as never])
		const data = ctx.data
		this.nodeConfig = ctx.config[this.code] as never
		const basePath = [...(input.path ?? ctx.path)]
		if (relativePath) basePath.push(...relativePath)
		if (prefixPath) basePath.unshift(...prefixPath)
		this.path = new ReadonlyPath(...basePath)
		this.data = ("data" in input ? input.data : data) as never
	}

	transform(
		f: (input: ArkErrorContextInput<code>) => ArkErrorContextInput
	): ArkError {
		// input's paths are already in this.path
		const { path, relativePath, prefixPath, ...input } = this.input
		return new ArkError(
			f({
				data: this.data,
				path: this.path,
				...input
			} as never),
			this.ctx
		) as never
	}

	hasCode<code extends ArkErrorCode>(code: code): this is ArkError<code> {
		return this.code === code
	}

	get propString(): string {
		return this.path.stringify()
	}

	get expected(): string {
		if (localizes()) return this.render("expected")
		if (this.input.expected !== undefined) return this.input.expected

		const config = this.meta?.expected ?? this.nodeConfig.expected

		return typeof config === "function" ?
				config(this as never, this.ctx.config.locale)
			:	config
	}

	get actual(): string {
		if (localizes()) return this.render("actual")
		if (this.input.actual !== undefined) return this.input.actual

		const config = this.meta?.actual ?? this.nodeConfig.actual

		return typeof config === "function" ?
				config(this.data as never, this as never, this.ctx.config.locale)
			:	config
	}

	get problem(): string {
		if (localizes()) return this.render("problem")
		if (this.input.problem !== undefined) return this.input.problem

		const config = this.meta?.problem ?? this.nodeConfig.problem

		return typeof config === "function" ?
				config(this as never, this.ctx.config.locale)
			:	config
	}

	get message(): string {
		if (localizes()) return this.render("message")
		if (this.input.message !== undefined) return this.input.message

		const config = this.meta?.message ?? this.nodeConfig.message

		return typeof config === "function" ?
				config(this as never, this.ctx.config.locale)
			:	config
	}

	/**
	 * The message in `locale`, or in the locale a read selects without one.
	 */
	toLocaleString(locale?: Locale<any>): string {
		return isLocale(locale) ?
				readIn(normalizeLocale(locale), () => this.message)
			:	this.message
	}

	// a read through a locale, which writes what the app hasn't configured
	private render(slot: ErrorSlot): string {
		if (selectsLocale()) return readIn(selectLocale(), () => this[slot])
		const error: ArkError = this as never
		const locale = renderLocale ?? this.ctx.config.locale
		const config = this.configOf(slot)
		if (
			locale === $ark.defaultConfig.locale ||
			config !== $ark.defaultConfig[this.code][slot]
		)
			return writeSlot(error, slot, config, locale)
		if (slot === "expected") return localeExpected(error, locale)
		const writer = localeWriter(error, slot, this.configOf("expected"), locale)
		return writeSlot(error, slot, writer, locale)
	}

	private configOf(slot: ErrorSlot): SlotConfig {
		return (
			this.input[slot] ??
			this.meta?.[slot] ??
			this.nodeConfig[slot] ??
			$ark.defaultConfig[this.code][slot]
		)
	}

	get flat(): ArkError[] {
		return this.hasCode("intersection") ? [...this.errors] : [this as never]
	}

	toJSON(): JsonObject {
		if (selectsLocale()) return readIn(selectLocale(), () => this.toJSON())
		const json: Record<string, unknown> = { data: this.data, path: this.path }
		for (const k in this.input)
			if (!(k in excludedFromJson)) json[k] = this.input[k as never]
		json.expected = this.expected
		json.actual = this.actual
		json.problem = this.problem
		json.message = this.message
		return json as never
	}

	toString(): string {
		return this.message
	}

	throw(): never {
		throw this
	}
}

const writeSlot = (
	error: ArkError,
	slot: ErrorSlot,
	config: SlotConfig,
	locale: Locale
): string =>
	typeof config === "string" ?
		slot === "expected" ?
			locale.cite(config)
		:	config
	: slot === "actual" ?
		config(error.data as never, error as never, locale as never)
	:	config(error as never, locale as never)

// a locale's writer for a slot other than expected
const localeWriter = (
	error: ArkError,
	slot: Exclude<ErrorSlot, "expected">,
	expected: SlotConfig,
	locale: Locale
): SlotConfig => {
	const description = ownDescription(error)
	if (description !== undefined) {
		const keywordWriter = keywordWriterOf(error, locale, slot)
		if (keywordWriter !== undefined) return keywordWriter as never
	}
	const writer = locale[error.code][slot]
	if (writer === undefined) return locale[slot] as never
	// a code's own problem frames the text of its locale's expected writer,
	// not a keyword's phrase or authored text, while union and intersection
	// frame their children's
	return (
			slot === "problem" &&
				error.code !== "union" &&
				error.code !== "intersection" &&
				(expected !== $ark.defaultConfig[error.code].expected ||
					(description !== undefined && !isEnglish(error, description)))
		) ?
			(locale.problem as never)
		:	(writer as never)
}

const localeExpected = (error: ArkError, locale: Locale): string => {
	const description = ownDescription(error)
	if (description !== undefined) {
		const phrase = keywordPhraseOf(error, locale)
		if (phrase !== undefined)
			return writeKeywordExpected(phrase, error as never, locale)
		if (!isEnglish(error, description)) return locale.cite(description)
	}
	return writeExpected(error, locale[error.code].expected, locale)
}

const writeExpected = (
	error: ArkError,
	expected: string | ((error: never, locale: Locale) => string),
	locale: Locale
): string =>
	typeof expected === "string" ? expected : expected(error as never, locale)

// a discriminant's description lists its cases, while its meta is its union's
const ownDescription = (error: ArkError): string | undefined =>
	error.code === "discriminant" ? undefined : error.description

// whether a description is what arktype writes for a node without authored
// text or a keyword. Any scope's writer may have written it, so its text decides
const isEnglish = (error: ArkError, description: string): boolean => {
	const meta = error.meta
	const en = $ark.defaultConfig.locale
	return (
		meta !== undefined &&
		meta.description === undefined &&
		meta.keyword === undefined &&
		description === writeExpected(error, en[error.code].expected, en)
	)
}

// this.path includes the input's paths, and the rest reference values,
// which may not serialize
const excludedFromJson = {
	path: 1,
	relativePath: 1,
	prefixPath: 1,
	predicate: 1,
	morph: 1,
	cause: 1,
	missing: 1,
	valueMeta: 1,
	cases: 1
}

const isSlot = (k: string) =>
	k === "expected" || k === "actual" || k === "problem" || k === "message"

export declare namespace ArkErrors {
	export type Handler<returns = unknown> = (errors: ArkErrors) => returns
}

// below this many paths, comparing propStrings is faster than indexing them
const maxScannedLength = 8

/**
 * The `ArkError`s returned by a Type on invalid input.
 *
 * Subsequent errors added at an existing path are merged into an
 * ArkError intersection.
 */
export class ArkErrors implements StandardSchemaV1.FailureResult {
	readonly [arkKind] = "errors"

	protected ctx: Traversal

	constructor(ctx: Traversal) {
		this.ctx = ctx
	}

	private _byPath: Record<string, ArkError> | undefined
	/**
	 * Errors by a pathString representing their location.
	 */
	get byPath(): Record<string, ArkError> {
		if (this._byPath) return this._byPath
		const byPath: Record<string, ArkError> = Object.create(null)
		for (const error of this.issues) byPath[error.propString] = error
		return (this._byPath = byPath)
	}

	/**
	 * {@link byPath} flattened so that each value is an array of ArkError instances at that path.
	 *
	 * ✅ Since "intersection" errors will be flattened to their constituent `.errors`,
	 * they will never be directly present in this representation.
	 */
	get flatByPath(): Record<string, ArkError[]> {
		return flatMorph(this.byPath, (k, v) => [k, v.flat])
	}

	/**
	 * {@link byPath} flattened so that each value is an array of problem strings at that path.
	 */
	get flatProblemsByPath(): Record<string, string[]> {
		if (selectsLocale())
			return readIn(selectLocale(), () => this.flatProblemsByPath)
		return flatMorph(this.byPath, (k, v) => [k, v.flat.map(e => e.problem)])
	}

	private _byAncestorPath: Record<string, ArkError[]> | undefined
	/**
	 * All pathStrings at which errors are present mapped to the errors occuring
	 * at that path or any nested path within it.
	 */
	get byAncestorPath(): Record<string, ArkError[]> {
		if (this._byAncestorPath) return this._byAncestorPath
		this._byAncestorPath = Object.create(null)
		for (const error of this.issues) this.addAncestorPaths(error)
		return this._byAncestorPath!
	}

	count = 0

	/**
	 * Throw a TraversalError based on these errors.
	 */
	throw(): never {
		throw this.toTraversalError()
	}

	/**
	 * Converts ArkErrors to TraversalError, a subclass of `Error` suitable for throwing with nice
	 * formatting.
	 */
	toTraversalError(): TraversalError {
		return new TraversalError(this)
	}

	/**
	 * Add an ArkError, ignoring duplicates.
	 */
	add(error: ArkError): void {
		const existing = this.errorAtPath(error)
		if (existing) {
			// only add if it's not already in the errors collection
			if (
				error === existing ||
				(existing.hasCode("intersection") && existing.errors.includes(error))
			)
				return
			// If the existing error is an error for a value constrained to "never",
			// then we don't want to intersect the error messages.
			if (existing.hasCode("union") && existing.errors.length === 0) {
				// the error is still a failure, so traversal of the value it checked stops
				this.count++
				return
			}

			// If the new error is an error for a value constrained to "never",
			// then we want to override any existing errors.
			const errorIntersection =
				error.hasCode("union") && error.errors.length === 0 ?
					error
				:	new ArkError(
						{
							code: "intersection",
							errors:
								existing.hasCode("intersection") ?
									[...existing.errors, error]
								:	[existing, error],
							// an error added with its own path isn't at ctx.path
							path: existing.path,
							data: existing.data
						},
						this.ctx
					)

			const issues = this.issues as ArkError[]
			issues[issues.indexOf(existing)] = errorIntersection
			if (this._byPath) this._byPath[error.propString] = errorIntersection
			// ancestors list errors in issue order, which appending here would break
			this._byAncestorPath = undefined
		} else {
			;(this.issues as ArkError[]).push(error)
			if (this._byPath) this._byPath[error.propString] = error
			if (this._byAncestorPath) this.addAncestorPaths(error)
		}
		this.count++
	}

	transform(f: (e: ArkError) => ArkError): ArkErrors {
		const result = new ArkErrors(this.ctx)
		for (const e of this.issues) result.add(f(e))
		return result
	}

	/**
	 * Add all errors from an ArkErrors instance, ignoring duplicates and
	 * prefixing their paths with that of the current Traversal.
	 */
	merge(errors: ArkErrors): void {
		// a morph that returns ctx.errors has already added them
		if (errors === this) return
		for (const e of errors.issues) {
			this.add(
				e.transform(
					input => ({ ...input, prefixPath: [...this.ctx.path] }) as never
				)
			)
		}
	}

	/**
	 * @internal
	 */
	affectsPath(path: ReadonlyPath): boolean {
		if (this.length === 0) return false

		return (
			// this would occur if there is an existing error at a prefix of path
			// e.g. the path is ["foo", "bar"] and there is an error at ["foo"]
			path.stringifyAncestors().some(s => s in this.byPath) ||
			// this would occur if there is an existing error at a suffix of path
			// e.g. the path is ["foo"] and there is an error at ["foo", "bar"]
			path.stringify() in this.byAncestorPath
		)
	}

	/**
	 * A human-readable summary of all errors.
	 */
	get summary(): string {
		return this.toString()
	}

	/**
	 * Alias of {@link summary} for consistency with `Error`.
	 */
	get message(): string {
		return this.summary
	}

	/**
	 * The summary in `locale`, or in the locale a read selects without one.
	 */
	toLocaleString(locale?: Locale<any>): string {
		return isLocale(locale) ?
				readIn(normalizeLocale(locale), () => this.summary)
			:	this.summary
	}

	/**
	 * One ArkError per path with errors, in the order each path first failed.
	 */
	readonly issues: readonly ArkError[] = []

	get length(): number {
		return this.issues.length
	}

	[Symbol.iterator](): IterableIterator<ArkError> {
		return this.issues.values()
	}

	toJSON(): JsonArray {
		if (selectsLocale()) return readIn(selectLocale(), () => this.toJSON())
		return this.issues.map(e => e.toJSON())
	}

	toString(): string {
		if (selectsLocale()) return readIn(selectLocale(), () => this.toString())
		const issues = this.issues
		// join would convert each error through V8's slower generic ToPrimitive
		let result = issues.length === 0 ? "" : issues[0].toString()
		for (let i = 1; i < issues.length; i++)
			result += `\n${issues[i].toString()}`
		return result
	}

	private errorAtPath(error: ArkError): ArkError | undefined {
		const issues = this.issues
		if (issues.length === 0) return undefined
		const propString = error.propString
		if (this._byPath || issues.length >= maxScannedLength)
			return this.byPath[propString]
		// an error at an existing path usually follows the last one added
		for (let i = issues.length - 1; i >= 0; i--)
			if (issues[i].propString === propString) return issues[i]
	}

	private addAncestorPaths(error: ArkError): void {
		const byAncestorPath = this._byAncestorPath!
		const flat = error.flat
		for (const propString of error.path.stringifyAncestors()) {
			for (const e of flat)
				byAncestorPath[propString] = append(byAncestorPath[propString], e)
		}
	}
}

export class TraversalError extends Error {
	readonly name = "TraversalError"
	declare arkErrors: ArkErrors

	constructor(errors: ArkErrors) {
		super(writeTraversalMessage(errors))

		Object.defineProperty(this, "arkErrors", {
			value: errors,
			enumerable: false
		})
	}
}

const writeTraversalMessage = (errors: ArkErrors): string =>
	selectsLocale() ? readIn(selectLocale(), () => writeTraversalMessage(errors))
	: errors.length === 1 ? errors.summary
	: "\n" + errors.issues.map(e => `  • ${indent(e)}`).join("\n")

const indent = (error: ArkError): string =>
	error.toString().split("\n").join("\n  ")

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

// meta comes from the error, since an error a narrow adds has none.
// no context reaches the slot its writer computes or one that could read it
export type MessageContext<code extends ArkErrorCode = ArkErrorCode> =
	code extends unknown ?
		omit<errorContext<code>, "meta"> &
			omit<ArkError<code>, "message" | "toString" | "toJSON">
	:	never

export type ProblemContext<code extends ArkErrorCode = ArkErrorCode> =
	code extends unknown ?
		omit<errorContext<code>, "meta"> &
			omit<ArkError<code>, "problem" | "message" | "toString" | "toJSON">
	:	never

export type CustomErrorInput = show<
	// ensure a custom error can be discriminated on the lack of a code
	// and that an ArkErrors instance (whose message getter would otherwise
	// make it structurally assignable) is not mistaken for one
	{ code?: undefined; [arkKind]?: undefined } & DerivableErrorContextInput
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
		omit<errorContext<code>, "meta"> &
			omit<
				ArkError<code>,
				"expected" | "actual" | "problem" | "message" | "toString" | "toJSON"
			>
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
		omit<errorContext<code>, "description" | "meta"> &
			omit<
				ArkError<code>,
				| "expected"
				| "description"
				| "actual"
				| "problem"
				| "message"
				| "toString"
				| "toJSON"
			>
	:	never

export type ActualWriter<code extends ArkErrorCode = ArkErrorCode> = (
	data: getAssociatedDataForError<code>,
	error: ActualContext<code>,
	locale: Locale.Info
) => string
