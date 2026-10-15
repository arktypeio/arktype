import { arkKind, type array } from "@ark/util"
import type {
	ArkIssue,
	CompactApply,
	FailureContext,
	FailureSite
} from "./issues.ts"

// @ark/schema/runtime/none bundles this in place of issues.ts, so a build whose errors say only that data is invalid ships nothing writing an issue's detail
export class ArkErrors {
	declare _: ArkIssue[]

	constructor() {
		this._ = []
	}

	get [arkKind](): "errors" {
		return "errors"
	}

	get count(): number {
		return this._.length
	}

	get issues(): readonly ArkIssue[] {
		for (const issue of this._) issue.message ??= messageOf(issue)
		return this._
	}

	get summary(): string {
		return this.issues.map(issue => issue.message).join("\n")
	}

	toJSON(): readonly ArkIssue[] {
		return this.issues
	}

	toString(): string {
		return this.summary
	}
}

export { ArkErrors as FirstIssues }

// exported as issues.ts's is, though nothing throws it
export class TraversalError extends Error {
	readonly name = "TraversalError"
	declare arkErrors: ArkErrors

	constructor(errors: ArkErrors) {
		super(errors.summary)

		// defined, so it's neither enumerable nor writable
		Object.defineProperty(this, "arkErrors", { value: errors })
	}
}

// errors without detail have no throw(), so an assertion throws a plain Error holding them as its cause, an ES2022 option the ES2020 lib arktype is checked against doesn't declare
export const throwOnDefault = (errors: ArkErrors): never => {
	throw new (Error as new (
		message: string,
		options: { cause: unknown }
	) => Error)("is invalid", { cause: errors })
}

// a merged issue's message is written again at its path, unless it was supplied
export const mergeIssues = (
	errors: ArkErrors,
	merged: ArkErrors,
	prefix: array<PropertyKey>
): void => {
	for (const issue of merged.issues) {
		errors._.push({
			...issue,
			path: [...prefix, ...issue.path],
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
	return path ? `${path} ${problemOf()}` : problemOf()
}

export const problemOf = (): string => "is invalid"

// what arktype's own Apply reports, piped a validator's ctx by a callback, which the issue at the validation's root replaces
const issueOf = (path: PropertyKey[]): ArkIssue => ({
	code: "predicate",
	path: path.slice(),
	data: undefined,
	expected: undefined
})

export { issueOf as issueAt, issueOf as issueWith, issueOf as unionIssue }

// as issues.ts's, which this module replaces, for arktype's own Apply applying a key's value
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
