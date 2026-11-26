import { pathAt, type array } from "@ark/util"
import type { ArkErrorCode } from "./errors.ts"
import {
	bracketsKeys,
	callsSiteText,
	findsOnRead,
	labelsValues,
	listsUnions,
	namesTraversalError,
	readsErrors,
	readsSummary,
	reportsIndices,
	writesText
} from "./issueFeatures.ts"
import type { StandardSchemaV1 } from "./standardSchema.ts"

/**
 * A failed check of a standalone validator: its code, the path and data it
 * failed at, and what its node describes.
 */
export interface ArkIssue {
	code: ArkErrorCode
	path: PropertyKey[]
	data: unknown
	expected: string | undefined
	/** what failed, without the path it failed at, which a summary writes */
	message?: string | undefined
	/** a union's: each branch's first issue */
	errors?: readonly ArkIssue[]
	/** @internal a union's line of a summary, naming its errors' paths whole */
	readonly _l?: string | undefined
	/** @internal 2 where its message is one configured for its code: see codedIssue */
	readonly _c?: 2 | undefined
	/** @internal the label its message names its value by: see labeledIssue */
	readonly _n?: string | undefined
	/** @internal a union's, its text written again at a path before its own */
	_m?(prefix: array<PropertyKey>): ArkIssue
}

type WrittenIssue = ArkIssue & { message: string }

// as errors.ts's summaryIn, which writes a locale other than the configured
// one only where arktype/i18n is imported, so a build without it fails the same way
const refuseLocale = (locale: unknown): void => {
	if (locale === undefined) return
	if (typeof locale !== "object" || locale === null || Array.isArray(locale))
		throw Error("Expected a Locale object")
	throw Error('import "arktype/i18n" to write errors in locales other than en')
}

/** what a site reports: its code and description */
export interface SiteContext {
	code: ArkErrorCode
	description?: string | undefined
	/**
	 * the message configured for the site, which names no path. A summary sets
	 * it apart from its path with a colon unless it begins as what's written
	 * from what the site expects would: see isCustomIssue
	 */
	x?: string | undefined
	/**
	 * writes other text configured for the site onto its issue, or notes that
	 * its message is its code's, as codedIssue does
	 */
	text?: ((issue: ArkIssue) => unknown) | undefined
}

/**
 * a check's site: its node's context, or a key's. Every site is written into
 * the bundle and a minifier keeps property names, so a key's are short
 */
export interface FailureSite extends Partial<SiteContext> {
	/** the context its value fails with */
	v?: SiteContext
	/** the context the missing key fails with */
	m?: SiteContext
	/**
	 * @internal the functions arktype's own traversal builds v's and m's errors
	 * with, kept on the site once found. A standalone validator has none
	 */
	vb?: ((...args: never[]) => unknown) | undefined
	mb?: ((...args: never[]) => unknown) | undefined
}

export interface UnionSite {
	meta?: object
	description: string
}

// returns false only once traversal stops
export type CompactApply = (data: unknown, ctx: FailureContext) => boolean

/**
 * what a missing key fails with, after its code, which is always required's:
 * what it expects, the message configured for it, and what writes other text
 * onto its issue. Passed to _k after the key, each as _e takes it
 */
export type MissingText = [
	expected?: string | undefined,
	message?: string | undefined,
	text?: SiteContext["text"]
]

/**
 * where a validator's compact Apply reports failures; each returns whether to
 * stop. A minifier keeps property names, and compiled code calls these at
 * each failure, so they're named short. _e fails data at the path the context
 * is at, with a code, what's expected and the message configured, each a
 * literal where it fails: a site there is three strings, where an object
 * holding them is a call to build it at every failure and the function it
 * calls in every bundle. _k applies data's value at a key, failing the key
 * as required where it's missing and passed what a missing key says, even
 * only `undefined`: an optional key is passed nothing
 */
export interface FailureContext {
	_e(
		data: unknown,
		code: ArkErrorCode,
		expected?: string,
		message?: string,
		text?: SiteContext["text"]
	): boolean | undefined
	_k(
		apply: CompactApply,
		data: unknown,
		key: PropertyKey,
		...missing: MissingText
	): boolean | undefined
}

