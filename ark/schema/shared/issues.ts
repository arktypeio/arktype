import { pathAt, type array } from "@ark/util"
import type { ArkErrorCode } from "./errors.ts"
import {
	bracketsKeys,
	listsUnions,
	readsKeySites,
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
	/** @internal how its message was configured, as SiteContext.c says */
	readonly _c?: Custom | undefined
	/** @internal a union's, its text written again at a path before its own */
	_m?(prefix: array<PropertyKey>): ArkIssue
}

type WrittenIssue = ArkIssue & { message: string }

/** what a site reports: its code and description */
export interface SiteContext {
	code: ArkErrorCode
	description?: string | undefined
	/** the message configured for the site, which names no path */
	x?: string | undefined
	/**
	 * how x was configured, where a summary doesn't write it after its path as
	 * what's expected: 1 as its Type's message and 2 as its code's, each a
	 * sentence a colon sets apart
	 */
	c?: Custom | undefined
	/** writes other text configured for the site onto its issue */
	text?: (issue: ArkIssue) => void
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
 * where a compact Apply reports failures; each returns whether to stop. A
 * minifier keeps property names, and compiled code calls these at each
 * failure, so they're named short: _at fails a site (failsAt), _in applies
 * data's value at a key (failsIn). Arktype's own compiled code passes _in
 * the value too, read where its key is a constant, which its traversal
 * applies; a validator's errors read it from data, as every bundle would
 * otherwise carry the read at each key
 */
export interface FailureContext {
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
		for (const issue of this._) issue.message ??= messageOf(issue)
		return this._ as WrittenIssue[]
	}

	/** @internal */
	_at(site: FailureSite, data: unknown, key?: PropertyKey): true | undefined {
		// a key's site reports the missing key or its value
		const path = this._p
		let context = (readsKeySites ? site.v : undefined) ?? (site as SiteContext)
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
		if (writesText) {
			customIssue(issue, context.c)
			context.text?.(issue)
		}
		if (key !== undefined) path.pop()
		this._.push(issue)
		// only errors stopping at the first issue stop at this one
		return undefined
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
		this._p.push(key)
		const continues = apply((data as Keyed)[key], this)
		this._p.pop()
		return !continues
	}
}

// each a class only where a build's flag leaves it, as a bundler keeps a class
// that extends another, and all it reads, but drops one in a branch it folds
const SummarizedIssues: new () => ReadIssues & { readonly summary: string } =
	readsSummary ?
		class extends ReadIssues {
			get summary(): string {
				let summary = ""
				// its first line isn't added to "", as a string added is a call
				for (const issue of this._)
					summary = summary ? summary + "\n" + lineOf(issue) : lineOf(issue)
				return summary
			}
		}
	:	(ReadIssues as never)

const Issues: new () => Issues = (
	readsErrors ?
		class ArkIssues extends SummarizedIssues {
			throw(): never {
				throw new ThrownIssues(this as never)
			}

			toJSON(): readonly unknown[] {
				return this.issues
			}

			toString(): string {
				return this.summary
			}
		}
	:	SummarizedIssues) as never

/**
 * The errors returned by a Type on invalid input.
 */
interface Issues extends ReadIssues {
	/**
	 * A human-readable summary of all errors.
	 */
	readonly summary: string
	/**
	 * Throw a TraversalError based on these errors.
	 */
	throw(): never
	toJSON(): readonly unknown[]
	toString(): string
	/** @internal set by a build asking for only the first issue */
	failFast?: true
	/** @internal arktype's errors, which copy their contexts when merged */
	_merge?(merged: Issues, prefix: array<PropertyKey>): void
	/** @internal arktype's errors, grouped by path */
	readonly _i?: ArkIssue[]
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

