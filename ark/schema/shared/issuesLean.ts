import type { array } from "@ark/util"
import type { ArkErrorCode } from "./errors.ts"
import type {
	ArkIssue,
	CompactApply,
	FailureContext,
	FailureSite,
	IssueJson,
	MissingText,
	SiteContext
} from "./issues.ts"
import {
	bracketsKeys,
	callsSiteText,
	listsUnions,
	namesTraversalError,
	readsErrors,
	readsSummary,
	reportsIndices,
	writesText
} from "./issueFeatures.ts"

type WrittenIssue = ArkIssue & { message: string }

type Keyed = Record<PropertyKey, unknown>

// in place of issues.ts, written for size, whose tiers it's chosen from as issues.ts's are
class ReadIssues implements FailureContext {
	/** @internal each issue in the order it was added */
	_: ArkIssue[] = []
	/** @internal the path a fused traversal is at */
	_p: PropertyKey[] = []

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
		for (const issue of this._) issue.message ??= messageOf(issue)
		return this._ as WrittenIssue[]
	}

	/** @internal takes neither a key nor a site, as issues.ts's */
	_e(
		data: unknown,
		code: ArkErrorCode,
		expected?: string,
		message?: string,
		text?: SiteContext["text"]
	): true | undefined {
		this._.push({ code, path: this._p.slice(), data, expected, message })
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
		const stops =
			missing.length && !(key in (data as object)) ?
				this._e(data, "required", ...missing)
			:	!apply((data as Keyed)[key], this)
		this._p.pop()
		return stops
	}
}

// as issues.ts's failsKey, failsSite, failsKeySite and missingTextOf
export const failsKey = (
	ctx: FailureContext,
	data: unknown,
	key: PropertyKey,
	code: ArkErrorCode,
	expected?: string,
	missing = expected
): boolean | undefined =>
	ctx._k((value, ctx) => !ctx._e(value, code, expected), data, key, missing)

export const failsSite = (
	ctx: FailureContext,
	context: SiteContext,
	data: unknown
): boolean | undefined =>
	ctx._e(data, context.code, context.description, context.x, context.text)

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

export const missingTextOf = (missing: SiteContext | undefined): MissingText =>
	missing ? [missing.description, missing.x, missing.text] : []

// one class where errors are read, as they read the summary too, and as
// issues.ts's one extending none, with ReadIssues's members written again
const Issues: new () => Issues = (
	readsErrors ?
		class ArkErrors implements FailureContext {
			_: ArkIssue[] = []
			_p: PropertyKey[] = []

			get count(): number {
				return this._.length
			}

			get issues(): readonly WrittenIssue[] {
				for (const issue of this._) issue.message ??= messageOf(issue)
				return this._ as WrittenIssue[]
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
				return this._.map(lineOf).join("\n")
			}

			summaryIn(locale?: unknown): string {
				if (
					locale !== undefined &&
					(typeof locale !== "object" ||
						locale === null ||
						Array.isArray(locale))
				)
					throw Error("Expected a Locale object")
				return this.summary
			}

			// as issues.ts's, an instance of TraversalError wherever it's kept
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

			toString(): string {
				return this.summary
			}

			[Symbol.iterator](): IterableIterator<WrittenIssue> {
				return this.issues[Symbol.iterator]()
			}
		}
	: readsSummary ?
		class extends ReadIssues {
			get summary(): string {
				return this._.map(lineOf).join("\n")
			}
		}
	:	ReadIssues) as never

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
	toJSON(): readonly unknown[]
	toString(): string
	[Symbol.iterator](): IterableIterator<this["issues"][number]>
	/** @internal set by a build asking for only the first issue */
	failFast?: true
	/** @internal arktype's errors, which copy their contexts when merged */
	_merge?(merged: Issues, prefix: array<PropertyKey>): void
}

export { Issues as ArkErrors }

