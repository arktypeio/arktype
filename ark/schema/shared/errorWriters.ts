import {
	appendUnique,
	describeCollapsibleDate,
	domainDescriptions,
	domainOf,
	functionNameOf,
	isValidDate,
	listPattern,
	objectKindOrDomainOf,
	printable,
	type requireKeys
} from "@ark/util"
import type { ErrorConfig } from "../config.ts"
import type { Declaration, Inner } from "../kinds.ts"
import type { Predicate } from "../predicate.ts"
import type { Morph } from "../roots/morph.ts"
import type { BaseErrorContext } from "./declare.ts"
import type {
	ActualWriter,
	ArkError,
	ArkErrorCode,
	MessageWriter,
	ProblemWriter
} from "./errors.ts"
import type { NodeKind } from "./implement.ts"
import { describeCause, keywordWriterOf, type Locale } from "./locale.ts"
import { describeBranches } from "./utils.ts"

// one writer per slot for each kind that doesn't write its own, so en can tell
// which are its kind's
export const errorWriters: {
	actual: ActualWriter
	problem: ProblemWriter
	message: MessageWriter
} = {
	actual: data => printable(data),
	problem: ({ expected, actual }) =>
		`must be ${expected}${actual ? ` (was ${actual})` : ""}`,
	message: ctx => {
		const propString = ctx.propString
		if (propString === "") return ctx.problem
		// clarify paths like [1], [0][1], and ["key!"] that could be confusing
		return propString[0] === "[" ?
				`value at ${propString} ${ctx.problem}`
			:	`${propString} ${ctx.problem}`
	}
}

// what a writer you configure receives of en
export const enInfo: Locale.Info = {
	tag: "en",
	list: listPattern(
		{ two: " or ", middle: ", ", end: " or " },
		{ two: " and ", middle: ", ", end: " and " }
	),
	plural: n => (n === 1 ? "one" : "other"),
	number: String,
	date: describeCollapsibleDate,
	verbatim: text => text
}

export const errorWritersByCode: {
	[code in ArkErrorCode]: errorWritersOf<code>
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
			if (problem[0] === "[") return `value at ${problem}`

			return problem
		}
	},
	unit: {
		problem: ({ expected, actual }) =>
			`${expected === actual ? `must be reference equal to ${expected} (serialized to the same value)` : `must be ${expected} (was ${actual})`}`
	},
	undeclared: { expected: "removed", actual: "" },
	discriminant: {
		// a union's context describes its cases, which its locale lists otherwise
		expected: e =>
			e.description ??
			describeBranches(
				e.discriminantKind === "domain" ?
					e.cases.map(domain => domainDescriptions[domain])
				:	e.cases.map(unit => printable(unit, { ownDataOnly: true }))
			),
		// en names a domain by its noun, which is its description
		actual: (data, e) =>
			e.discriminantKind === "domain" ?
				domainDescriptions[domainOf(data)]
			:	printable(data)
	}
}

type errorWritersOf<code extends ArkErrorCode> = requireKeys<
	ErrorConfig<code>,
	// an error context unlike its node's inner, e.g. union's, can't be described by the node
	code extends NodeKind ?
		Inner<code> extends (
			Omit<
				Declaration<code>["errorContext"],
				keyof BaseErrorContext | "description"
			>
		) ?
			never
		:	"expected"
	:	"expected"
>

// reads predicate, or for pipe.try the morph that threw
export const describePredicate = (ctx: {
	predicate?: Predicate
	morph?: Morph
}): string => {
	const fn = ctx.predicate ?? ctx.morph
	return `valid according to ${(fn && functionNameOf(fn)) || "an anonymous predicate"}`
}
