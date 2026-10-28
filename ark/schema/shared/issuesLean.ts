import type { array } from "@ark/util"
import type {
	ArkIssue,
	CompactApply,
	FailureContext,
	FailureSite,
	SiteContext
} from "./issues.ts"
import { bracketsKeys } from "./issueFeatures.ts"

type WrittenIssue = ArkIssue & { message: string }

type Keyed = Record<PropertyKey, unknown>

// in place of issues.ts, written for size
export class ArkErrors implements FailureContext {
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
	_at(site: FailureSite, data: unknown, key?: PropertyKey): true | undefined {
		const path = this._p
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
		context.text?.(issue)
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

	override _at(site: FailureSite, data: unknown, key?: PropertyKey): true {
		super._at(site, data, key)
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
	context.text?.(issue)
	if (key !== undefined) path.pop()
	return issue
}

// the issues an Apply finds in data it rejected
export const issuesOf = (
	apply: CompactApply,
	data: unknown,
	errors: ArkErrors
): ArkIssue[] => {
	apply(data, errors)
	// data a write or a getter has made valid since fails as a whole
	if (!errors._.length) errors._at({ code: "predicate" }, data)
	return errors._
}

export const foundErrors = (
	apply: CompactApply,
	data: unknown,
	onFail: ((errors: ArkErrors) => unknown) | null,
	Ctx: new () => ArkErrors
): unknown => {
	const errors = new Ctx()
	issuesOf(apply, data, errors)
	return onFail ? onFail(errors) : errors
}

export const throwIssues = (apply: CompactApply, data: unknown): never => {
	const errors = new ArkErrors()
	issuesOf(apply, data, errors)
	return errors.throw()
}

// a root reporting into ArkErrors, as a size build applies it; they hold
// no path to release
export const applyIssues = (
	apply: CompactApply,
	data: unknown,
	onFail: ((errors: ArkErrors) => unknown) | null,
	Ctx: new () => ArkErrors = ArkErrors
): unknown => {
	const errors = new Ctx()
	apply(data, errors)
	return (
		!errors.count ? data
		: onFail ? onFail(errors)
		: errors
	)
}

export const throwOnDefault = (errors: ArkErrors): never => errors.throw()

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

// the path as issues.ts writes it
export const messageOf = (issue: ArkIssue): string => {
	let path = ""
	for (const k of issue.path) {
		path +=
			bracketsKeys && !/^[$_a-z][\w$]*$/i.test(String(k)) ?
				`[${JSON.stringify(k) ?? String(k)}]`
			: typeof k === "number" ? `[${k}]`
			: (path && ".") + String(k)
	}
	return (path && path + " ") + problemOf(issue)
}

// an undeclared key's site says what's expected
export const problemOf = (issue: ArkIssue): string =>
	issue.problem ??
	(issue.expected !== undefined ? "must be " + issue.expected
	: issue.code === "required" ? "is missing"
	: "is invalid")

export class TraversalError extends Error {
	declare readonly name: "TraversalError"
	declare arkErrors: ArkErrors

	constructor(errors: ArkErrors) {
		super(errors.summary)

		// assigned, as a field's initializer compiles where the class is defined
		this.name = "TraversalError"
		// defined, so it's neither enumerable nor writable
		Object.defineProperty(this, "arkErrors", { value: errors })
	}
}