/**
 * where arktype's own compiled code reports failures: _at fails a site, whose
 * contexts its traversal builds errors from, at a key where it's passed one,
 * and _in applies data's value at a key, passed the site a missing key fails
 * and the value too, read where its key is a constant. Named apart from a
 * validator's, so a traversal can take both
 */
export interface SiteFailureContext {
	_at(site: FailureSite, data: unknown, key?: PropertyKey): boolean | undefined
	_in(
		apply: CompactApply,
		data: unknown,
		key: PropertyKey,
		missing?: FailureSite,
		value?: unknown
	): boolean | undefined
}

// what a program's code reads of its errors, as no bundler drops a class's members
class ReadIssues implements StandardSchemaV1.FailureResult, FailureContext {
	/** @internal each issue in the order it was added */
	declare _: ArkIssue[]
	/** @internal the path a fused traversal is at */
	declare _p: PropertyKey[]

	// assigned, as a target lowering class fields defines each with a helper
	constructor() {
		this._ = []
		this._p = []
	}

	/**
	 * The number of issues.
	 */
	get count(): number {
		return this._.length
	}

	/**
	 * Each issue, its message written when they are first read.
	 */
	get issues(): readonly WrittenIssue[] {
		return serializableIssues(this._)
	}

	/**
	 * @internal fails data at the path it's at. Every bundle holds this, so it
	 * takes neither a key nor a site: a validator whose code fails nothing at
	 * a key would hold what enters one for nothing, which failsKey does
	 * through _k, and a site is a function building it in every bundle
	 */
	_e(
		data: unknown,
		code: ArkErrorCode,
		expected?: string,
		message?: string,
		text?: SiteContext["text"]
	): true | undefined {
		this._.push({ code, path: this._p.slice(), data, expected, message })
		// called on the issue once it's added, so errors whose build found no
		// site calling one hold no name for it
		if (callsSiteText) text?.(this._[this._.length - 1])
		// only errors stopping at the first issue stop at this one
		return undefined
	}

	/** @internal */
	_k(
		apply: CompactApply,
		data: unknown,
		key: PropertyKey,
		...missing: MissingText
	): boolean | undefined {
		this._p.push(key)
		// a missing key fails with the object missing it
		const stops =
			missing.length && !(key in (data as object)) ?
				this._e(data, "required", ...missing)
			:	!apply((data as Keyed)[key], this)
		this._p.pop()
		return stops
	}
}

// As ReadIssues, in a build whose failing calls may return errors nobody
// reads (findsOnRead). Passed what finds their issues, after the data and the
// config a traversal is built with, they find them when first read, so a
// call that leaves them unread costs what building them does. For that their
// issues are a getter over a field, written into the class, with each member
// again: a class beside the errors' with the getter, its prototype set to
// theirs, is 98 bytes of a bundle gzipped where this is 27, and a getter
// defined on each errors object takes longer than finding its issues does.
// Errors built with nothing to find them, as a traversal's are, hold none
// until one is added
class UnreadIssues implements StandardSchemaV1.FailureResult, FailureContext {
	declare _p: PropertyKey[]
	/** @internal what finds its issues */
	declare _a: CompactApply | undefined
	/** @internal the data they're found in */
	declare _d: unknown
	/** @internal its issues, once found or added to */
	declare _f: ArkIssue[] | undefined

	constructor(data?: unknown, config?: unknown, apply?: CompactApply) {
		this._p = []
		this._a = apply
		this._d = data
	}

	/** @internal each issue in the order it was added, found when first read */
	get _(): ArkIssue[] {
		if (!this._f) {
			this._f = []
			// data a write or a getter has made valid since fails as a whole
			if (this._a && (this._a(this._d, this), !this._f.length))
				this._e(this._d, "predicate", "valid", "is invalid")
		}
		return this._f
	}

	get count(): number {
		return this._.length
	}

	get issues(): readonly WrittenIssue[] {
		return serializableIssues(this._)
	}

	_e(
		data: unknown,
		code: ArkErrorCode,
		expected?: string,
		message?: string,
		text?: SiteContext["text"]
	): true | undefined {
		this._.push({ code, path: this._p.slice(), data, expected, message })
		if (callsSiteText) text?.(this._[this._.length - 1])
		return undefined
	}

