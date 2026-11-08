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

// a union's issue, which says what its branches' first issues did: its
// message with their paths whole, what it expects with them from its own, as
// the problem of arktype's union is written
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
		message: string,
		expected: string
	) {
		this.path = path
		this.data = data
		this.errors = errors
		this.message = message
		this.expected = expected
	}
}

export type UnionIssueOf = (
	path: PropertyKey[],
	data: unknown,
	errors: readonly ArkIssue[]
) => ArkIssue

// issues at other paths, each message written at its own unless supplied
const movedBy = (
	errors: readonly ArkIssue[],
	path: (error: ArkIssue) => PropertyKey[]
): ArkIssue[] =>
	errors.map(error => ({
		...error,
		path: path(error),
		message: error.message === messageOf(error) ? undefined : error.message
	}))

// what write lists of errors, each path written from a union's at path
export const writeFromPath = (
	path: array<PropertyKey>,
	errors: readonly ArkIssue[],
	write: (errors: readonly ArkIssue[]) => string
): string =>
	write(
		path.length ?
			movedBy(errors, error => error.path.slice(path.length))
		:	errors
	)

// its readers, what pipes a validator and Standard Schema, only call what an
// issue holds, so name nothing a bundler would then keep where a program has
// no such reader or no union
const issueWriterOf = (
	write: (errors: readonly ArkIssue[]) => string
): UnionIssueOf =>
	rewritesUnions ?
		(() => {
			class RewrittenIssue extends ListedIssue {
				_m(prefix: array<PropertyKey>): ArkIssue {
					const moved = movedBy(this.errors, error => [
						...prefix,
						...error.path
					])
					// moved alike, its errors' paths from its own are as they were
					return new RewrittenIssue(
						[...prefix, ...this.path],
						this.data,
						moved,
						write(moved),
						this.expected
					)
				}

				// as if data at its path were validated alone
				_r(): string {
					return this.expected
				}
			}
			return (path, data, errors) =>
				new RewrittenIssue(
					path.slice(),
					data,
					errors,
					write(errors),
					writeFromPath(path, errors, write)
				)
		})()
	:	(path, data, errors) =>
			new ListedIssue(
				path.slice(),
				data,
				errors,
				write(errors),
				writeFromPath(path, errors, write)
			)

export const listedIssue: UnionIssueOf =
	/* @__PURE__ */ issueWriterOf(writeListed)

export const alikeIssue: UnionIssueOf =
	/* @__PURE__ */ issueWriterOf(writeAlike)
