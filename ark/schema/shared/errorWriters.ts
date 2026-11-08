import type { requireKeys } from "@ark/util"
import type { ErrorConfig } from "../config.ts"
import type { Declaration, Inner } from "../kinds.ts"
import type { BaseErrorContext } from "./declare.ts"
import type { ArkErrorCode, MessageWriter, ProblemWriter } from "./errors.ts"
import { writeProblem, writeUnitProblem } from "./enWriters.ts"
import type { NodeKind } from "./implement.ts"
import { distinctExpectedOf, keywordWriterOf, type Locale } from "./locale.ts"
import { writeListed } from "./listed.ts"
import { describePredicate } from "./traversal.ts"
import { describeCases } from "./utils.ts"

// a path starting with a bracket, like [0] or ["key!"], is written as is, as
// a standalone validator writes it
export const writeMessage: MessageWriter = ctx =>
	ctx.propString === "" ? ctx.problem : `${ctx.propString} ${ctx.problem}`

// one writer per slot for each kind that doesn't write its own. A message
// doesn't say what the value was, as a standalone validator's can't without
// shipping a printer, unless an actual is configured; a missing key's does
export const errorWriters: {
	actual: string
	problem: ProblemWriter
	message: MessageWriter
} = {
	actual: "",
	problem: writeProblem,
	message: writeMessage
}

export const errorWritersByCode: {
	[code in ArkErrorCode]: errorWritersOf<code>
} = {
	after: {},
	before: {},
	divisor: {},
	domain: {},
	exactLength: {},
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
	maxLength: {},
	min: {},
	minLength: {},
	notEqual: {},
	notEqualLength: {},
	pattern: {},
	// a keyword's phrase writes only the errors it raises through ctx
	predicate: {
		// error contexts from ctx.reject have neither a description nor a predicate
		expected: ctx => ctx.description ?? describePredicate(ctx),
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
	proto: {},
	required: {
		expected: ctx => ctx.missingValueDescription,
		actual: () => "missing"
	},
	union: {
		// written as a standalone validator lists its branches' first issues
		expected: ctx =>
			ctx.description ??
			(ctx.errors.length ? writeListed(ctx.errors) : "never"),
		// its text is its errors', unless it has none, like never, or a description
		problem: (ctx, info) =>
			listsErrors(ctx) ? ctx.expected : writeProblem(ctx, info),
		message: (ctx, info) =>
			listsErrors(ctx) ? ctx.problem : writeMessage(ctx, info)
	},
	unit: { problem: writeUnitProblem },
	undeclared: {
		expected: "removed",
		actual: ""
	},
	discriminant: {
		expected: e => e.description ?? describeCases(e),
		actual: ""
	}
}

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
