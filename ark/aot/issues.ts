import { hasArkKind, type ArkErrors } from "@ark/schema"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import type { ArkIssue } from "@ark/schema/runtime"

export interface KeptIssue {
	code: string
	path: PropertyKey[]
	data: unknown
}

// the code, path and data of each issue a validator keeps
export const keptIssuesOf = (
	errors: ArkErrors,
	// false reads every issue added, which a first-issue validator keeps one of
	grouped = true
): KeptIssue[] =>
	keptOf(errors, grouped)
		.map(({ code, path, data }) => ({ code, path: [...path], data }))
		.sort((l, r) => (sortKeyOf(l) < sortKeyOf(r) ? -1 : 1))

// each issue a validator keeps, as arktype keeps every one added
export const keptOf = (errors: ArkErrors, grouped = true): ArkIssue[] => [
	...(grouped ? errors.issues : errors._)
]

// a TraversalError's errors, or the cause of an errors "none" assertion
export const thrownErrorsOf = (thrown: unknown): ArkErrors | undefined =>
	!(thrown instanceof Error) ? undefined
	: "arkErrors" in thrown ? (thrown.arkErrors as ArkErrors)
	: "cause" in thrown && hasArkKind(thrown.cause, "errors") ? thrown.cause
	: undefined

export const thrownIssuesOf = (
	thrown: unknown,
	grouped = true
): KeptIssue[] | undefined => {
	const errors = thrownErrorsOf(thrown)
	return errors && keptIssuesOf(errors, grouped)
}

export const pathKeyOf = (path: readonly PropertyKey[]): string =>
	path.map(String).join("\0")

const sortKeyOf = (issue: KeptIssue) =>
	[...issue.path.map(String), issue.code].join("\0")
