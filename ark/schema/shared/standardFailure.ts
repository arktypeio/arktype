import type { StandardSchemaV1 } from "./standardSchema.ts"

/** what a failure is built from: errors of any class, each of which writes its own summary */
export type SummarizedErrors = {
	readonly issues: StandardSchemaV1.FailureResult["issues"]
	readonly summary: string
	toJSON?: () => readonly unknown[]
}

type StandardFailure = StandardSchemaV1.FailureResult & {
	/** @internal reads the errors' summary, or its JSON issues when passed true */
	_s: (json?: true) => unknown
}

// A failure's message is its errors' summary, which a consumer is to prefer
// to one it builds from issues (standard-schema/standard-schema#204). It's a
// getter, as arktype's own is, so a consumer reading issues alone, like most
// today, has none written, and the failure's own and enumerable, so copying
// or serializing one holds it.
//
// It's one getter for every failure. Written as `get message()` in the
// failure's literal it was a getter of its own for each, and V8 kept every
// such failure in dictionary mode (ark/repo/testV8.ts), with no shape to
// share: a failing validate then spent more building its result than finding
// its issues.
const message: PropertyDescriptor & ThisType<StandardFailure> = {
	get() {
		return this._s() as string
	},
	enumerable: true
}

// One shared non-enumerable toJSON so JSON.stringify(T["~standard"].validate(x))
// strips data/actual/non-JSON fields just like JSON.stringify(T(x)) without
// mutating result.issues or breaking V8 map sharing.
const toJson: PropertyDescriptor & ThisType<StandardFailure> = {
	value() {
		return {
			issues: this._s(true),
			message: this._s()
		}
	},
	writable: true,
	configurable: true
}

type SerializablePathSegment = { readonly key: string | number }

type SerializableIssue = StandardSchemaV1.Issue & {
	readonly code?: unknown
	readonly expected?: unknown
	readonly errors?: readonly SerializableIssue[]
}

const jsonKeyOf = (k: PropertyKey): string | number =>
	typeof k === "symbol" ? String(k) : k

const jsonPathOf = (
	path: readonly (PropertyKey | StandardSchemaV1.PathSegment)[]
): readonly (string | number | SerializablePathSegment)[] =>
	path.map(segment =>
		typeof segment === "object" && segment !== null ?
			{ key: jsonKeyOf(segment.key) }
		:	jsonKeyOf(segment)
	)

// fallback for lean or custom errors without toJSON(): keeps what an issue
// says and where, omitting data/actual/non-JSON fields like ArkErrors.toJSON()
const jsonIssueOf = (issue: SerializableIssue): Record<string, unknown> => ({
	...(issue.code !== undefined && { code: issue.code }),
	...(issue.path !== undefined && { path: jsonPathOf(issue.path) }),
	...(issue.expected !== undefined && { expected: issue.expected }),
	message: issue.message,
	...(issue.errors && { errors: issue.errors.map(jsonIssueOf) })
})

/**
 * @internal a Standard Schema failure of errors: their issues, and their
 * summary as its message once it's read.
 *
 * The summary is the errors' own rather than written from the issues, since
 * each errors class writes its own: arktype's in the locale they were read
 * in. What reads it is a function the failure holds, not the errors: a
 * failure kept in a reactive store is read through a proxy that wraps each
 * object it returns, and errors read through one can't tell their own. It's
 * held where neither a copy, a print nor a comparison of the failure finds
 * it, so the failure reads as Standard Schema's, and writable, as such a
 * proxy may not return another value for a property that's neither writable
 * nor configurable
 */
export const standardFailureOf = (
	errors: SummarizedErrors
): StandardSchemaV1.FailureResult =>
	Object.defineProperty(
		Object.defineProperty(
			Object.defineProperty({ issues: errors.issues }, "_s", {
				value: (json?: true) =>
					json ?
						typeof errors.toJSON === "function" ?
							errors.toJSON()
						:	errors.issues.map(jsonIssueOf)
					:	errors.summary,
				writable: true
			}),
			"message",
			message
		),
		"toJSON",
		toJson
	)
