// what errors "none" writes besides its errors' class
import { throwInternalError, type array } from "@ark/util"
import type { ArkErrors } from "./issuesNone.ts"
import type { ArkIssue } from "./issues.ts"

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

// a merged issue names its path, as a default's check reports the key
export const mergeIssues = (
	errors: ArkErrors,
	merged: ArkErrors,
	prefix: array<PropertyKey>
): void => {
	for (const issue of merged._) {
		const path = [...prefix, ...issue.path]
		errors._.push({ ...issue, path, message: messageAt(path) })
	}
}

const messageAt = (path: PropertyKey[]): string => {
	let at = ""
	for (const k of path) {
		at +=
			typeof k === "number" ? `[${k}]`
			: at ? `.${String(k)}`
			: String(k)
	}
	return at ? `${at} is invalid` : "is invalid"
}

// wherever an issue is, it says only that data is invalid
export const messageOf = (): string => "is invalid"

export { messageOf as problemOf }

// what arktype's Apply reports into a piped ctx, replaced by the root issue
const issueOf = (path: PropertyKey[]): ArkIssue => ({
	code: "predicate",
	path: path.slice(),
	data: undefined,
	expected: undefined
})

export { issueOf as issueAt }
