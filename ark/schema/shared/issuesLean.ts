import type { array } from "@ark/util"
import type {
	ArkIssue,
	CompactApply,
	FailureContext,
	FailureSite,
	SiteContext
} from "./issues.ts"
import {
	bracketsKeys,
	listsUnions,
	readsErrors,
	readsKeySites,
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

	/** @internal */
	_at(site: FailureSite, data: unknown, key?: PropertyKey): true | undefined {
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

const SummarizedIssues: new () => ReadIssues & { readonly summary: string } =
	readsSummary ?
		class extends ReadIssues {
			get summary(): string {
				return this.issues.map(issue => issue.message).join("\n")
			}
		}
	:	(ReadIssues as never)

const Issues: new () => Issues = (
	readsErrors ?
		class ArkErrors extends SummarizedIssues {
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
}

export { Issues as ArkErrors }

export class FirstIssues extends Issues {
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
	return issue
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

export const foundErrors = (
	apply: CompactApply,
	data: unknown,
	onFail: ((errors: Issues) => unknown) | null,
	Ctx: new () => Issues = Issues
): unknown => {
	const errors = new Ctx()
	// as issuesOf, which a program of these never ships
	apply(data, errors)
	if (!errors._.length) errors._at({ code: "predicate" }, data)
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

// the path as issues.ts writes it
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
				super(errors.summary)

				// assigned, as a field's initializer compiles where the class is defined
				this.name = "TraversalError"
				// defined, so it's neither enumerable nor writable
				Object.defineProperty(this, "arkErrors", { value: errors })
			}
		}
	:	undefined) as never

export { ThrownIssues as TraversalError }
