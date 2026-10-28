import {
	appendUnique,
	hasOwn,
	printable,
	type BuiltinObjectKind,
	type Domain,
	type ListType,
	type omit
} from "@ark/util"
import type { MissingBasis, MissingValue } from "../structure/required.ts"
import {
	defaultConfig,
	type ActualContext,
	type ArkError,
	type ArkErrorCode,
	type ExpectedContext,
	type getAssociatedDataForError,
	type MessageContext,
	type ProblemContext
} from "./errors.ts"

export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other"

/** a domain, a builtin object kind, or the types unknown and never */
export type NounId = Domain | BuiltinObjectKind | "unknown" | "never"

export type Locale<keywordAlias extends string = string> =
	Locale.Data<keywordAlias> & Locale.Writers

export declare namespace Locale {
	/** what every locale has: all a writer you configure sees */
	export interface Info {
		/** BCP 47 tag */
		readonly tag: string
		readonly list: (items: readonly string[], type: ListType) => string
		readonly plural: (n: number) => PluralCategory
		readonly number: (n: number | bigint) => string
		readonly date: (date: Date) => string
		/** wraps text shown as written: paths, printed values, names */
		readonly verbatim: (text: string) => string
	}

	export interface Data<keywordAlias extends string = string> extends Info {
		/** names expected text written without the locale, like a description */
		readonly cite: (text: string) => string
		/** names one alternative of a missing value */
		readonly basis: (basis: MissingBasis, locale: Locale) => string
		/** each type's name, as the locale's "must be" takes it */
		readonly nouns: { readonly [id in NounId]: string }
		readonly keywordPhrases: {
			readonly [alias in keywordAlias]?: KeywordPhrase
		}
		readonly actual: ActualWriter
		/** the problem of a keyword's phrase or of expected text you wrote */
		readonly problem: ProblemWriter
		readonly message: MessageWriter
	}

	export type Writers = {
		readonly [code in ArkErrorCode]: code extends "required" ?
			// its data is the object around the key, not a value to print
			CodeWriters<code> & { readonly actual: string | ActualWriter<code> }
		:	CodeWriters<code>
	}

	export type CodeWriters<code extends ArkErrorCode = ArkErrorCode> = {
		/** the sentence for an error of this code, without its subject */
		readonly problem: string | ProblemWriter<code>
		/** what unions and intersections list, as "must be" takes it */
		readonly expected?: string | ExpectedWriter<code>
		readonly actual?: string | ActualWriter<code>
		readonly message?: string | MessageWriter<code>
	}

	export type ExpectedContext<code extends ArkErrorCode = ArkErrorCode> =
		localeExpectedContext<code>

	export type ExpectedWriter<code extends ArkErrorCode = ArkErrorCode> = (
		error: ExpectedContext<code>,
		locale: Locale
	) => string

	export type ActualWriter<code extends ArkErrorCode = ArkErrorCode> = (
		data: getAssociatedDataForError<code>,
		error: ActualContext<code>,
		locale: Locale
	) => string

	export type ProblemWriter<code extends ArkErrorCode = ArkErrorCode> = (
		error: ProblemContext<code>,
		locale: Locale
	) => string

	export type MessageWriter<code extends ArkErrorCode = ArkErrorCode> = (
		error: MessageContext<code>,
		locale: Locale
	) => string

	export type KeywordPhrase = string | KeywordWriters

	export type KeywordWriters = Partial<Omit<CodeWriters, "expected">> & {
		readonly noun: string
		readonly expected?: string | KeywordExpectedWriter
	}

	/** describes an error, or a missing value by its basis */
	export type KeywordExpectedWriter = (
		error: ExpectedContext | MissingBasis,
		locale: Locale
	) => string

	/** a locale with every fragment and keyword phrase, which its unions may list */
	export type Complete<keywordAlias extends string = string> =
		Locale<keywordAlias> & {
			readonly [code in ArkErrorCode]: {
				readonly expected: string | ExpectedWriter<code>
			}
		} & {
			readonly keywordPhrases: {
				readonly [alias in keywordAlias]: KeywordPhrase
			}
		}
}

// a locale computes expected text from an error's data, not its English
type localeExpectedContext<code extends ArkErrorCode> =
	code extends "required" ?
		omit<ExpectedContext<code>, "description" | "missingValueDescription">
	: code extends unknown ? omit<ExpectedContext<code>, "description">
	: never

const keywordPhraseOf = (
	error: { readonly meta?: ArkEnv.meta },
	locale: Locale
): Locale.KeywordPhrase | undefined => {
	const keyword = error.meta?.keyword
	// meta.keyword is any string, so it may name an Object.prototype key
	return keyword === undefined || !hasOwn(locale.keywordPhrases, keyword) ?
			undefined
		:	locale.keywordPhrases[keyword]
}

/** the writer a locale has for an error's keyword in a slot other than expected */
export const keywordWriterOf = <slot extends "actual" | "problem" | "message">(
	error: { readonly meta?: ArkEnv.meta },
	locale: Locale,
	slot: slot
): Locale.KeywordWriters[slot] | undefined => {
	const phrase = keywordPhraseOf(error, locale)
	return typeof phrase === "object" ? phrase[slot] : undefined
}

