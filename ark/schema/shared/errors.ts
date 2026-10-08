import {
	CastableBase,
	DynamicFunction,
	ReadonlyPath,
	append,
	appendUnique,
	arrayEquals,
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
	keywordWriterOf,
	normalizeLocale,
	writeKeywordExpected,
	type Locale
} from "./locale.ts"
import { $ark } from "./registry.ts"
import {
	defaultLocale,
	outerLocale,
	plainLocale,
	readIn,
	renderLocale,
	selectLocale,
	selectsLocale
} from "./render.ts"
import type { StandardSchemaV1 } from "./standardSchema.ts"
import type { Traversal } from "./traversal.ts"
import { arkKind, hasArkKind } from "./utils.ts"

export type ArkErrorResult = ArkError | ArkErrors

export const isArkErrorResult = (result: unknown): result is ArkErrorResult =>
	typeof result === "object" &&
	(result instanceof ArkError || result instanceof ArkErrors)

type ErrorSlot = "expected" | "actual" | "problem" | "message"

type SlotConfig = string | ((...args: never[]) => string)

const readSlot = {
	expected: (e: ArkError) => e.expected,
	actual: (e: ArkError) => e.actual,
	problem: (e: ArkError) => e.problem,
	message: (e: ArkError) => e.message
}

const readErrorJson = (e: ArkError) => e.toJSON()

const readErrorsJson = (e: ArkErrors) => e.toJSON()

const readSummary = (e: ArkErrors) => e.toString()

const readFlatProblems = (e: ArkErrors) => e.flatProblemsByPath

// Array.prototype.toLocaleString passes each element its own arguments, a tag
const isLocale = (locale: unknown): locale is Locale =>
	typeof locale === "object" && locale !== null

export class ArkError<
	code extends ArkErrorCode = ArkErrorCode
