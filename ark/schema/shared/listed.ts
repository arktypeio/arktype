import type { array } from "@ark/util"
import type { ArkErrorCode } from "./errors.ts"
import { rewritesUnions, writesText } from "./issueFeatures.ts"
import {
	customIssue,
	customOf,
	lineOf,
	messageOf,
	pathOf,
	type ArkIssue
} from "./issues.ts"

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
		const path = pathOf(error)
		;(atSubject[(path && path + " ") + "must be "] ??= []).push(error)
	}
	return writeBranches(
		Object.entries(atSubject).map(
			([subject, same]) => subject + writeBranches(alternativesOf(same))
		)
	)
}

// where a union's branches can only fail alike, as `string.ip`'s formats do,
// what listing them writes is any one's line
const writeAlike = (errors: readonly ArkIssue[]): string => {
	for (const error of errors) error.message ??= messageOf(error)
	return lineOf(errors[0])
}

/**
 * @internal
 * the message each issue's Type was configured with or its callback supplied,
 * if they agree, which a union of them says too, as arktype's does. One
 * configured for a code isn't its Type's, so it's listed
 */
export const sharedMessageOf = (
	errors: readonly ArkIssue[]
): string | undefined => {
	let shared: string | undefined
	for (const error of errors) {
		if (
			customOf(error) !== 1 ||
			(shared !== undefined && error.message !== shared)
		)
			return
		shared = error.message
	}
	return shared
}

// a union's issue, which says what its branches' first issues did: its line
// of a summary with their paths whole, and its message and what it expects
// with them from its own, as arktype's union is written
class ListedIssue implements ArkIssue {
	code: ArkErrorCode = "union"
	declare path: PropertyKey[]
	declare data: unknown
	declare errors: readonly ArkIssue[]
	declare expected: string
	declare message: string
	// private, so only what an issue's readers see is its own
	#line: string | undefined

	constructor(
		path: PropertyKey[],
		data: unknown,
		errors: readonly ArkIssue[],
		// undefined where its message is written after its path, as any issue's is
		line: string | undefined,
		expected: string,
		message = expected
	) {
		this.path = path
		this.data = data
		this.errors = errors
		this.expected = expected
		this.message = message
		this.#line = line
	}

	get _l(): string | undefined {
		return this.#line
	}
}

export type UnionIssueOf = (
	path: PropertyKey[],
	data: unknown,
	errors: readonly ArkIssue[]
) => ArkIssue

// issues at other paths, each saying what it did
const movedBy = (
	errors: readonly ArkIssue[],
	path: (error: ArkIssue) => PropertyKey[]
): ArkIssue[] =>
	errors.map(error =>
		customIssue({ ...error, path: path(error) }, customOf(error))
	)

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

// a union whose every branch fails at its basis, at the union's own path, is
// reported by what the bases are, holding no errors, as arktype's is
const basesIssueOf = (
	path: PropertyKey[],
	data: unknown,
	errors: readonly ArkIssue[],
	describe: (expected: string[]) => string
): ArkIssue | undefined => {
	for (const { code, path: at } of errors) {
		if (
			(code !== "domain" && code !== "proto" && code !== "unit") ||
			at.length !== path.length ||
			at.some((k, i) => k !== path[i])
		)
			return
	}
	const expected = describe(errors.map(error => error.expected!))
	// written after its path, as any issue saying what it expects is
	return new ListedIssue(
		path.slice(),
		data,
		[],
		undefined,
		expected,
		messageOf({ expected })
	)
}

// a union's issue of its branches' errors: what they share, said after its
// path as a sentence, else what listing them writes
const listed = (
	Issue: typeof ListedIssue,
	path: PropertyKey[],
	data: unknown,
	errors: readonly ArkIssue[],
	write: (errors: readonly ArkIssue[]) => string
): ArkIssue => {
	// written first, as it writes each error's message
	const line = write(errors)
	const expected = writeFromPath(path, errors, write)
	const shared = writesText ? sharedMessageOf(errors) : undefined
	return shared === undefined ?
			new Issue(path.slice(), data, errors, line, expected)
		:	customIssue(
				new Issue(path.slice(), data, errors, undefined, expected, shared),
				1
			)
}

// its readers, what pipes a validator and Standard Schema, only call what an
// issue holds, so name nothing a bundler would then keep where a program has
// no such reader or no union. Branches whose checks are all described alike
// describe their bases alike, so they're described by the first one's, leaving
// out what lists them
const issueWriterOf = (
	write: (errors: readonly ArkIssue[]) => string,
	describeBases: (expected: string[]) => string
): UnionIssueOf =>
	rewritesUnions ?
		(() => {
			class RewrittenIssue extends ListedIssue {
				_m(prefix: array<PropertyKey>): ArkIssue {
					const moved = movedBy(this.errors, error => [
						...prefix,
						...error.path
					])
					// moved alike, its errors' paths from its own are as they
					// were, as is a message that names none
					return customIssue(
						new RewrittenIssue(
							[...prefix, ...this.path],
							this.data,
							moved,
							this._l === undefined ? undefined : write(moved),
							this.expected,
							this.message
						),
						customOf(this)
					)
				}
			}
			return (path, data, errors) =>
				basesIssueOf(path, data, errors, describeBases) ??
				listed(RewrittenIssue, path, data, errors, write)
		})()
	:	(path, data, errors) =>
			basesIssueOf(path, data, errors, describeBases) ??
			listed(ListedIssue, path, data, errors, write)

export const listedIssue: UnionIssueOf = /* @__PURE__ */ issueWriterOf(
	writeListed,
	writeBranches
)

export const alikeIssue: UnionIssueOf = /* @__PURE__ */ issueWriterOf(
	writeAlike,
	expected => expected[0]
)