/** a locale's phrase for a keyword, if it has one, as expected text */
export const writeKeywordExpected = (
	error: Locale.ExpectedContext | MissingBasis,
	locale: Locale
): string | undefined => {
	const phrase = keywordPhraseOf(error, locale)
	return (
		typeof phrase !== "object" ? phrase
		: phrase.expected === undefined ? phrase.noun
		: typeof phrase.expected === "string" ? phrase.expected
		: phrase.expected(error, locale)
	)
}

/** renders a missing value where expected text goes */
export const describeMissing = (
	missing: MissingValue,
	locale: Locale
): string => {
	if (missing.code === "intersection") return locale.nouns.unknown
	if (missing.code !== "union") return describeBasis(missing, locale)
	if (missing.branches.length === 0) return locale.nouns.never
	if (isBooleanPair(missing.branches)) return locale.nouns.boolean
	return locale.list(describeEachMissing(missing, locale), "or")
}

// each alternative a missing value names, once
const describeEachMissing = (
	missing: MissingValue,
	locale: Locale
): string[] => {
	if (
		missing.code !== "union" ||
		missing.branches.length === 0 ||
		isBooleanPair(missing.branches)
	)
		return [describeMissing(missing, locale)]
	const branches: string[] = []
	for (const branch of missing.branches)
		appendUnique(branches, describeMissing(branch, locale))
	return branches
}

// a unit or proto's description is authored unless it is what arktype writes for it
const describeBasis = (basis: MissingBasis, locale: Locale): string =>
	(
		(basis.code === "unit" || basis.code === "proto") &&
		basis.meta.keyword === undefined &&
		basis.description !== defaultConfig[basis.code].description(basis as never)
	) ?
		locale.cite(basis.description!)
	:	locale.basis(basis, locale)

// a missing value or an error, read for whether it is a unit
type UnitCandidate = {
	readonly code: string
	readonly unit?: unknown
	readonly meta?: ArkEnv.meta
}

// undescribed false and true, missing or failed, which a locale names as one
const isBooleanPair = (values: readonly UnitCandidate[]) =>
	values.length === 2 &&
	values.every(
		value =>
			value.code === "unit" &&
			typeof value.unit === "boolean" &&
			value.meta?.description === undefined
	)

export interface PathGroup {
	readonly propString: string
	/** the title of the value at the path */
	readonly label: string | undefined
	/** each error's expected text, once */
	readonly expected: readonly string[]
	/** the errors' actual text, unless they differ */
	readonly actual: string | undefined
	/** the value at the path */
	readonly data: unknown
}

/** a union's errors by path, in the order each path first failed */
export const groupByPath = (
	union: Locale.ExpectedContext<"union">,
	locale: Locale
): PathGroup[] => {
	const groups: ArkError[][] = []
	for (const error of union.errors) {
		const group = groups.find(g => g[0].propString === error.propString)
		if (group) group.push(error)
		else groups.push([error])
	}
	return groups.map(group => {
		const expected: string[] = []
		if (isBooleanPair(group)) expected.push(locale.nouns.boolean)
		else {
			for (const error of group) {
				for (const branch of alternativesOf(error, locale))
					appendUnique(expected, branch)
			}
		}
		const actual = group[0].actual
		const propString = group[0].propString
		return {
			propString,
			// the union's title is its own value's, whatever its branches'
			label:
				(propString === union.propString ? labelOf(union) : undefined) ??
				sharedLabelOf(group),
			expected,
			actual:
				group.every(error => error.actual === actual) ? actual : undefined,
			data: group[0].data
		}
	})
}

/**
 * what an error expects, as the alternatives a union lists once each: a
 * missing value's branches or a discriminant's cases, as the branches it
 * excluded would name them, unless its expected text is authored
 */
export const alternativesOf = (
	error: ArkError,
	locale: Locale
): readonly string[] => {
	if (error.code === "required") {
		return error.expected === describeMissing(error.missing, locale) ?
				describeEachMissing(error.missing, locale)
			:	[error.expected]
	}
	const write = locale.discriminant.expected
	if (error.code !== "discriminant" || typeof write !== "function")
		return [error.expected]
	const cases = error.cases.map(c =>
		write({ ...error, cases: [c] } as never, locale)
	)
	return error.expected === locale.list(cases, "or") ? cases : [error.expected]
}

/** the actual a union's errors agree on, if each is at the union's own path */
export const actualAtPathOf = (union: {
	readonly propString: string
	readonly errors: readonly ArkError[]
}): string | undefined => {
	let actual: string | undefined
	for (const error of union.errors) {
		if (
			error.propString !== union.propString ||
			(actual !== undefined && error.actual !== actual)
		)
			return
		actual = error.actual
	}
	return actual
}

/** a thrown value as text, though it may be a symbol or have no toString */
export const describeCause = (cause: unknown): string => {
	try {
		return String(cause)
	} catch {
		return printable(cause)
	}
}

/** the title of the value an error is about */
export const labelOf = (error: Locale.ExpectedContext): string | undefined =>
	error.code === "required" ? error.valueMeta.title
	: error.code === "intersection" ? sharedLabelOf(error.errors)
	: (
		error.code === "undeclared" ||
		(error.code === "discriminant" && error.onKey)
	) ?
		// their meta is the object's around the key
		undefined
	:	error.meta?.title

// the label errors at one path agree on, since an intersection has no meta
const sharedLabelOf = (errors: readonly ArkError[]): string | undefined => {
	const labels = errors.map(error => labelOf(error as never))
	return labels.every(label => label === labels[0]) ? labels[0] : undefined
}
