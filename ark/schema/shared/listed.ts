import type { array } from "@ark/util"
import type { ArkErrorCode } from "./errors.ts"
import { messageOf, type ArkIssue } from "./issues.ts"

const writeBranches = (alternatives: string[]): string => {
	const unique = [...new Set(alternatives)]
	if ([...unique].sort().join() === "false,true") return "boolean"
	const last = unique.pop()!
	return unique.length ? `${unique.join(", ")} or ${last}` : last
}

// what arktype's union lists for issues failing at one path. An issue listing
// alternatives of its own, as a missing key's union or a discriminant's cases,
// is split by its text, the only place a validator holds them, so where one is
// written with `or` or a comma outside of quotes, it reads as if they were
const alternativesOf = (issues: ArkIssue[]): string[] =>
	issues.flatMap(({ code, expected = "valid" }) =>
		issues.length > 1 && /^(req|disc|union)/.test(code) ?
			expected.split(/(?:, | or )(?=(?:[^"]*"[^"]*")*[^"]*$)/)
		:	[expected]
	)

// each path as its own issue's message writes it, as arktype's union does
export const writeListed = (errors: readonly ArkIssue[], depth = 0): string => {
	// keyed by what `must be` ends, so no key is an object's own or an index
	const atSubject: Record<string, ArkIssue[]> = {}
	for (const error of errors) {
		error.message ??= messageOf(error)
		;(atSubject[
			messageOf({ path: error.path.slice(depth), expected: "" } as never)
		] ??= []).push(error)
	}
	return writeBranches(
		Object.entries(atSubject).map(
			([subject, same]) => subject + writeBranches(alternativesOf(same))
		)
	)
}

// a union's issue, which says what its branches' first issues did
export class ListedIssue implements ArkIssue {
	code: ArkErrorCode = "union"
	declare path: PropertyKey[]
	declare data: unknown
	declare errors: readonly ArkIssue[]
	declare expected: string
	declare message: string

	constructor(path: PropertyKey[], data: unknown, errors: readonly ArkIssue[]) {
		this.path = path
		this.data = data
		this.errors = errors
		this.expected = this.message = writeListed(errors)
	}

	// read from the prototype, so no issue lists it among its own keys. Marks
	// one with no reader of its text left in a bundle, which `instanceof` can't
	// where a copy of this runtime wrote it
	get _l(): true {
		return true
	}
}

// the issue at a path before its own, with its text written again there
export const relisted = (
	{ path, data, errors }: ArkIssue,
	prefix: array<PropertyKey>
): ArkIssue =>
	new ListedIssue(
		[...prefix, ...path],
		data,
		errors!.map(error => ({
			...error,
			path: [...prefix, ...error.path],
			message: error.message === messageOf(error) ? undefined : error.message
		}))
	)

// its text, as if data at its path were validated alone
export const listedFromPath = ({ errors, path }: ArkIssue): string =>
	writeListed(errors!, path.length)
