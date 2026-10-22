import type { array } from "@ark/util"
import type { ArkErrorCode } from "./errors.ts"
import type {
	ArkIssue,
	CompactApply,
	FailureContext,
	FailureSite,
	SiteContext
} from "./issues.ts"

type WrittenIssue = ArkIssue & { message: string }

type Keyed = Record<PropertyKey, unknown>

// in place of issues.ts, written for size
export class ArkErrors implements FailureContext {
	/** @internal each issue in the order it was added */
	_: ArkIssue[] = []
	/** @internal the path a fused traversal is at */
	_path: PropertyKey[] = []

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
		return this.issues.map(issue => issue.message).join("\n")
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
		this._.push(issueAt(this._path, site, data, key, absent))
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

export interface ArkErrors {
	/** @internal set by a build asking for only the first issue */
	failFast?: true
	/** @internal arktype's errors, which copy their contexts when merged */
	_merge?(merged: ArkErrors, prefix: array<PropertyKey>): void
}

// stops at the first issue
export class FirstIssues extends ArkErrors {
	override get failFast(): true {
		return true
	}
}

export const releasePath = (errors: ArkErrors): ArkErrors => errors

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
	const issue: ArkIssue = {
		code: context.code,
		path: site.path ? path.concat(site.path) : path.slice(),
		data,
		expected: context.description,
		message: undefined
	}
	context.text?.(issue)
	if (key !== undefined) path.pop()
	return issue
}

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
		return ctx.failsAt(missing, data, key, true)
	path.push(key)
	const continues = apply(value, ctx)
	path.pop()
	return !continues
}

// errors lacking throw() are thrown by the TraversalError it would build
export const throwOnDefault = (errors: ArkErrors): never => {
	throw new TraversalError(errors)
}

export const mergeIssues = (
	errors: ArkErrors,
	merged: ArkErrors,
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
	return path ? path + " " + problemOf(issue) : problemOf(issue)
}

export const problemOf = (issue: ArkIssue): string =>
	issue.problem ??
	(issue.expected === undefined ?
		(problems[issue.code] ?? "is invalid")
	:	"must be " + issue.expected)

const problems: { [code in ArkErrorCode]?: string } = {
	required: "is missing",
	undeclared: "must be removed"
}

export class TraversalError extends Error {
	readonly name = "TraversalError"
	declare arkErrors: ArkErrors

	constructor(errors: ArkErrors) {
		super(errors.summary)

		// defined, so it's neither enumerable nor writable
		Object.defineProperty(this, "arkErrors", { value: errors })
	}
}