// an issue as JSON, without its data, as issues.ts's jsonIssueOf
const jsonIssueOf = (issue: ArkIssue): IssueJson => ({
	code: issue.code,
	path: issue.path.map(k => (typeof k === "symbol" ? String(k) : k)),
	expected: issue.expected,
	message: issue.message ?? messageOf(issue),
	...(issue.errors && { errors: issue.errors.map(jsonIssueOf) })
})

export class FirstIssues extends Issues {
	override get failFast(): true {
		return true
	}

	override _e(...failure: Parameters<Issues["_e"]>): true {
		super._e(...failure)
		return true
	}
}

export const issueAt = (
	path: PropertyKey[],
	site: FailureSite,
	data: unknown,
	key: PropertyKey | undefined
): ArkIssue => {
	let context = site.v ?? (site as SiteContext)
	if (key !== undefined) {
		path.push(key)
		if (site.m && !(key in (data as object))) context = site.m
		else data = (data as Keyed)[key]
	}
	const issue: ArkIssue = {
		code: context.code,
		path: path.slice(),
		data,
		expected: context.description,
		message: context.x
	}
	if (callsSiteText) context.text?.(issue)
	if (key !== undefined) path.pop()
	return issue
}

export const issuesOf = (
	apply: CompactApply,
	data: unknown,
	errors: Issues
): ArkIssue[] => {
	apply(data, errors)
	// data a write or a getter has made valid since fails as a whole
	if (!errors._.length) errors._e(data, "predicate")
	return errors._
}

export const foundErrors = (
	apply: CompactApply,
	data: unknown,
	onFail: ((errors: Issues) => unknown) | null,
	Ctx: new () => Issues = Issues
): unknown => {
	const errors = new Ctx()
	// as issuesOf, which a program of these never ships
	apply(data, errors)
	if (!errors._.length) errors._e(data, "predicate")
	return onFail ? onFail(errors) : errors
}

export const throwIssues = (apply: CompactApply, data: unknown): never => {
	const errors = new Issues()
	issuesOf(apply, data, errors)
	return errors.throw()
}

// the errors hold no path to release
export const applyIssues = (
	apply: CompactApply,
	data: unknown,
	onFail: ((errors: Issues) => unknown) | null,
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

export const throwOnDefault = (errors: Issues): never => errors.throw()

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

// whether an issue's message is a sentence of its own, as issues.ts's isCustomIssue
export const isCustomIssue = (issue: ArkIssue): boolean =>
	listsUnions && issue._l !== undefined ?
		false
	:	writesText &&
		issue.message !== undefined &&
		!issue.message.startsWith(messageOf(issue))

// as issues.ts's codedIssue, notedAs and movedIssue
export const codedIssue = <issue extends ArkIssue>(issue: issue): issue =>
	Object.defineProperty(issue, "_c", { value: 2 })

export const notedAs = (issue: ArkIssue, copy: ArkIssue): ArkIssue =>
	listsUnions && writesText && issue._c ? codedIssue(copy) : copy

export const movedIssue = (issue: ArkIssue, path: PropertyKey[]): ArkIssue =>
	notedAs(issue, {
		code: issue.code,
		path,
		data: issue.data,
		expected: issue.expected,
		message: issue.message
	})

// the path as issues.ts writes it
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

// an issue's line of a summary, as issues.ts's lineOf
export const lineOf = (issue: ArkIssue): string => {
	const message = (issue.message ??= messageOf(issue))
	// as issues.ts's, joined where every key is an identifier
	const path =
		reportsIndices || bracketsKeys ? pathOf(issue) : issue.path.join(".")
	return (
		listsUnions && issue._l !== undefined ? issue._l
		: path ?
			path +
			(writesText && !message.startsWith(messageOf(issue)) ? ": " : " ") +
			message
		:	message
	)
}

// an undeclared key's site says what's expected, as issues.ts's messageOf
export const messageOf = (issue: {
	readonly code?: ArkErrorCode
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

// defined as its module loads, and dropped where nothing imports it, as
// issues.ts's
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