	override _at(site: FailureSite, data: unknown, key?: PropertyKey): true {
		super._at(site, data, key)
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
	if (!errors._.length) errors._at({ code: "predicate" }, data)
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
	if (!errors._.length) errors._at({ code: "predicate" }, data)
	return onFail ? onFail(errors) : errors
}

type Keyed = Record<PropertyKey, unknown>

export const issueAt = (
	path: PropertyKey[],
	site: FailureSite,
	data: unknown,
	key: PropertyKey | undefined
): ArkIssue => {
	let context = (readsKeySites ? site.v : undefined) ?? (site as SiteContext)
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
	if (writesText) {
		customIssue(issue, context.c)
		context.text?.(issue)
	}
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

/** @internal how a message was configured: see SiteContext.c */
export type Custom = 1 | 2

/**
 * @internal notes how an issue's message was configured, which a summary
 * writes it by. Defined on the issue so it isn't enumerable, as only what its
 * readers see is, and so another copy of this module reads it, as arktype's
 * does of a validator's bundled apart from it and of another copy's errors
 */
export const customIssue = <issue extends ArkIssue>(
	issue: issue,
	c: Custom | undefined
): issue =>
	writesText && c !== issue._c ?
		Object.defineProperty(issue, "_c", { value: c, configurable: true })
	:	issue

/** @internal how an issue's message was configured, if it was */
export const customOf = (issue: ArkIssue): Custom | undefined =>
	writesText ? issue._c : undefined

/**
 * @internal notes that a message supplied for an issue was written from what
 * it expected, like one read from another copy of arktype, so a summary
 * writes it after its path
 */
export const templatedIssue = <issue extends ArkIssue>(issue: issue): issue =>
	customIssue(issue, undefined)

/** @internal whether an issue's message is a sentence configured or supplied for it */
export const isCustomIssue = (issue: ArkIssue): boolean =>
	customOf(issue) !== undefined

/** @internal an issue at another path, saying what it did */
export const movedIssue = (issue: ArkIssue, path: PropertyKey[]): ArkIssue =>
	customIssue(
		{
			code: issue.code,
			path,
			data: issue.data,
			expected: issue.expected,
			message: issue.message
		},
		customOf(issue)
	)

/**
 * @internal the path as arktype's stringifyPath writes it: a key that isn't
 * an identifier is bracketed and quoted, as an index or a symbol (which has no
 * JSON) is bracketed
 */
export const pathOf = (issue: {
	readonly path: readonly PropertyKey[]
}): string => {
	let path = ""
	// one expression, as a bundler folds a flag only where one reads it
	for (const k of issue.path) {
		path =
			reportsIndices && typeof k === "number" ? path + `[${k}]`
			: bracketsKeys && !isIdentifier(k) ?
				path + `[${JSON.stringify(k) ?? String(k)}]`
				// a string isn't passed to String, which is a call
			:	(path && path + ".") + (typeof k === "string" ? k : String(k))
	}
	return path
}

let identifiers: Map<string, boolean> | undefined

// matching a key costs several times what finding it does, and most keys a
// path holds are a schema's own, so few. Data's, like a record's, aren't, so
// only the first 1024 are remembered. A function only where a build's flag
// leaves it, as a bundler drops one in a branch it folds
const isIdentifier: (k: PropertyKey) => boolean =
	bracketsKeys ?
		k => {
			if (typeof k !== "string") return /^[$_a-z][\w$]*$/i.test(String(k))
			let result = (identifiers ??= new Map()).get(k)
			if (result === undefined) {
				result = /^[$_a-z][\w$]*$/i.test(k)
				if (identifiers.size < 1024) identifiers.set(k, result)
			}
			return result
		}
	:	(undefined as never)

/**
 * @internal an issue's line of a summary: its message after its path, one
 * configured or supplied as a sentence after a colon. A union listing its
 * branches' issues names each one's path instead. Each flag is read in the
 * one expression returned: a bundler that inlines a flag as it prints folds
 * an expression it's in, and leaves a statement testing it, and a function
 * returning it, as they are. A listed issue's message is set as it's created
 */
export const lineOf = (issue: ArkIssue): string => {
	const message = (issue.message ??= messageOf(issue))
	const path = pathOf(issue)
	return (
		listsUnions && issue._l !== undefined ? issue._l
		: path ? path + (writesText && issue._c ? ": " : " ") + message
		: message
	)
}

// what an issue says where no message is configured for it, naming no path.
// An undeclared key's site says what's expected. Only a missing key's says
// what the value was, since writing any other value would ship a printer
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

const ThrownIssues: new (errors: Issues) => ThrownIssues = (
	readsErrors ?
		class TraversalError extends Error {
			declare readonly name: "TraversalError"
			declare arkErrors: Issues

			constructor(errors: Issues) {
				super(errors.summary)

				// assigned, as a field's initializer compiles where the class is defined
				this.name = "TraversalError"
				// defined, so it's neither enumerable nor writable
				Object.defineProperty(this, "arkErrors", { value: errors })
			}
		}
	:	undefined) as never

export { ThrownIssues as TraversalError }

export const throwIssues = (apply: CompactApply, data: unknown): never => {
	const errors = new Issues()
	apply(data, errors)
	if (!errors._.length) errors._at({ code: "predicate" }, data)
	return errors.throw()
}