	_k(
		apply: CompactApply,
		data: unknown,
		key: PropertyKey,
		...missing: MissingText
	): boolean | undefined {
		this._p.push(key)
		const stops =
			missing.length && !(key in (data as object)) ?
				this._e(data, "required", ...missing)
			:	!apply((data as Keyed)[key], this)
		this._p.pop()
		return stops
	}
}

/**
 * @internal fails a key of data: where it's missing, as required with what
 * a missing key expects, which is what its value does unless passed, or its
 * value, with a code and what's expected. Entered through _k, which each
 * ctx implements for a key, so errors needn't hold any of it in their _e,
 * and a bundler drops this from a program failing nothing at a key
 */
export const failsKey = (
	ctx: FailureContext,
	data: unknown,
	key: PropertyKey,
	code: ArkErrorCode,
	expected?: string,
	missing = expected
): boolean | undefined =>
	ctx._k((value, ctx) => !ctx._e(value, code, expected), data, key, missing)

/**
 * @internal fails a context: a site held as an object, as one whose text a
 * function writes is, or a checker, which is its own
 */
export const failsSite = (
	ctx: FailureContext,
	context: SiteContext,
	data: unknown
): boolean | undefined =>
	ctx._e(data, context.code, context.description, context.x, context.text)

/**
 * @internal as failsKey, of a site held as an object: the missing key, where
 * the site holds what one fails, or the key's value, with the site's context
 * for it or the site itself where it's a context
 */
export const failsKeySite = (
	ctx: FailureContext,
	site: FailureSite,
	data: unknown,
	key: PropertyKey
): boolean | undefined =>
	ctx._k(
		(value, ctx) => !failsSite(ctx, (site.v ?? site) as SiteContext, value),
		data,
		key,
		...missingTextOf(site.m)
	)

/** @internal what _k is passed of a missing key's context, or nothing */
export const missingTextOf = (missing: SiteContext | undefined): MissingText =>
	missing ? [missing.description, missing.x, missing.text] : []

