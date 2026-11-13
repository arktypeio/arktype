// what errors "none" writes besides its errors' class
import { throwInternalError, type array } from "@ark/util"
import type { ArkErrors } from "./issuesNone.ts"
import type { ArkIssue } from "./issues.ts"
import { bracketsKeys } from "./issueFeatures.ts"

// a size build's root apply, which errors "none" never writes
export const applyIssues = (): never =>
	throwInternalError('errors "none" applies no issues')

// errors "none" reports each failure as InvalidErrors, finding no issues
export const issuesOf = (): never =>
	throwInternalError('errors "none" finds no issues')

export const foundErrors = issuesOf

export const throwIssues = issuesOf

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

// a plain Error holds them as its cause, which the ES2020 lib lacks
export const throwOnDefault = (errors: ArkErrors): never => {
	throw new (Error as new (
		message: string,
		options: { cause: unknown }
	) => Error)("is invalid", { cause: errors })
}

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

// no message is configured where none is written
export const customIssue = <issue extends ArkIssue>(issue: issue): issue =>
	issue

export const customOf = (): undefined => undefined

export const isCustomIssue = (): boolean => false

export { customIssue as templatedIssue }

// what arktype's Apply reports into a piped ctx, replaced by the root issue
const issueOf = (path: PropertyKey[]): ArkIssue => ({
	code: "predicate",
	path: path.slice(),
	data: undefined,
	expected: undefined
})

export { issueOf as issueAt }
