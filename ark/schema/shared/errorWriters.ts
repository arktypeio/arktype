import { domainDescriptions, domainOf, type requireKeys } from "@ark/util"
import type { ErrorConfig } from "../config.ts"
import type { Declaration, Inner } from "../kinds.ts"
import type { BaseErrorContext } from "./declare.ts"
import type {
	ActualWriter,
	ArkErrorCode,
	MessageWriter,
	ProblemWriter
} from "./errors.ts"
import {
	describeCollapsibleDate,
	printedActualOf,
	printKind,
	writeDomainActual,
	writeLengthActual,
	writeNotEqualActual,
	writeProblem,
	writeProtoActual,
	writeUnitActual,
	writeUnitProblem
} from "./enWriters.ts"
import type { NodeKind } from "./implement.ts"
import {
	actualAtPathOf,
	describeCause,
	distinctExpectedOf,
	keywordWriterOf,
	type Locale
} from "./locale.ts"
import { writeListed } from "./listed.ts"
import { describePredicate } from "./traversal.ts"
import { describeCases } from "./utils.ts"

// a path starting with a bracket, like [0] or ["key!"], is written as is, as
// a standalone validator writes it
export const writeMessage: MessageWriter = ctx =>
	ctx.propString === "" ? ctx.problem : `${ctx.propString} ${ctx.problem}`

// one writer per slot for each kind that doesn't write its own. An error's
// actual describes its data, but a message doesn't say what the value was, as
// a standalone validator's can't without shipping a printer, unless an actual
// is configured; a missing key's does
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
			:	`(${printedActualOf(ctx)}) must be...\n${ctx.expected}`
	},
	max: {},
	maxLength: { actual: writeLengthActual },
	min: {},
	minLength: { actual: writeLengthActual },
	notEqual: { actual: writeNotEqualActual },
	notEqualLength: { actual: writeLengthActual },
	pattern: {},
	// a keyword's phrase writes only the errors it raises through ctx
	predicate: {
		// error contexts from ctx.reject have neither a description nor a predicate
		expected: ctx => ctx.description ?? describePredicate(ctx),
		actual: (data, ctx) =>
			ctx.morph ?
				`aborted due to error:\n    ${describeCause(ctx.cause)}\n`
			:	printKind(data),
		problem: (ctx, info) => {
			const locale = info as Locale
			// what a pipe.try morph threw is written beside what it expected
			if (ctx.morph && ctx.cause !== undefined) {
				try {
					return `must be ${ctx.expected} (${String(ctx.cause)})`
				} catch {
					// a cause String can't write, like a null-prototype object, is
					// left out, as a standalone validator leaves it
					return `must be ${ctx.expected}`
				}
			}
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
		// written as a standalone validator lists its branches' first issues
		expected: ctx =>
			ctx.description ??
			(ctx.errors.length ? writeListed(ctx.errors) : "never"),
		// data that may be large is described by its kind
		actual: (data, ctx) => actualAtPathOf(ctx) ?? printKind(data),
		// its text is its errors', unless it has none, like never, or a description
		problem: (ctx, info) =>
			listsErrors(ctx) ? ctx.expected : writeProblem(ctx, info),
		message: (ctx, info) =>
			listsErrors(ctx) ? ctx.problem : writeMessage(ctx, info)
	},
	unit: { actual: writeUnitActual, problem: writeUnitProblem },
	undeclared: { expected: "removed" },
	discriminant: {
		expected: e => e.description ?? describeCases(e),
		actual: (data, e) =>
			e.absent ? "missing"
			: e.discriminantKind === "domain" ? domainDescriptions[domainOf(data)]
			: printKind(data)
	}
}

// what en describes each code's data with, which its messages leave out. A
// missing key's isn't, since its message says it was missing
const dataDescribers: Set<unknown> = /* @__PURE__ */ (() => {
	const describers = new Set<unknown>([errorWriters.actual])
	for (const [code, writers] of Object.entries(errorWritersByCode)) {
		const actual = (writers as ErrorConfig).actual
		if (code !== "required" && typeof actual === "function")
			describers.add(actual)
	}
	return describers
})()

/** notes an actual writer describing data, like en's own */
export const registerDescriber = (writer: object): void => {
	dataDescribers.add(writer)
}

/**
 * whether an error's actual is written by a writer describing its data,
 * which en's messages leave out, rather than one configured
 */
export const describesData = (writer: unknown): boolean =>
	dataDescribers.has(writer)

const listsErrors = (ctx: {
	errors: readonly unknown[]
	description?: string
}): boolean => ctx.errors.length !== 0 && ctx.description === undefined

export type errorWritersOf<code extends ArkErrorCode> = requireKeys<
	ErrorConfig<code>,
	// a context unlike its node's inner, e.g. union's, needs expected
	code extends NodeKind ?
		Inner<code> extends (
			Omit<
				Declaration<code>["errorCtx"],
				keyof BaseErrorContext | "description"
			>
		) ?
			never
		:	"expected"
	:	"expected"
>