// each a class only where a build's flag leaves it, as a bundler keeps a class
// that extends another, and all it reads, but drops one in a branch it folds.
// Errors read whole, as most programs read theirs, are one class extending
// none, which is about 25 bytes of a bundle less than one that does: so it
// writes ReadIssues's members again, each as that one's is, and a build that
// reads errors whole drops ReadIssues. Each is written once more for errors
// that find their issues once read, as UnreadIssues is and why
const Issues: IssuesClass = (
	readsErrors ?
		findsOnRead ?
			// named apart, as one bundle may hold both and a name is one class's
			class UnreadArkIssues
				implements StandardSchemaV1.FailureResult, FailureContext
			{
				declare _p: PropertyKey[]
				declare _a: CompactApply | undefined
				declare _d: unknown
				declare _f: ArkIssue[] | undefined

				constructor(data?: unknown, config?: unknown, apply?: CompactApply) {
					this._p = []
					this._a = apply
					this._d = data
				}

				get _(): ArkIssue[] {
					if (!this._f) {
						this._f = []
						if (this._a && (this._a(this._d, this), !this._f.length))
							this._e(this._d, "predicate", "valid", "is invalid")
					}
					return this._f
				}

				get count(): number {
					return this._.length
				}

				get issues(): readonly WrittenIssue[] {
					return serializableIssues(this._)
				}

				_e(
					data: unknown,
					code: ArkErrorCode,
					expected?: string,
					message?: string,
					text?: SiteContext["text"]
				): true | undefined {
					this._.push({ code, path: this._p.slice(), data, expected, message })
					if (callsSiteText) text?.(this._[this._.length - 1])
					return undefined
				}

				_k(
					apply: CompactApply,
					data: unknown,
					key: PropertyKey,
					...missing: MissingText
				): boolean | undefined {
					this._p.push(key)
					const stops =
						missing.length && !(key in (data as object)) ?
							this._e(data, "required", ...missing)
						:	!apply((data as Keyed)[key], this)
					this._p.pop()
					return stops
				}

				get summary(): string {
					let summary = ""
					for (const issue of this._)
						summary += (summary && "\n") + lineOf(issue)
					return summary
				}

				summaryIn(locale?: unknown): string {
					refuseLocale(locale)
					return this.summary
				}

				throw(): never {
					if (namesTraversalError) throw new ThrownIssues(this as never)
					if (definedThrown) throw new definedThrown(this as never)
					const thrown = Error(this.summary)
					thrown.name = "TraversalError"
					throw Object.defineProperty(thrown, "arkErrors", { value: this })
				}

				toJSON(): readonly IssueJson[] {
					return this.issues.map(jsonIssueOf)
				}

				[Symbol.iterator](): IterableIterator<WrittenIssue> {
					return this.issues[Symbol.iterator]()
				}

				toString(): string {
					return this.summary
				}
			}
		:	class ArkIssues implements StandardSchemaV1.FailureResult, FailureContext {
				declare _: ArkIssue[]
				declare _p: PropertyKey[]

				constructor() {
					this._ = []
					this._p = []
				}

				get count(): number {
					return this._.length
				}

				get issues(): readonly WrittenIssue[] {
					return serializableIssues(this._)
				}

				_e(
					data: unknown,
					code: ArkErrorCode,
					expected?: string,
					message?: string,
					text?: SiteContext["text"]
				): true | undefined {
					this._.push({ code, path: this._p.slice(), data, expected, message })
					if (callsSiteText) text?.(this._[this._.length - 1])
					return undefined
				}

				_k(
					apply: CompactApply,
					data: unknown,
					key: PropertyKey,
					...missing: MissingText
				): boolean | undefined {
					this._p.push(key)
					const stops =
						missing.length && !(key in (data as object)) ?
							this._e(data, "required", ...missing)
						:	!apply((data as Keyed)[key], this)
					this._p.pop()
					return stops
				}

				get summary(): string {
					let summary = ""
					for (const issue of this._)
						summary += (summary && "\n") + lineOf(issue)
					return summary
				}

				summaryIn(locale?: unknown): string {
					refuseLocale(locale)
					return this.summary
				}

				// constructed by TraversalError wherever its bundle keeps the
				// class: otherwise an Error with the same name, message and
				// errors, and no class in its bundle. Its name is assigned and
				// its errors defined as the class's are, in statements, which
				// gzip to less than one expression building it and which a build
				// writing the flag as a literal folds as well
				throw(): never {
					if (namesTraversalError) throw new ThrownIssues(this as never)
					if (definedThrown) throw new definedThrown(this as never)
					const thrown = Error(this.summary)
					thrown.name = "TraversalError"
					throw Object.defineProperty(thrown, "arkErrors", { value: this })
				}

				toJSON(): readonly IssueJson[] {
					return this.issues.map(jsonIssueOf)
				}

				[Symbol.iterator](): IterableIterator<WrittenIssue> {
					return this.issues[Symbol.iterator]()
				}

				toString(): string {
					return this.summary
				}
			}
	: readsSummary ?
		class extends ((findsOnRead ? UnreadIssues : (
			ReadIssues
		)) as typeof ReadIssues) {
			get summary(): string {
				let summary = ""
				for (const issue of this._) summary += (summary && "\n") + lineOf(issue)
				return summary
			}
		}
	: findsOnRead ? UnreadIssues
	: ReadIssues) as never

/**
 * @internal an errors class: built with nothing, or as a traversal is, with
 * data and a config, and, where its build has it find its issues once read
 * (findsOnRead), with what finds them
 */
export type IssuesClass<errors extends Issues = Issues> = new (
	data?: unknown,
	config?: unknown,
	apply?: CompactApply
) => errors

/**
 * The errors returned by a Type on invalid input.
 */
interface Issues extends ReadIssues {
	/**
	 * A human-readable summary of all errors.
	 */
	readonly summary: string
	/**
	 * The summary in `locale`, or as configured without one.
	 */
	summaryIn(locale?: unknown): string
	/**
	 * Throw a TraversalError based on these errors.
	 */
	throw(): never
	/**
	 * Each issue's JSON: what it says and where, without its data.
	 */
	toJSON(): readonly unknown[]
	toString(): string
	/**
	 * Each issue, as `issues` holds them.
	 */
	[Symbol.iterator](): IterableIterator<this["issues"][number]>
	/** @internal set by a build asking for only the first issue */
	failFast?: true
	/** @internal arktype's errors, which copy their contexts when merged */
	_merge?(merged: Issues, prefix: array<PropertyKey>): void
	/** @internal arktype's errors, grouped by path */
	readonly _i?: ArkIssue[]
}

