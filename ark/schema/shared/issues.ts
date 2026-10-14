import { arkKind, type array } from "@ark/util"
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

/** what a site reports of a check, which a standalone validator reduces to its code and description */
export interface SiteContext {
	code: ArkErrorCode
	description?: string | undefined
}

/** a check's site: its node's context, a required key's when the key is missing, and where below the node a discriminant is read */
export interface FailureSite {
	value?: SiteContext
	missing?: SiteContext
	path?: PropertyKey[]
}

export interface UnionSite {
	meta?: object
	description: string
}

export interface FailureInput {
	code: ArkErrorCode
	data: unknown
	description?: string
	relativePath?: PropertyKey[]
}

// reports what fails to ctx, returning false only once traversal stops
export type CompactApply = (data: unknown, ctx: FailureContext) => boolean

/** where a compact Apply reports what fails, each method returning whether traversal stops */
export interface FailureContext {
	failsAt(
		site: FailureSite,
		data: unknown,
		key?: PropertyKey
	): boolean | undefined
	failsIn(
		apply: CompactApply,
		value: unknown,
		key?: PropertyKey,
		missing?: FailureSite,
		data?: unknown
	): boolean | undefined
}

// named apart from arktype's subclass, which keeps the runtime name ArkErrors
export { ArkIssues as ArkErrors }

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

	// fields are assigned by the constructor, since V8 creates a subclass's instances more slowly from initializers
	constructor() {
		this._ = []
		this._path = []
	}

	get [arkKind](): "errors" {
		return "errors"
	}

	/**
	 * The number of issues.
	 */
	get count(): number {
		return this._.length
	}

	/** @internal read by a check telling whether a predicate it ran added an issue */
	get currentErrorCount(): number {
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
		// joined in a loop, as map and join cost more than writing a message
		for (const issue of this.issues)
			summary += (summary && "\n") + issue.message
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
		key?: PropertyKey
	): true | undefined {
		const issue = issueAt(this._path, site, data, key)
		// the first issue is held in an array of its own size, which pushing to an empty one would allocate larger
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
		return failsIn(this, this._path, apply, value, key, missing, data)
	}
}

// a build asking for each validation's first issue stops there, as no check its Apply writes continues past one
export class FirstIssues extends ArkIssues {
	// read from the prototype, so no errors object lists it among its own keys
	override get failFast(): true {
		return true
	}
}

interface ArkIssues {
	/** @internal set by a build asking for only the first issue */
	failFast?: true
	/** @internal arktype's errors, which copy their contexts when merged */
	_merge?(merged: ArkIssues, prefix: array<PropertyKey>): void
	/** @internal arktype's errors, grouped by path */
	readonly _issues?: ArkIssue[]
	/** @internal arktype's message for a TraversalError, listing each error apart */
	readonly _thrown?: string
}

type Keyed = Record<PropertyKey, unknown>

// a key's site reports the object missing it, or the value at it, and a discriminant's the value at its path
export const issueAt = (
	path: PropertyKey[],
	site: FailureSite,
	data: unknown,
	key: PropertyKey | undefined
): ArkIssue =>
	key === undefined ?
		issueOf(
			site.value!,
			site.path ? [...path, ...site.path] : path.slice(),
			data
		)
	: site.missing && !(key in (data as object)) ?
		issueOf(site.missing, [...path, key], data)
	:	issueOf(site.value!, [...path, key], (data as Keyed)[key])

const issueOf = (
	context: SiteContext,
	path: PropertyKey[],
	data: unknown
): ArkIssue => ({
	code: context.code,
	path,
	data,
	expected: context.description
})

export const issueWith = (
	path: PropertyKey[],
	input: FailureInput
): ArkIssue => ({
	code: input.code,
	path: input.relativePath ? [...path, ...input.relativePath] : path.slice(),
	data: input.data,
	expected: input.description
})

// a standalone validator's union issue names what the union describes rather than each branch's error
export const unionIssue = (
	path: PropertyKey[],
	site: UnionSite,
	data: unknown
): ArkIssue => ({
	code: "union",
	path: path.slice(),
	data,
	expected: site.description
})

// a child's value is passed rather than read at its key, which a method every Apply shares would make megamorphic
export const failsIn = (
	ctx: FailureContext,
	path: PropertyKey[],
	apply: CompactApply,
	value: unknown,
	key: PropertyKey | undefined,
	missing: FailureSite | undefined,
	data: unknown
): boolean | undefined => {
	if (key === undefined) return !apply(value, ctx)
	if (missing && value === undefined && !(key in (data as object)))
		return ctx.failsAt(missing, data, key)
	path.push(key)
	const continues = apply(value, ctx)
	path.pop()
	return !continues
}

// a matcher asserting its default holds it as its onFail, which a standalone validator then reads from its runtime
export const throwOnDefault: ArkIssues.Handler = errors => errors.throw()

// a merged issue's message is written again at its path, unless it was supplied
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

export const messageOf = (issue: ArkIssue): string => {
	let path = ""
	for (const k of issue.path) {
		path +=
			typeof k === "number" ? `[${k}]`
			: path ? `.${String(k)}`
			: String(k)
	}
	return path ? `${path} ${problemOf(issue)}` : problemOf(issue)
}

export const problemOf = (issue: ArkIssue): string =>
	issue.problem ??
	(issue.expected === undefined ?
		(problems[issue.code] ?? "is invalid")
	:	`must be ${issue.expected}`)

const problems: { [code in ArkErrorCode]?: string } = {
	required: "is missing",
	undeclared: "must be removed"
}

export class TraversalError extends Error {
	readonly name = "TraversalError"
	declare arkErrors: ArkIssues

	constructor(errors: ArkIssues) {
		super(errors._thrown ?? errors.summary)

		// defined, so it's neither enumerable nor writable
		Object.defineProperty(this, "arkErrors", { value: errors })
	}
}
