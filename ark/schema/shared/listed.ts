import type { array } from "@ark/util"
import type { ArkErrorCode } from "./errors.ts"
import { rewritesUnions } from "./issueFeatures.ts"
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
export const writeListed = (errors: readonly ArkIssue[]): string => {
	// keyed by what `must be` ends, so no key is an object's own or an index
	const atSubject: Record<string, ArkIssue[]> = {}
	for (const error of errors) {
		error.message ??= messageOf(error)
		;(atSubject[messageOf({ path: error.path, expected: "" } as never)] ??=
			[]).push(error)
	}
	return writeBranches(
		Object.entries(atSubject).map(
			([subject, same]) => subject + writeBranches(alternativesOf(same))
		)
	)
}

// where a union's branches can only fail alike, as `string.ip`'s formats do,
// what listing them writes is any one's message
const writeAlike = (errors: readonly ArkIssue[]): string => {
	for (const error of errors) error.message ??= messageOf(error)
	return errors[0].message!
}

// a union's issue, which says what its branches' first issues did
class ListedIssue implements ArkIssue {
	code: ArkErrorCode = "union"
	declare path: PropertyKey[]
	declare data: unknown
	declare errors: readonly ArkIssue[]
	declare expected: string
	declare message: string

	constructor(
		path: PropertyKey[],
		data: unknown,
		errors: readonly ArkIssue[],
		text: string
	) {
		this.path = path
		this.data = data
		this.errors = errors
		this.expected = this.message = text
	}
}

export type UnionIssueOf = (
	path: PropertyKey[],
	data: unknown,
	errors: readonly ArkIssue[]
) => ArkIssue

// its readers, what pipes a validator and Standard Schema, only call what an
// issue holds, so name nothing a bundler would then keep where a program has
// no such reader or no union
const issueWriterOf = (
	write: (errors: readonly ArkIssue[]) => string
): UnionIssueOf =>
	rewritesUnions ?
		(() => {
			const movedBy = (
				errors: readonly ArkIssue[],
				path: (error: ArkIssue) => PropertyKey[]
			): ArkIssue[] =>
				errors.map(error => ({
					...error,
					path: path(error),
					message:
						error.message === messageOf(error) ? undefined : error.message
				}))
			class RewrittenIssue extends ListedIssue {
				_m(prefix: array<PropertyKey>): ArkIssue {
					const moved = movedBy(this.errors, error => [
						...prefix,
						...error.path
					])
					return new RewrittenIssue(
						[...prefix, ...this.path],
						this.data,
						moved,
						write(moved)
					)
				}

				// as if data at its path were validated alone
				_r(): string {
					return write(
						movedBy(this.errors, error => error.path.slice(this.path.length))
					)
				}
			}
			return (path, data, errors) =>
				new RewrittenIssue(path.slice(), data, errors, write(errors))
		})()
	:	(path, data, errors) =>
			new ListedIssue(path.slice(), data, errors, write(errors))

export const listedIssue: UnionIssueOf =
	/* @__PURE__ */ issueWriterOf(writeListed)

export const alikeIssue: UnionIssueOf =
	/* @__PURE__ */ issueWriterOf(writeAlike)