/** an issue's JSON, as a standalone validator's errors write it */
export interface IssueJson {
	code: ArkErrorCode
	path: (string | number)[]
	expected?: string
	message: string
	errors?: IssueJson[]
}

// an issue as JSON: what it says and where. Never its data, which may be
// private, as a password is, or a bigint or circular, which JSON.stringify
// throws on. A symbol key is written as String writes it, as a path's is.
// Not exported, as issuesNone.ts and issuesLean.ts stand in for this module
const jsonIssueOf = (issue: ArkIssue): IssueJson => ({
	code: issue.code,
	path: issue.path.map(k => (typeof k === "symbol" ? String(k) : k)),
	...(issue.expected !== undefined && { expected: issue.expected }),
	message: issue.message ?? messageOf(issue),
	...(issue.errors?.length ? { errors: issue.errors.map(jsonIssueOf) } : {})
})

// non-enumerable on an errors' issues array so JSON.stringify(result.issues)
// and JSON.stringify(errors.issues) serialize each issue without data, actual,
// or non-JSON fields, while keeping issues a plain array of objects
const issuesToJson: PropertyDescriptor & ThisType<readonly ArkIssue[]> = {
	value() {
		return this.map(jsonIssueOf)
	},
	writable: true,
	configurable: true
}

type IssuesWithToJson = ArkIssue[] & { toJSON?: () => readonly IssueJson[] }

const serializableIssues = (issues: ArkIssue[]): readonly WrittenIssue[] => {
	for (const issue of issues) issue.message ??= messageOf(issue)
	return (issues as IssuesWithToJson).toJSON ?
			(issues as WrittenIssue[])
		:	(Object.defineProperty(issues, "toJSON", issuesToJson) as WrittenIssue[])
}

declare namespace Issues {
	export type Handler<returns = unknown> = (errors: Issues) => returns
}

// named apart from arktype's subclass, which keeps the name ArkErrors
export { Issues as ArkErrors }

export class FirstIssues extends Issues {
	// read from the prototype, so no errors object lists it among its own keys
	override get failFast(): true {
		return true
	}

	override _e(...failure: Parameters<Issues["_e"]>): true {
		super._e(...failure)
		return true
	}
}

export const applyIssues = (
	apply: CompactApply,
	data: unknown,
	onFail: Issues.Handler | null,
	Ctx: new () => Issues = Issues
): unknown => {
	const errors = new Ctx()
	apply(data, errors)
	return (
		!errors.count ? data
		: onFail ? onFail(errors)
		: errors
	)
}

export const issuesOf = (
	apply: CompactApply,
	data: unknown,
	errors: Issues
): ArkIssue[] => {
	apply(data, errors)
	// data a write or a getter has made valid since fails as a whole
	if (!errors._.length) errors._e(data, "predicate", "valid", "is invalid")
	return errors._
}

// for callers reading every failure's issues as it returns, like assert
export const foundErrors = (
	apply: CompactApply,
	data: unknown,
	onFail: Issues.Handler | null,
	Ctx: new () => Issues = Issues
): unknown => {
	const errors = new Ctx()
	// as issuesOf, which a program of these never ships
	apply(data, errors)
	if (!errors._.length) errors._e(data, "predicate", "valid", "is invalid")
	return onFail ? onFail(errors) : errors
}

type Keyed = Record<PropertyKey, unknown>

export const issueAt = (
	path: PropertyKey[],
	site: FailureSite,
	data: unknown,
	key: PropertyKey | undefined
): ArkIssue => {
	let context = site.v ?? (site as SiteContext)
	if (key !== undefined) {
		if (site.m && !(key in (data as object))) context = site.m
		else data = (data as Keyed)[key]
	}
	const issue: ArkIssue = {
		code: context.code,
		path: pathAt(path, key),
		data,
		expected: context.description,
		message: context.x
	}
	if (callsSiteText) context.text?.(issue)
	return issue
}

export const throwOnDefault: Issues.Handler = errors => errors.throw()

// a merged issue's message, which names no path, is as it was
export const mergeIssues = (
	errors: Issues,
	merged: Issues,
	prefix: array<PropertyKey>
): void => {
	for (const issue of merged.issues) {
		errors._.push(
			listsUnions && issue._m ?
				issue._m(prefix)
			:	movedIssue(issue, [...prefix, ...issue.path])
		)
	}
}

