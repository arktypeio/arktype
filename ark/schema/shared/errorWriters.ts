import {
	describeCollapsibleDate,
	domainDescriptions,
	domainOf,
	printKind,
	type requireKeys
} from "@ark/util"
import type { ErrorConfig } from "../config.ts"
import type { Declaration, Inner } from "../kinds.ts"
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
	writeNotEqualActual,
	writeProblem,
	writeProtoActual,
	writeUnitActual,
	writeUnitProblem
} from "./enWriters.ts"
import type { NodeKind } from "./implement.ts"
import {
	actualAtPathOf,
	alternativesOf,
	describeCause,
	keywordWriterOf,
	type Locale
} from "./locale.ts"
import { describePredicate } from "./traversal.ts"
import { describeBranches, describeCases } from "./utils.ts"

export const writeMessage: MessageWriter = ctx => {
	const propString = ctx.propString
	if (propString === "") return ctx.problem
	// clarify paths like [1], [0][1], and ["key!"] that could be confusing
	return propString[0] === "[" ?
			`value at ${propString} ${ctx.problem}`
		:	`${propString} ${ctx.problem}`
}

// constraints described alike, like those under one configured message,
// are written once
const distinctExpectedOf = (errors: readonly ArkError[]): string[] => [
	...new Set(errors.map(e => e.expected))
]

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
		expected: source => {
			const expected = distinctExpectedOf(source.errors)
			return expected.length === 1 ?
					expected[0]
				:	`  ◦ ${expected.join("\n  ◦ ")}`
		},
		problem: (ctx, info) =>
			distinctExpectedOf(ctx.errors).length === 1 ?
				writeProblem(ctx, info)
			:	`(${ctx.actual}) must be...\n${ctx.expected}`
	},
	max: {},
	maxLength: { actual: writeLengthActual },
	min: {},
	minLength: { actual: writeMinLengthActual },
	notEqual: { actual: writeNotEqualActual },
	notEqualLength: { actual: writeLengthActual },
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
		expected: (ctx, locale) => {
			if (ctx.description !== undefined) return ctx.description
			const path = ctx.errors[0]?.propString
			// a union's branches usually fail at one path, so they needn't be grouped
			if (ctx.errors.length && ctx.errors.every(e => e.propString === path))
				return describeAtPath(ctx.errors, locale)
			const errorsAtPaths: ArkError[][] = []
			for (const error of ctx.errors) {
				const errorsAtPath = errorsAtPaths.find(
					errors => errors[0].propString === error.propString
				)
				if (errorsAtPath) errorsAtPath.push(error)
				else errorsAtPaths.push([error])
			}
			return describeBranches(
				errorsAtPaths.map(errors => describeAtPath(errors, locale))
			)
		},
		// data that may be large is printed by its kind
		actual: (data, ctx) => actualAtPathOf(ctx) ?? printKind(data),
		// its text is its errors', unless it has none, like never, or a description
		problem: (ctx, info) =>
			listsErrors(ctx) ? ctx.expected : writeProblem(ctx, info),
		message: (ctx, info) =>
			listsErrors(ctx) ? ctx.problem : writeMessage(ctx, info)
	},
	unit: {
		actual: writeUnitActual,
		problem: writeUnitProblem
	},
	undeclared: {
		expected: "removed",
		actual: ""
	},
	discriminant: {
		expected: e => e.description ?? describeCases(e),
		actual: (data, e) =>
			e.absent ? "missing"
			: e.discriminantKind === "domain" ? domainDescriptions[domainOf(data)]
			: printKind(data)
	}
}

const listsErrors = (ctx: {
	errors: readonly unknown[]
	description?: string
}): boolean => ctx.errors.length !== 0 && ctx.description === undefined

const describeAtPath = (
	errors: readonly ArkError[],
	locale: Locale.Info
): string => {
	const path = errors[0].propString
	const branchesAtPath: string[] = []
	for (const e of errors) {
		// a standalone build's locale is en's info alone, which names no alternatives
		const alternatives =
			"cite" in locale ? alternativesOf(e, locale as Locale) : [e.expected]
		for (const branch of alternatives)
			if (!branchesAtPath.includes(branch)) branchesAtPath.push(branch)
	}

	const expected = describeBranches(branchesAtPath)
	// if there are multiple actual descriptions that differ,
	// just fall back to printing the data, which is the most specific
	const firstActual = errors[0].actual
	const actual =
		errors.every(e => e.actual === firstActual) ? firstActual : (
			printKind(errors[0].data)
		)
	// each path is written as its own error's message would write it
	const subject =
		path === "" ? ""
		: path[0] === "[" ? `value at ${path} `
		: `${path} `
	return `${subject}must be ${expected}${actual && ` (was ${actual})`}`
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
