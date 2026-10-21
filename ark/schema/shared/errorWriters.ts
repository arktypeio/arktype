import {
	describeCollapsibleDate,
	domainDescriptions,
	domainOf,
	functionNameOf,
	printKind,
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
import {
	writeDomainActual,
	writeLengthActual,
	writeMinLengthActual,
	writeProblem,
	writeProtoActual,
	writeUnitProblem
} from "./enWriters.ts"
import type { NodeKind } from "./implement.ts"
import { describeCause, keywordWriterOf, type Locale } from "./locale.ts"
import { describeBranches, describeCases } from "./utils.ts"

export const writeMessage: MessageWriter = ctx => {
	const propString = ctx.propString
	if (propString === "") return ctx.problem
	// clarify paths like [1], [0][1], and ["key!"] that could be confusing
	return propString[0] === "[" ?
			`value at ${propString} ${ctx.problem}`
		:	`${propString} ${ctx.problem}`
}

// one writer per slot for each kind that doesn't write its own, so en can tell
// which are its kind's
export const errorWriters: {
	actual: ActualWriter
	problem: ProblemWriter
	message: MessageWriter
} = {
	actual: printKind,
	problem: writeProblem,
	message: writeMessage
}

export const errorWritersByCode: {
	[code in ArkErrorCode]: errorWritersOf<code>
} = {
	after: { actual: describeCollapsibleDate },
	before: { actual: describeCollapsibleDate },
	divisor: {},
	domain: { actual: writeDomainActual },
	exactLength: { actual: writeLengthActual },
	intersection: {
		expected: source =>
			`  ◦ ${source.errors.map(e => e.expected).join("\n  ◦ ")}`,
		problem: ctx => `(${ctx.actual}) must be...\n${ctx.expected}`
	},
	max: {},
	maxLength: { actual: writeLengthActual },
	min: {},
	minLength: { actual: writeMinLengthActual },
	pattern: {},
	// a keyword's nodes describe their errors through meta, so its phrase writes
	// only errors it raises through ctx: their actual, and the problem of one that
	// carries what the keyword caught
	predicate: {
		// error contexts from ctx.reject have neither a description nor a predicate
		expected: ctx => ctx.description ?? describePredicate(ctx),
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
					:	printKind(data)
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
	proto: { actual: writeProtoActual },
	required: {
		expected: ctx => ctx.missingValueDescription,
		actual: () => "missing"
	},
	union: {
		expected: ctx => {
			const path = ctx.errors[0]?.propString
			bracketed = path?.[0] === "["
			// a union's branches usually fail at one path, so they needn't be grouped
			if (ctx.errors.length && ctx.errors.every(e => e.propString === path))
				return (written = describeAtPath(ctx.errors))
			const errorsAtPaths: ArkError[][] = []
			for (const error of ctx.errors) {
				const errorsAtPath = errorsAtPaths.find(
					errors => errors[0].propString === error.propString
				)
				if (errorsAtPath) errorsAtPath.push(error)
				else errorsAtPaths.push([error])
			}
			return (written = describeBranches(errorsAtPaths.map(describeAtPath)))
		},
		// its message doesn't show it, so data that may be large isn't printed
		actual: printKind,
		problem: ctx => ctx.expected,
		message: ({ problem }) => {
			// text it wrote starts as its first path does
			if (problem === written ? bracketed : problem[0] === "[")
				return `value at ${problem}`

			return problem
		}
	},
	unit: {
		actual: printKind,
		problem: writeUnitProblem
	},
	undeclared: {
		expected: "removed",
		actual: ""
	},
	discriminant: {
		expected: e => e.description ?? describeCases(e),
		actual: (data, e) =>
			e.discriminantKind === "domain" ?
				domainDescriptions[domainOf(data)]
			:	printKind(data)
	}
}

// the expected a union last wrote, and whether it starts with a bracket
let written: string | undefined
let bracketed = false

const describeAtPath = (errors: readonly ArkError[]): string => {
	const path = errors[0].propString
	const branchesAtPath: string[] = []
	for (const e of errors)
		if (!branchesAtPath.includes(e.expected)) branchesAtPath.push(e.expected)

	const expected = describeBranches(branchesAtPath)
	// if there are multiple actual descriptions that differ,
	// just fall back to printing the data, which is the most specific
	const firstActual = errors[0].actual
	const actual =
		errors.every(e => e.actual === firstActual) ? firstActual : (
			printKind(errors[0].data)
		)
	return `${path && `${path} `}must be ${expected}${
		actual && ` (was ${actual})`
	}`
}

export type errorWritersOf<code extends ArkErrorCode> = requireKeys<
	ErrorConfig<code>,
	// a context unlike its node's inner, e.g. union's, needs expected
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