/**
 * @internal whether an issue's message is a sentence configured or supplied
 * for it, which a summary sets apart from its path with a colon, rather than
 * what's written from what it expected, which follows its path. An issue holds
 * nothing saying which: a message is a sentence of its own unless it begins as
 * the one written from what the issue expects would, so one configured as that
 * text, or as it with more after it, like what the value was, reads on from
 * its path as that would. A union listing its errors wrote its own line
 */
export const isCustomIssue = (issue: ArkIssue): boolean =>
	(
		(listsUnions && issue._l !== undefined) ||
		(labelsValues && issue._n !== undefined)
	) ?
		false
	:	writesText &&
		issue.message !== undefined &&
		!issue.message.startsWith(messageOf(issue))

/**
 * @internal notes that an issue's message is one configured for its code, as
 * `configure({ required: { message } })` does for every missing key. A union
 * says the message its branches' errors share where each was configured for
 * its error's Type or supplied where it was raised, and lists errors saying a
 * code's, which the text alone doesn't tell from those. Defined on the issue
 * so it isn't enumerable, as only what its readers see is. A site whose
 * message is its code's passes this as its `text`, so only a program that
 * configures one holds it
 */
export const codedIssue = <issue extends ArkIssue>(issue: issue): issue =>
	Object.defineProperty(issue, "_c", { value: 2 })

/**
 * @internal a copy of an issue, noted as it was. A union reads a code's note,
 * only of a message that was written, and a summary a label's
 */
export const notedAs = (issue: ArkIssue, copy: ArkIssue): ArkIssue =>
	labelsValues && issue._n !== undefined ? labeledIssue(copy, issue._n)
	: listsUnions && writesText && issue._c ? codedIssue(copy)
	: copy

/** @internal an issue at another path, saying what it did */
export const movedIssue = (issue: ArkIssue, path: PropertyKey[]): ArkIssue =>
	notedAs(issue, {
		code: issue.code,
		path,
		data: issue.data,
		expected: issue.expected,
		message: issue.message
	})

/**
 * @internal the path as arktype's stringifyPath writes it: a key that isn't
 * an identifier is bracketed and quoted, as an index or a symbol (which has no
 * JSON) is bracketed
 */
export const pathOf = (issue: {
	readonly path: readonly PropertyKey[]
}): string => {
	let path = ""
	for (const k of issue.path) {
		path +=
			reportsIndices && typeof k === "number" ? `[${k}]`
			: bracketsKeys && !/^[$_a-z][\w$]*$/i.test(String(k)) ?
				`[${JSON.stringify(k) ?? String(k)}]`
			:	(path && ".") + String(k)
	}
	return path
}

/** an issue `lineOf` can format: an `ArkError`, standalone `ArkIssue`, or `PathedIssue` */
export interface ReadableIssue {
	readonly path: readonly PropertyKey[]
	readonly message?: string | undefined
	readonly code?: ArkErrorCode | undefined
	readonly expected?: string | undefined
}

let formatArkError: ((error: ReadableIssue) => string | undefined) | undefined

/** @internal registered by errors.ts so arktype and arktype/runtime share one lineOf */
export const registerErrorLineFormatter = (
	formatter: (error: ReadableIssue) => string | undefined
): void => {
	formatArkError = formatter
}

const isLabeledIssue = (
	issue: ReadableIssue,
	message: string,
	defaultMessage: string
): boolean => {
	if ((issue as ArkIssue)._n !== undefined) return true
	// a JSON-round-tripped ArkError loses its non-enumerable _n note, keeping
	// either meta/valueMeta.label (JSON.stringify(error)) or `<label> <default>`
	// (ArkErrors.toJSON())
	const meta =
		issue.code === "required" ?
			(issue as { valueMeta?: { label?: unknown; message?: unknown } })
				.valueMeta
		:	(issue as { meta?: { label?: unknown; message?: unknown } }).meta
	if (
		typeof meta?.label === "string" &&
		meta.message === undefined &&
		message.startsWith(meta.label + " ")
	)
		return true
	return (
		(issue.expected !== undefined || issue.code === "required") &&
		message.length > defaultMessage.length + 1 &&
		(message.endsWith(" " + defaultMessage) ||
			message.includes(" " + defaultMessage + " "))
	)
}

