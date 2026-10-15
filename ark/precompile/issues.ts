import { hasArkKind, type ArkError, type ArkErrors } from "@ark/schema"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import type { ArkIssue } from "@ark/schema/runtime"

export interface KeptIssue {
	code: string
	path: PropertyKey[]
	data: unknown
}

// what a standalone validator's errors keep of arktype's: each failed check's code, path and data, which arktype groups by path and orders as each path first failed
export const keptIssuesOf = (errors: ArkErrors): KeptIssue[] => {
	const issues = errors.issues.flatMap((issue): readonly ArkIssue[] =>
		issue.code === "intersection" ?
			(issue as ArkError<"intersection">).errors
		:	[issue]
	)
	// grouping, arktype keeps only a path's first issue for a value constrained to never
	const neverByPath = new Map<string, ArkIssue>()
	for (const issue of issues) {
		const key = issue.path.map(String).join("\0")
		if (isNever(issue) && !neverByPath.has(key)) neverByPath.set(key, issue)
	}
	return issues
		.filter(
			issue =>
				(neverByPath.get(issue.path.map(String).join("\0")) ?? issue) === issue
		)
		.map(({ code, path, data }) => ({ code, path: [...path], data }))
		.sort((l, r) => (sortKeyOf(l) < sortKeyOf(r) ? -1 : 1))
}

// arktype's error for never is a union of no branches, which a validator's issue describes as never, or not at all where a callback raised it
const isNever = (issue: ArkIssue) =>
	issue.code === "union" &&
	("errors" in issue ?
		(issue as ArkError<"union">).errors.length === 0
	:	issue.expected === "never" || issue.expected === undefined)

// what a TraversalError holds, as one another copy of the runtime threw does, or a plain Error a validator without error detail throws holds as its cause
export const thrownErrorsOf = (thrown: unknown): ArkErrors | undefined =>
	!(thrown instanceof Error) ? undefined
	: "arkErrors" in thrown ? (thrown.arkErrors as ArkErrors)
	: hasArkKind((thrown as { cause?: unknown }).cause, "errors") ?
		((thrown as { cause?: unknown }).cause as ArkErrors)
	:	undefined

export const thrownIssuesOf = (thrown: unknown): KeptIssue[] | undefined => {
	const errors = thrownErrorsOf(thrown)
	return errors && keptIssuesOf(errors)
}

const sortKeyOf = (issue: KeptIssue) =>
	[...issue.path.map(String), issue.code].join("\0")

// a default's ParseError is written from the errors of its value, whose text a standalone validator writes without what the value was
export const keptParseMessageOf = (message: string): string =>
	message.startsWith("Default") ?
		message.replace(/ \(was .*\)$/gm, "")
	:	message
