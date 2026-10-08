import {
	appendUnique,
	describeCollapsibleDate,
	domainDescriptions,
	domainOf,
	envHasCsp,
	flatMorph,
	functionNameOf,
	isValidDate,
	objectKindOrDomainOf,
	printable,
	throwError
} from "@ark/util"
import type { ErrorConfig, ResolvedConfig } from "./config.ts"
import type { Predicate } from "./predicate.ts"
import type { Morph } from "./roots/morph.ts"
import type {
	ActualWriter,
	ArkError,
	ArkErrorCode,
	ExpectedWriter,
	MessageWriter,
	ProblemWriter
} from "./shared/errors.ts"
import { describeCause, keywordWriterOf, type Locale } from "./shared/locale.ts"
import { configureLocale, defaultLocale } from "./shared/render.ts"

export * from "./shared/errors.ts"
export * from "./shared/transform.ts"
export * from "./shared/traversal.ts"
export { isAbsent } from "./shared/utils.ts"
export { arrayIndexMatcher } from "./structure/shared.ts"

// compiled code and the runtime it calls change together, so an artifact runs only on the version it was built for
export const abiVersion = 1

export const assertAbiVersion = (version: number): void => {
	if (version !== abiVersion)
		throwError(writeAbiVersionMismatchMessage(version, abiVersion))
}

// node error contexts carry their descriptions, so expected reads them rather than describing a node
const writeExpected: ExpectedWriter = ctx => ctx.description!

const writeActual: ActualWriter = data => printable(data)

const writeProblem: ProblemWriter = ({ expected, actual }) =>
	`must be ${expected}${actual ? ` (was ${actual})` : ""}`

const writeMessage: MessageWriter = ctx => {
	const propString = ctx.propString
	if (propString === "") return ctx.problem
	// clarify paths like [1], [0][1], and ["key!"] that could be confusing
	return propString[0] === "[" ?
			`value at ${propString} ${ctx.problem}`
		:	`${propString} ${ctx.problem}`
}

const describeBranches = (descriptions: string[]): string => {
	if (descriptions.length === 0) return "never"

	if (descriptions.length === 1) return descriptions[0]
	if (
		(descriptions.length === 2 &&
			descriptions[0] === "false" &&
			descriptions[1] === "true") ||
		(descriptions[0] === "true" && descriptions[1] === "false")
	)
		return "boolean"

	// keep track of seen descriptions to avoid duplication
	const seen: Record<string, true | undefined> = Object.create(null)
	const unique = descriptions.filter(s => (seen[s] ? false : (seen[s] = true)))
	const last = unique.pop()!

	return `${unique.join(", ")}${unique.length ? " or " : ""}${last}`
}

const describePredicate = (ctx: { predicate?: Predicate; morph?: Morph }) => {
	const fn = ctx.predicate ?? ctx.morph
	return `valid according to ${(fn && functionNameOf(fn)) || "an anonymous predicate"}`
}