/**
 * Formats an error as its line in `errors.summary`, e.g.
 * `name must be a string` or `name: Enter a name`.
 */
export const lineOf = (issue: ReadableIssue): string => {
	if (formatArkError) {
		const formatted = formatArkError(issue)
		if (formatted !== undefined) return formatted
	}
	const defaultMessage = messageOf(issue)
	const message = issue.message ?? defaultMessage
	// every key of a build holding neither an index nor a key to bracket is an
	// identifier, so its path is its keys joined, and it holds no pathOf
	const path =
		reportsIndices || bracketsKeys ? pathOf(issue) : issue.path.join(".")
	return (
		listsUnions && (issue as ArkIssue)._l !== undefined ?
			(issue as ArkIssue)._l!
		: labelsValues && isLabeledIssue(issue, message, defaultMessage) ?
			labeledPathOf(issue) + message
		: path ?
			path +
			((
				writesText &&
				!(message === "is invalid" && issue.expected === "valid") &&
				!message.startsWith(defaultMessage)
			) ?
				": "
			:	" ") +
			message
		:	message
	)
}

// what an issue says where no message is configured for it, naming no path.
// An undeclared key's site says what's expected. Only a missing key's says
// what the value was, since writing any other value would ship a printer
export const messageOf = (issue: {
	readonly code?: ArkErrorCode | undefined
	readonly expected?: string | undefined
}): string =>
	issue.expected !== undefined ?
		"must be " +
		issue.expected +
		(issue.code === "required" ? " (was missing)" : "")
	: issue.code === "required" ? "is missing"
	: "is invalid"

interface ThrownIssues extends Error {
	readonly name: "TraversalError"
	arkErrors: Issues
}

// the class, once its module defines it. A build reading where a program
// names it (namesTraversalError) constructs it, but a module the build
// doesn't read, like a dependency, may import it too: so it's defined as its
// module loads, and assigned here as it is, which a bundler drops with the
// class where nothing imports it. What's thrown is then an instance of the
// class wherever it can be named
let definedThrown: (new (errors: Issues) => ThrownIssues) | undefined

const ThrownIssues: new (errors: Issues) => ThrownIssues =
	/* @__PURE__ */ (() =>
		(definedThrown = class TraversalError extends Error {
			declare readonly name: "TraversalError"
			declare arkErrors: Issues

			constructor(errors: Issues) {
				super(errors.summary)

				// assigned, as a field's initializer compiles where the class is defined
				this.name = "TraversalError"
				// defined, so it's neither enumerable nor writable
				Object.defineProperty(this, "arkErrors", { value: errors })
			}
		}))()

export { ThrownIssues as TraversalError }

export const throwIssues = (apply: CompactApply, data: unknown): never => {
	const errors = new Issues()
	apply(data, errors)
	if (!errors._.length) errors._e(data, "predicate", "valid", "is invalid")
	return errors.throw()
}

// declared last, so a build labeling nothing drops them without splitting the
// declarations around them in two, which costs it bytes

/**
 * @internal notes that an issue's message names its value by a label, as
 * `.label("Unit price")` writes `Unit price must be positive`: what its Type
 * expects, said of the label rather than after its path. A summary writes it
 * after the path it failed at without the key the label names, and a union
 * lists it under its label. Defined on the issue so it isn't enumerable, as
 * codedIssue's note is, and configurable, as a union whose errors share a
 * sentence says that in place of its own labeled message
 */
export const labeledIssue = <issue extends ArkIssue>(
	issue: issue,
	label: string
): issue =>
	Object.defineProperty(issue, "_n", { value: label, configurable: true })

/**
 * @internal the path a labeled issue's line writes before its message, then a
 * colon: its own, without the key its label names in its place. An index
 * names no value, so it's kept, as in `prices[0]: Price must be positive`
 */
export const labeledPathOf = (issue: {
	readonly path: readonly PropertyKey[]
}): string => {
	const { path } = issue
	const prefix = pathOf(
		typeof path[path.length - 1] === "string" ?
			{ path: path.slice(0, -1) }
		:	issue
	)
	return prefix && prefix + ": "
}