> extends CastableBase<ArkErrorContextInput<code>> {
	readonly [arkKind] = "error"
	path: ReadonlyPath
	data: getAssociatedDataForError<code>
	private nodeConfig: ResolvedConfig[code]
	protected input!: ArkErrorContextInput<code>
	protected ctx: Traversal

	constructor(
		input: ArkErrorContextInput<code>,
		ctx: Traversal,
		isNodeContext?: boolean
	)
	// TS gets confused by <code>, so internally we just use the base type for input
	constructor(
		input: ArkErrorContextInput,
		ctx: Traversal,
		isNodeContext?: boolean
	) {
		super()
		let prefixPath: array<PropertyKey> | undefined
		let relativePath: array<PropertyKey> | undefined
		this.ctx = ctx
		if (isNodeContext && !ctx.config.jitless) {
			relativePath = input.relativePath
			copyNodeContext(this as never, input)
		} else {
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
		}
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
		const locale = plainLocale
		if (locale === undefined) return this.render("expected")
		const text = this.input.expected
		if (text !== undefined) return text

		const config = this.meta?.expected ?? this.nodeConfig.expected

		return typeof config === "function" ? config(this as never, locale) : config
	}

	get actual(): string {
		const locale = plainLocale
		if (locale === undefined) return this.render("actual")
		const text = this.input.actual
		if (text !== undefined) return text

		const config = this.meta?.actual ?? this.nodeConfig.actual

		return typeof config === "function" ?
				config(this.data as never, this as never, locale)
			:	config
	}

	get problem(): string {
		const locale = plainLocale
		if (locale === undefined) return this.render("problem")
		const text = this.input.problem
		if (text !== undefined) return text

		const config = this.meta?.problem ?? this.nodeConfig.problem

		return typeof config === "function" ? config(this as never, locale) : config
	}

	get message(): string {
		const locale = plainLocale
		if (locale === undefined) return this.render("message")
		const text = this.input.message
		if (text !== undefined) return text

		const config = this.meta?.message ?? this.nodeConfig.message

		return typeof config === "function" ? config(this as never, locale) : config
	}

	/**
	 * The message in `locale`, or in the locale a read selects without one.
	 */
	toLocaleString(locale?: Locale): string {
		return isLocale(locale) ?
				readIn(normalizeLocale(locale), this as never, readSlot.message)
			:	this.message
	}

	// selects the locale of an outermost read, or writes a slot in a locale
	// other than en
	private render(slot: ErrorSlot): string {
		const error: ArkError = this as never
		if (renderLocale === undefined)
			return readIn(outerLocale(), error, readSlot[slot])
		const config = this.configOf(slot)
		if (config !== $ark.defaultConfig[this.code][slot])
			return writeSlot(error, slot, config, renderLocale)
		const cited = this.citesDescription ? this.description : undefined
		if (slot === "expected") return localeExpected(error, cited, renderLocale)
		const writer = localeWriter(
			error,
			slot,
			this.configOf("expected"),
			cited,
			renderLocale
		)
		return writeSlot(error, slot, writer, renderLocale)
	}

	// a discriminant's description lists its cases, while its meta is its union's
	private get citesDescription(): boolean {
		const value =
			this.code !== "discriminant" &&
			this.description !== undefined &&
			!isDefaultDescription(this as never, this.description)
		Object.defineProperty(this, "citesDescription", { value })
		return value
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
		if (selectsLocale())
			return readIn(selectLocale(), this as never, readErrorJson)
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
	cited: string | undefined,
	locale: Locale
): SlotConfig => {
	if (cited !== undefined) {
		const keywordWriter = keywordWriterOf(error, locale, slot)
		if (keywordWriter !== undefined) return keywordWriter
	}
	const writer = locale[error.code][slot]
	if (writer === undefined) return locale[slot]
	// a code's own problem frames the text of its locale's expected writer,
	// not a keyword's phrase or authored text, while union and intersection
	// frame their children's
	if (
		slot !== "problem" ||
		error.code === "union" ||
		error.code === "intersection"
	)
		return writer
	return (
			cited !== undefined ||
				expected !== $ark.defaultConfig[error.code].expected
		) ?
			locale.problem
		:	writer
}

const localeExpected = (
	error: ArkError,
	cited: string | undefined,
	locale: Locale
): string => {
	if (cited !== undefined)
		return writeKeywordExpected(error as never, locale) ?? locale.cite(cited)
	const expected = locale[error.code].expected
	// read whole in en, never as en's frame around the locale's text
	return expected === undefined ?
			readIn(defaultLocale, error, readSlot.expected)
		:	writeExpected(error, expected, locale)
}

const writeExpected = (
	error: ArkError,
	expected: string | ((error: never, locale: Locale) => string),
	locale: Locale
): string =>
	typeof expected === "string" ? expected : expected(error as never, locale)

// whether a description is what arktype writes for a node without authored
// text or a keyword. Any scope's writer may have written it, so its text decides
const isDefaultDescription = (
	error: ArkError,
	description: string
): boolean => {
	const meta = error.meta
	return (
		meta !== undefined &&
		meta.description === undefined &&
		meta.keyword === undefined &&
		description ===
			writeExpected(error, defaultLocale[error.code].expected, defaultLocale)
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

// a node's errors share its context, so a function compiled once copies its keys
const copiesByContext = new WeakMap<object, (error: ArkError) => void>()

const copyNodeContext = (
	error: ArkError,
	context: ArkErrorContextInput
): void => {
	let copy = copiesByContext.get(context)
	if (!copy) {
		let body = "e.input = input\n"
		for (const k in context) {
			// relativePath is read into the error's path
			if (k === "relativePath") continue
			const key = JSON.stringify(k)
			body += `e[${key}] = input[${key}]\n`
		}
		copy = new DynamicFunction<(input: object) => (error: ArkError) => void>(
			"input",
			`return e => {\n${body}}`
		)(context)
		copiesByContext.set(context, copy)
	}
	copy(error)
}

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
		const issues = this.issues
		if (this._byPath) return this._byPath
		const byPath: Record<string, ArkError> = Object.create(null)
		for (const error of issues) byPath[error.propString] = error
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
		if (selectsLocale()) return readIn(selectLocale(), this, readFlatProblems)
		return flatMorph(this.byPath, (k, v) => [k, v.flat.map(e => e.problem)])
	}

	private _byAncestorPath: Record<string, ArkError[]> | undefined
	/**
	 * All pathStrings at which errors are present mapped to the errors occuring
	 * at that path or any nested path within it.
	 */
	get byAncestorPath(): Record<string, ArkError[]> {
		const issues = this.issues
		if (this._byAncestorPath) return this._byAncestorPath
		this._byAncestorPath = Object.create(null)
		for (const error of issues) this.addAncestorPaths(error)
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
		if (
			error === existing ||
			(existing?.hasCode("intersection") && existing.errors.includes(error))
		)
			return
		this.addNew(error)
	}

	/**
	 * @internal
	 */
	addNew(error: ArkError): void {
		this.ungrouped.push(error)
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
			this.addNew(
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
			(path.stringifyAncestors().some(s => s in this.byPath) ||
				// this would occur if there is an existing error at a suffix of path
				// e.g. the path is ["foo"] and there is an error at ["foo", "bar"]
				path.stringify() in this.byAncestorPath) &&
			// distinct symbols can print alike
			this.issues.some(
				e => startsWithPath(path, e.path) || startsWithPath(e.path, path)
			)
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
	toLocaleString(locale?: Locale): string {
		return isLocale(locale) ?
				readIn(normalizeLocale(locale), this, readSummary)
			:	this.summary
	}

	private _issues: ArkError[] = []
	private ungrouped: ArkError[] = []

	/**
	 * One ArkError per path with errors, in the order each path first failed.
	 */
	get issues(): readonly ArkError[] {
		const ungrouped = this.ungrouped
		if (ungrouped.length === 0) return this._issues
		// reset first, since grouping reads issues
		this.ungrouped = []
		for (const error of ungrouped) this.group(error)
		return this._issues
	}

	get length(): number {
		return this.issues.length
	}

	[Symbol.iterator](): IterableIterator<ArkError> {
		return this.issues.values()
	}

	toJSON(): JsonArray {
		if (selectsLocale()) return readIn(selectLocale(), this, readErrorsJson)
		return this.issues.map(e => e.toJSON())
	}

	toString(): string {
		if (selectsLocale()) return readIn(selectLocale(), this, readSummary)
		const issues = this.issues
		// join would convert each error through V8's slower generic ToPrimitive
		let result = issues.length === 0 ? "" : issues[0].toString()
		for (let i = 1; i < issues.length; i++)
			result += `\n${issues[i].toString()}`
		return result
	}

	private group(error: ArkError): void {
		const existing = this.errorAtPath(error)
		if (!existing) {
			this._issues.push(error)
			if (this._byPath) this._byPath[error.propString] = error
			if (this._byAncestorPath) this.addAncestorPaths(error)
			return
		}
		// If the existing error is an error for a value constrained to "never",
		// then we don't want to intersect the error messages.
		if (existing.hasCode("union") && existing.errors.length === 0) return

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

		const issues = this._issues
		issues[issues.indexOf(existing)] = errorIntersection
		if (this._byPath) this._byPath[error.propString] = errorIntersection
		// ancestors list errors in issue order, which appending here would break
		this._byAncestorPath = undefined
	}

	private errorAtPath(error: ArkError): ArkError | undefined {
		const issues = this.issues
		if (issues.length === 0) return undefined
		const propString = error.propString
		if (this._byPath || issues.length >= maxScannedLength) {
			const indexed = this.byPath[propString]
			// distinct symbols can print alike, so an indexed error may be elsewhere
			if (!indexed || arrayEquals(indexed.path, error.path)) return indexed
		}
		// an error at an existing path usually follows the last one added
		for (let i = issues.length - 1; i >= 0; i--) {
			if (
				issues[i].propString === propString &&
				arrayEquals(issues[i].path, error.path)
			)
				return issues[i]
		}
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

const startsWithPath = (path: ReadonlyPath, prefix: ReadonlyPath) =>
	prefix.length <= path.length && prefix.every((k, i) => k === path[i])

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

// recognize errors from another copy of arktype by their brand,
// non-writable so instanceof can be inlined
Object.defineProperty(ArkError, Symbol.hasInstance, {
	value: (data: unknown) => hasErrorBrand(data, "error")
})

Object.defineProperty(ArkErrors, Symbol.hasInstance, {
	value: (data: unknown) => hasErrorBrand(data, "errors")
})

Object.defineProperty(TraversalError, Symbol.hasInstance, {
	value: (data: unknown) =>
		data instanceof Error &&
		(data as TraversalError).arkErrors instanceof ArkErrors
})

// parsed JSON can carry the brand but not a method
const hasErrorBrand = (data: unknown, kind: "error" | "errors"): boolean =>
	hasArkKind(data, kind) && typeof data.toJSON === "function"

const writeTraversalMessage = (errors: ArkErrors): string =>
	selectsLocale() ? readIn(selectLocale(), errors, writeTraversalMessage)
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
			omit<
				ArkError<code>,
				"message" | "toString" | "toLocaleString" | "toJSON"
			> &
			unstringifiable
	:	never

// shadows Object's toString and toLocaleString, which read the message
type unstringifiable = {
	toString(never: never): string
	toLocaleString(never: never): string
}

export type ProblemContext<code extends ArkErrorCode = ArkErrorCode> =
	code extends unknown ?
		omit<errorContext<code>, "meta"> &
			omit<
				ArkError<code>,
				"problem" | "message" | "toString" | "toLocaleString" | "toJSON"
			> &
			unstringifiable
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
				| "expected"
				| "actual"
				| "problem"
				| "message"
				| "toString"
				| "toLocaleString"
				| "toJSON"
			> &
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
		omit<errorContext<code>, "description" | "meta"> &
			omit<
				ArkError<code>,
				| "expected"
				| "description"
				| "actual"
				| "problem"
				| "message"
				| "toString"
				| "toLocaleString"
				| "toJSON"
			> &
			unstringifiable
	:	never

export type ActualWriter<code extends ArkErrorCode = ArkErrorCode> = (
	data: getAssociatedDataForError<code>,
	error: ActualContext<code>,
	locale: Locale.Info
) => string
