import { appendStringifiedKey, hasOwn, stringifyPath } from "@ark/util"

// Functions reading what errors already hold: each issue's path and message.
// They need nothing of a Type, so arktype/runtime exports them for a
// standalone validator's errors as well as arktype's. Kept apart from
// errors.ts so a program importing one bundles only this module.

/** an issue as the readers read it, arktype's or a standalone validator's */
export interface PathedIssue {
	readonly path: readonly PropertyKey[]
	readonly message: string
	/** written by arktype as the issue is, absent from a standalone validator's */
	readonly propString?: string
}

/** errors as the readers read them, arktype's or a standalone validator's */
export interface ReadableErrors<issue extends PathedIssue = PathedIssue> {
	readonly issues: readonly issue[]
}

/**
 * The first error at each path, by the string of the path.
 */
export const byPath = <issue extends PathedIssue>(
	errors: ReadableErrors<issue>
): Record<string, issue> => {
	const result: Record<string, issue> = {}
	for (const error of errors.issues) {
		const k = propStringOf(error)
		if (!hasOwn(result, k)) defineEntry(result, k, error)
	}
	return result
}

/**
 * Each path's errors, by the string of the path.
 */
export const flatByPath = <issue extends PathedIssue>(
	errors: ReadableErrors<issue>
): Record<string, issue[]> => {
	const result: Record<string, issue[]> = {}
	for (const error of errors.issues)
		addEntry(result, propStringOf(error), error)
	return result
}

/**
 * Each path's messages, by the string of the path.
 */
export const flatMessagesByPath = (
	errors: ReadableErrors
): Record<string, string[]> => {
	const result: Record<string, string[]> = {}
	for (const error of errors.issues)
		addEntry(result, propStringOf(error), error.message)
	return result
}

/**
 * All path strings at which errors are present mapped to the errors occuring
 * at that path or any nested path within it.
 */
export const byAncestorPath = <issue extends PathedIssue>(
	errors: ReadableErrors<issue>
): Record<string, issue[]> => {
	const result: Record<string, issue[]> = {}
	for (const error of errors.issues) {
		let propString = ""
		addEntry(result, propString, error)
		for (const k of error.path) {
			propString = appendStringifiedKey(propString, k)
			addEntry(result, propString, error)
		}
	}
	return result
}

// a standalone validator's issue, or one another copy of arktype wrote, holds
// no propString, so its path is written as arktype would write it
const propStringOf = (error: PathedIssue): string =>
	error.propString ?? stringifyPath(error.path)

const addEntry = <v>(result: Record<string, v[]>, k: string, value: v) => {
	if (hasOwn(result, k)) result[k].push(value)
	else defineEntry(result, k, [value])
}

// defined, since assigning a path "__proto__" would set the prototype
const defineEntry = (result: object, k: string, value: unknown) =>
	Object.defineProperty(result, k, {
		value,
		enumerable: true,
		writable: true,
		configurable: true
	})
