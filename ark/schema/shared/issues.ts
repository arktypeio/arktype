import type { array } from "@ark/util"
import type { ArkErrorCode } from "./errors.ts"
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
}

type WrittenIssue = ArkIssue & { message: string }

/** what a site reports: its code and description */
export interface SiteContext {
	code: ArkErrorCode
	description?: string | undefined
	/** writes text configured for the site onto its issue */
	text?: (issue: ArkIssue) => void
}

/** a check's site: its node's context, or a key's value and missing ones */
export interface FailureSite extends Partial<SiteContext> {
	value?: SiteContext
	missing?: SiteContext
	path?: PropertyKey[]
}

export interface UnionSite {
	meta?: object
	description: string
}

// reports what fails to ctx, returning false only once traversal stops
export type CompactApply = (data: unknown, ctx: FailureContext) => boolean

/** where a compact Apply reports failures; each returns whether to stop */
export interface FailureContext {
	failsAt(
		site: FailureSite,
		data: unknown,
		key?: PropertyKey,
		absent?: true
	): boolean | undefined
	failsIn(
		apply: CompactApply,
		value: unknown,
		key?: PropertyKey,
		missing?: FailureSite,
		data?: unknown
	): boolean | undefined
}

// named apart from arktype's subclass, which keeps the name ArkErrors
export { ArkIssues as ArkErrors }

// the path stack a validation left empty, which the next one takes
let releasedPath: PropertyKey[] | undefined

/** @internal once their Apply returns, errors pass their path on */
export const releasePath = (errors: ArkIssues): ArkIssues => {
	releasedPath = errors._path
	return errors
}

declare namespace ArkIssues {
	export type Handler<returns = unknown> = (errors: ArkIssues) => returns
}

/**
 * The errors returned by a Type on invalid input.
 */
class ArkIssues implements StandardSchemaV1.FailureResult, FailureContext {
	/** @internal each issue in the order it was added */
	declare _: ArkIssue[]
	/** @internal the path a fused traversal is at */
	declare _path: PropertyKey[]

	constructor() {
		this._ = []
		this._path = releasedPath ?? []
		releasedPath = undefined
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

	/**
	 * A human-readable summary of all errors.
	 */
	get summary(): string {
		let summary = ""
		for (const issue of this._)
			summary += (summary && "\n") + (issue.message ??= messageOf(issue))
		return summary
	}

	/**
	 * Throw a TraversalError based on these errors.
	 */
	throw(): never {
		throw new TraversalError(this)
	}

	toJSON(): readonly unknown[] {
		return this.issues
	}

	toString(): string {
		return this.summary
	}

	/** @internal */
	failsAt(
		site: FailureSite,
		data: unknown,
		key?: PropertyKey,
		absent?: true
	): true | undefined {
		const issue = issueAt(this._path, site, data, key, absent)
		if (this._.length) this._.push(issue)
		else this._ = [issue]
		return this.failFast
	}

	/** @internal */
	failsIn(
		apply: CompactApply,
		value: unknown,
		key?: PropertyKey,
		missing?: FailureSite,
		data?: unknown
	): boolean | undefined {
		if (key === undefined) return !apply(value, this)
		if (missing && value === undefined && !(key in (data as object)))
			return this.failsAt(missing, data, key, true)
		this._path.push(key)
		const continues = apply(value, this)
		this._path.pop()
		return !continues
	}
}

// stops at the first issue
export class FirstIssues extends ArkIssues {
	// read from the prototype, so no errors object lists it among its own keys
	override get failFast(): true {
		return true
	}
}

// a root reporting into ArkErrors, as a size build applies it
export const applyIssues = (
	apply: CompactApply,
	data: unknown,
	onFail: ArkIssues.Handler | null,
	Ctx: new () => ArkIssues = ArkIssues
): unknown => {
	const errors = new Ctx()
	apply(data, errors)
	return (
		!releasePath(errors).count ? data
		: onFail ? onFail(errors)
		: errors
	)
}

interface ArkIssues {
	/** @internal set by a build asking for only the first issue */
	failFast?: true
	/** @internal arktype's errors, which copy their contexts when merged */
	_merge?(merged: ArkIssues, prefix: array<PropertyKey>): void
	/** @internal arktype's errors, grouped by path */
	readonly _issues?: ArkIssue[]
	/** @internal arktype's TraversalError message, one line per error */
	readonly _thrown?: string
}

type Keyed = Record<PropertyKey, unknown>

// a key's site reports the missing key or its value
export const issueAt = (
	path: PropertyKey[],
	site: FailureSite,
	data: unknown,
	key: PropertyKey | undefined,
	absent?: true
): ArkIssue => {
	let context = site.value ?? (site as SiteContext)
	if (key !== undefined) {
		path.push(key)
		if (absent || (site.missing && !(key in (data as object))))
			context = site.missing!
		else data = (data as Keyed)[key]
	}
	const issuePath =
		site.path ? path.concat(site.path)
		: path.length === 1 ? [path[0]]
		: path.length === 2 ? [path[0], path[1]]
		: path.slice()
	const issue: ArkIssue = {
		code: context.code,
		path: issuePath,
		data,
		expected: context.description,
		message: undefined
	}
	context.text?.(issue)
	if (key !== undefined) path.pop()
	return issue
}

// a default's onFail, read from a standalone runtime
export const throwOnDefault: ArkIssues.Handler = errors => errors.throw()

// a merged issue's message is rewritten at its path unless supplied
export const mergeIssues = (
	errors: ArkIssues,
	merged: ArkIssues,
	prefix: array<PropertyKey>
): void => {
	for (const issue of merged.issues) {
		errors._.push({
			code: issue.code,
			path: [...prefix, ...issue.path],
			data: issue.data,
			expected: issue.expected,
			problem: issue.problem,
			message: issue.message === messageOf(issue) ? undefined : issue.message
		})
	}
}

// "[i]" for each index below 256 a message has written
const indexSegments: string[] = []

export const messageOf = (issue: ArkIssue): string => {
	let path = ""
	for (const k of issue.path) {
		if (typeof k === "number")
			path += k < 256 ? (indexSegments[k] ??= `[${k}]`) : `[${k}]`
		else {
			if (path) path += "."
			path += typeof k === "string" ? k : String(k)
		}
	}
	if (!path) return problemOf(issue)
	return issue.problem === undefined && issue.expected !== undefined ?
			path + " must be " + issue.expected
		:	path + " " + problemOf(issue)
}

// an undeclared key's site says what's expected
export const problemOf = (issue: ArkIssue): string =>
	issue.problem ??
	(issue.expected !== undefined ? "must be " + issue.expected
	: issue.code === "required" ? "is missing"
	: "is invalid")

export class TraversalError extends Error {
	declare readonly name: "TraversalError"
	declare arkErrors: ArkIssues

	constructor(errors: ArkIssues) {
		super(errors._thrown ?? errors.summary)

		// assigned, as a field's initializer compiles where the class is defined
		this.name = "TraversalError"
		// defined, so it's neither enumerable nor writable
		Object.defineProperty(this, "arkErrors", { value: errors })
	}
}
