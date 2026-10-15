import { arkKind, type array } from "@ark/util"
import type {
	ArkIssue,
	CompactApply,
	FailureContext,
	FailureSite
} from "./issues.ts"

// in place of issues.ts, so errors "none" ships nothing writing detail
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
		for (const issue of this._) issue.message ??= messageOf()
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
		errors._.push({ ...issue, path, message: placedMessageOf(path) })
	}
}

const placedMessageOf = (path: PropertyKey[]): string => {
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

export { issueOf as issueAt, issueOf as issueWith, issueOf as unionIssue }

// as issues.ts's, for arktype's own Apply applying a key's value
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