// each code's writers that read data or other errors, as arktype writes them
const errorWritersByCode: {
	[code in ArkErrorCode]: ErrorConfig<code>
} = {
	after: { actual: describeCollapsibleDate },
	before: { actual: describeCollapsibleDate },
	divisor: {},
	domain: {
		actual: data =>
			typeof data === "number" && !Number.isFinite(data) ?
				String(data)
			:	domainDescriptions[domainOf(data)]
	},
	exactLength: { actual: data => `${data.length}` },
	intersection: {
		expected: source =>
			`  ◦ ${source.errors.map(e => e.expected).join("\n  ◦ ")}`,
		problem: ctx => `(${ctx.actual}) must be...\n${ctx.expected}`
	},
	max: {},
	maxLength: { actual: data => `${data.length}` },
	min: {},
	minLength: {
		// avoid default message like "must be non-empty (was 0)"
		actual: data => (data.length === 0 ? "" : `${data.length}`)
	},
	pattern: {},
	predicate: {
		// error contexts from ctx.reject have neither a description nor a predicate
		expected: ctx => ctx.description ?? describePredicate(ctx),
		// a keyword's nodes describe their errors through meta, so its phrase
		// writes only errors it raises through ctx: their actual, and the
		// problem of one that carries what the keyword caught
		actual: (data, ctx, info) => {
			const locale = info as Locale
			const actual =
				ctx.predicate === undefined ?
					keywordWriterOf(ctx, locale, "actual")
				:	undefined
			return (
				actual === undefined ?
					ctx.morph ?
						`aborted due to error:\n    ${describeCause(ctx.cause)}\n`
					:	printable(data)
				: typeof actual === "string" ? actual
				: actual(data, ctx, locale)
			)
		},
		problem: (ctx, info) => {
			const locale = info as Locale
			const problem =
				ctx.cause === undefined ?
					undefined
				:	keywordWriterOf(ctx, locale, "problem")
			return (
				problem === undefined ? locale.problem(ctx, locale)
				: typeof problem === "string" ? problem
				: problem(ctx, locale)
			)
		}
	},
	proto: {
		actual: data =>
			data instanceof Date && !isValidDate(data) ?
				"an invalid Date"
			:	objectKindOrDomainOf(data)
	},
	required: {
		expected: ctx => ctx.missingValueDescription,
		actual: () => "missing"
	},
	union: {
		expected: ctx => {
			const errorsAtPaths: ArkError[][] = []
			for (const error of ctx.errors) {
				const errorsAtPath = errorsAtPaths.find(
					errors => errors[0].propString === error.propString
				)
				if (errorsAtPath) errorsAtPath.push(error)
				else errorsAtPaths.push([error])
			}
			const pathDescriptions = errorsAtPaths.map(errors => {
				const path = errors[0].propString
				const branchesAtPath: string[] = []
				for (const errorAtPath of errors)
					appendUnique(branchesAtPath, errorAtPath.expected)

				const expected = describeBranches(branchesAtPath)
				// if there are multiple actual descriptions that differ,
				// just fall back to printable, which is the most specific
				const firstActual = errors[0].actual
				const actual =
					errors.every(e => e.actual === firstActual) ? firstActual : (
						printable(errors[0].data)
					)
				return `${path && `${path} `}must be ${expected}${
					actual && ` (was ${actual})`
				}`
			})
			return describeBranches(pathDescriptions)
		},
		problem: ctx => ctx.expected,
		message: ({ problem }) => {
			if (problem[0] === "[") {
				// clarify paths like [1], [0][1], and ["key!"] that could be confusing
				return `value at ${problem}`
			}

			return problem
		}
	},
	unit: {
		problem: ({ expected, actual }) =>
			`${expected === actual ? `must be reference equal to ${expected} (serialized to the same value)` : `must be ${expected} (was ${actual})`}`
	},
	undeclared: { expected: "removed", actual: "" },
	discriminant: {
		actual: (data, e) =>
			e.discriminantKind === "domain" ?
				domainDescriptions[domainOf(data)]
			:	printable(data)
	}
}

// en, as far as the runtime's writers read it
export const runtimeLocale = {
	keywordPhrases: {} as Record<string, Locale.KeywordPhrase>,
	actual: writeActual,
	problem: writeProblem,
	message: writeMessage
}

// unless arktype has resolved its config, which sets the locale itself
if (defaultLocale === undefined)
	configureLocale(undefined, runtimeLocale as never)

// what traversal reads from a config: each error code's writers, and whether ArkError may compile
export const resolvedConfig: ResolvedConfig = {
	...flatMorph(errorWritersByCode, (code, writers) => [
		code,
		{
			expected: writeExpected,
			actual: writeActual,
			problem: writeProblem,
			message: writeMessage,
			...writers
		}
	]),
	jitless: envHasCsp(),
	onFail: null
} as never

export const writeAbiVersionMismatchMessage = <
	artifactVersion extends number,
	runtimeVersion extends number
>(
	artifactVersion: artifactVersion,
	runtimeVersion: runtimeVersion
): writeAbiVersionMismatchMessage<artifactVersion, runtimeVersion> =>
	`This artifact was built for version ${artifactVersion} of arktype's runtime, but version ${runtimeVersion} is installed. Rebuild it with the installed arktype.`

export type writeAbiVersionMismatchMessage<
	artifactVersion extends number,
	runtimeVersion extends number
> = `This artifact was built for version ${artifactVersion} of arktype's runtime, but version ${runtimeVersion} is installed. Rebuild it with the installed arktype.`
