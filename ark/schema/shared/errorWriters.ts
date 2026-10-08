import {
	appendUnique,
	domainDescriptions,
	domainOf,
	functionNameOf,
	isValidDate,
	objectKindOrDomainOf,
	printable
} from "@ark/util"
import type { Predicate } from "../predicate.ts"
import type { Morph } from "../roots/morph.ts"
import type {
	ActualWriter,
	ArkError,
	ExpectedWriter,
	MessageWriter,
	ProblemWriter
} from "./errors.ts"
import { describeCause, keywordWriterOf, type Locale } from "./locale.ts"

// the default writers besides descriptions, apart from node kinds so compiled code can write errors without them

// one writer per slot for each kind that doesn't write its own, so en can tell
// which are its kind's
export const writeActual: ActualWriter = data => printable(data)

export const writeProblem: ProblemWriter = ({ expected, actual }) =>
	`must be ${expected}${actual ? ` (was ${actual})` : ""}`

export const writeMessage: MessageWriter = ctx => {
	const propString = ctx.propString
	if (propString === "") return ctx.problem
	// clarify paths like [1], [0][1], and ["key!"] that could be confusing
	return propString[0] === "[" ?
			`value at ${propString} ${ctx.problem}`
		:	`${propString} ${ctx.problem}`
}

export const writeDomainActual: ActualWriter<"domain"> = data =>
	typeof data === "number" && !Number.isFinite(data) ?
		String(data)
	:	domainDescriptions[domainOf(data)]

export const writeIntersectionExpected: ExpectedWriter<
	"intersection"
> = source => `  ◦ ${source.errors.map(e => e.expected).join("\n  ◦ ")}`

export const writeIntersectionProblem: ProblemWriter<"intersection"> = ctx =>
	`(${ctx.actual}) must be...\n${ctx.expected}`

export const writeLengthActual: ActualWriter<
	"exactLength" | "maxLength"
> = data => `${data.length}`

// avoid default message like "must be non-empty (was 0)"
export const writeMinLengthActual: ActualWriter<"minLength"> = data =>
	data.length === 0 ? "" : `${data.length}`

// reads predicate, or for pipe.try the morph that threw
export const describePredicate = (ctx: {
	predicate?: Predicate
	morph?: Morph
}): string => {
	const fn = ctx.predicate ?? ctx.morph
	return `valid according to ${(fn && functionNameOf(fn)) || "an anonymous predicate"}`
}

// error contexts from ctx.reject have neither a description nor a predicate
export const writePredicateExpected: ExpectedWriter<"predicate"> = ctx =>
	ctx.description ?? describePredicate(ctx)

// a keyword's nodes describe their errors through meta, so its phrase
// writes only errors it raises through ctx: their actual, and the
// problem of one that carries what the keyword caught
export const writePredicateActual: ActualWriter<"predicate"> = (
	data,
	ctx,
	info
) => {
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
}

export const writePredicateProblem: ProblemWriter<"predicate"> = (
	ctx,
	info
) => {
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

export const writeProtoActual: ActualWriter<"proto"> = data =>
	data instanceof Date && !isValidDate(data) ?
		"an invalid Date"
	:	objectKindOrDomainOf(data)

export const writeRequiredExpected: ExpectedWriter<"required"> = ctx =>
	ctx.missingValueDescription

export const writeRequiredActual: ActualWriter<"required"> = () => "missing"

export const writeUnionExpected: ExpectedWriter<"union"> = ctx => {
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
}

export const writeUnionProblem: ProblemWriter<"union"> = ctx => ctx.expected

export const writeUnionMessage: MessageWriter<"union"> = ({ problem }) => {
	if (problem[0] === "[") {
		// clarify paths like [1], [0][1], and ["key!"] that could be confusing
		return `value at ${problem}`
	}

	return problem
}

export type DescribeBranchesOptions = {
	delimiter?: string
	finalDelimiter?: string
}

export const describeBranches = (
	descriptions: readonly string[],
	opts?: DescribeBranchesOptions
): string => {
	const delimiter = opts?.delimiter ?? ", "
	const finalDelimiter = opts?.finalDelimiter ?? " or "

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

	return `${unique.join(delimiter)}${unique.length ? finalDelimiter : ""}${last}`
}

export const writeUnitProblem: ProblemWriter<"unit"> = ({ expected, actual }) =>
	`${expected === actual ? `must be reference equal to ${expected} (serialized to the same value)` : `must be ${expected} (was ${actual})`}`

// en names a domain by its noun, which is its description
export const writeDiscriminantActual: ActualWriter<"discriminant"> = (
	data,
	e
) =>
	e.discriminantKind === "domain" ?
		domainDescriptions[domainOf(data)]
	:	printable(data)
