// what errors "none" writes besides its errors' class
import { throwInternalError, type array } from "@ark/util"
import type { ArkErrors } from "./issuesNone.ts"
import type { ArkErrorCode } from "./errors.ts"
import type {
	ArkIssue,
	FailureContext,
	FailureSite,
	MissingText,
	SiteContext
} from "./issues.ts"
import { bracketsKeys } from "./issueFeatures.ts"

// as issues.ts's failsKey, failsSite, failsKeySite and missingTextOf, for a
// traversal a validator's Apply is piped into
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

// a size build's root apply, which errors "none" never writes
export const applyIssues = (): never =>
	throwInternalError('errors "none" applies no issues')

// errors "none" reports each failure as InvalidErrors, finding no issues
export const issuesOf = (): never =>
	throwInternalError('errors "none" finds no issues')

export const foundErrors = issuesOf

export const throwIssues = issuesOf

// the errors' own, as issues.ts's, so in source, where these are the full
// runtime's, what's thrown is that runtime's TraversalError
export const throwOnDefault = (errors: ArkErrors): never => errors.throw()

// a merged issue is at its path, which a summary names, as a default's check
// reports the key
export const mergeIssues = (
	errors: ArkErrors,
	merged: ArkErrors,
	prefix: array<PropertyKey>
): void => {
	for (const issue of merged._)
		errors._.push(movedIssue(issue, [...prefix, ...issue.path]))
}

export const movedIssue = (issue: ArkIssue, path: PropertyKey[]): ArkIssue => ({
	...issue,
	path
})

// as issues.ts writes a path
export const pathOf = (issue: {
	readonly path: readonly PropertyKey[]
}): string => {
	let at = ""
	for (const k of issue.path) {
		at +=
			bracketsKeys && !/^[$_a-z][\w$]*$/i.test(String(k)) ?
				`[${JSON.stringify(k) ?? String(k)}]`
			: typeof k === "number" ? `[${k}]`
			: (at && ".") + String(k)
	}
	return at
}

// wherever an issue is, it says only that data is invalid
export const messageOf = (): string => "is invalid"

// an issue's line of a summary: that it's invalid, after its path
export const lineOf = (issue: ArkIssue): string => {
	const at = pathOf(issue)
	return (at && at + " ") + (issue.message ?? "is invalid")
}

// no message is configured where none is written, so none is noted as its code's
export const isCustomIssue = (): boolean => false

export const codedIssue = <issue extends ArkIssue>(issue: issue): issue => issue

export const notedAs = (issue: ArkIssue, copy: ArkIssue): ArkIssue => copy

// no label is written where no message is
export const labeledIssue = <issue extends ArkIssue>(issue: issue): issue =>
	issue

export const labeledPathOf = pathOf

// what arktype's Apply reports into a piped ctx, replaced by the root issue
const issueOf = (path: PropertyKey[]): ArkIssue => ({
	code: "predicate",
	path: path.slice(),
	data: undefined,
	expected: undefined
})

export { issueOf as issueAt }
