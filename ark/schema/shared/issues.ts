import { pathAt, type array } from "@ark/util"
import type { ArkErrorCode } from "./errors.ts"
import {
	bracketsKeys,
	listsUnions,
	readsKeySites,
	readsErrors,
	readsSummary,
	reportsIndices,
	runsArktype,
	writesText
} from "./issueFeatures.ts"
import { relisted } from "./listed.ts"
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
	problem?: string | undefined
	message?: string | undefined
	/** a union's: each branch's first issue */
	errors?: readonly ArkIssue[]
	/** @internal a union's listing its branches, not its own text */
	_l?: true
}

type WrittenIssue = ArkIssue & { message: string }

/** what a site reports: its code and description */
export interface SiteContext {
	code: ArkErrorCode
	description?: string | undefined
	/** the message configured for the site */
	x?: string | undefined
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
 * data's value at a key (failsIn)
 */
export interface FailureContext {
	_at(site: FailureSite, data: unknown, key?: PropertyKey): boolean | undefined
	_in(
		apply: CompactApply,
		data: unknown,
		key: PropertyKey,
		missing?: FailureSite
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
		if (writesText) context.text?.(issue)
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
				for (const issue of this._)
					summary += (summary && "\n") + (issue.message ??= messageOf(issue))
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
	/** @internal arktype's TraversalError message, one line per error */
	readonly _t?: string
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
	if (writesText) context.text?.(issue)
	return issue
}

export const throwOnDefault: Issues.Handler = errors => errors.throw()

// a merged issue's message is rewritten at its path unless supplied
export const mergeIssues = (
	errors: Issues,
	merged: Issues,
	prefix: array<PropertyKey>
): void => {
	for (const issue of merged.issues) {
		errors._.push(
			listsUnions && issue._l ?
				relisted(issue, prefix)
			:	{
					code: issue.code,
					path: [...prefix, ...issue.path],
					data: issue.data,
					expected: issue.expected,
					problem: issue.problem,
					message:
						issue.message === messageOf(issue) ? undefined : issue.message
				}
		)
	}
}

// the path as arktype's stringifyPath writes it: a key that isn't an
// identifier is bracketed and quoted, as an index or a symbol (which has no
// JSON) is bracketed
export const messageOf = (issue: ArkIssue): string => {
	let path = ""
	for (const k of issue.path) {
		path +=
			reportsIndices && typeof k === "number" ? `[${k}]`
			: bracketsKeys && !/^[$_a-z][\w$]*$/i.test(String(k)) ?
				`[${JSON.stringify(k) ?? String(k)}]`
			:	(path && ".") + String(k)
	}
	return (path && path + " ") + problemOf(issue)
}

// an undeclared key's site says what's expected
export const problemOf = (issue: ArkIssue): string =>
	(writesText ? issue.problem : undefined) ??
	(issue.expected !== undefined ? "must be " + issue.expected
	: issue.code === "required" ? "is missing"
	: "is invalid")

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
				super((runsArktype ? errors._t : undefined) ?? errors.summary)

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
