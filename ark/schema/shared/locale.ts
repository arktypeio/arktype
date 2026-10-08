import {
	appendUnique,
	type BuiltinObjectKind,
	type Domain,
	type ListType,
	type omit,
	printable
} from "@ark/util"
import type { MissingBasis, MissingValue } from "../structure/required.ts"
import type {
	ActualContext,
	ArkError,
	ArkErrorCode,
	ExpectedContext,
	getAssociatedDataForError,
	MessageContext,
	ProblemContext
} from "./errors.ts"
import { $ark } from "./registry.ts"

export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other"

/** a domain, a builtin object kind, or the types unknown and never */
export type NounId = Domain | BuiltinObjectKind | "unknown" | "never"

export type Locale<
	noun = string,
	keywordAlias extends string = string
> = Locale.Data<noun, keywordAlias> & Locale.Writers<noun>

export declare namespace Locale {
	/** what every locale has, whatever its nouns: all a user writer sees */
	export interface Info {
		/** BCP 47 tag */
		readonly tag: string
		readonly list: (items: readonly string[], type: ListType) => string
		readonly plural: (n: number) => PluralCategory
		readonly number: (n: number | bigint) => string
		readonly date: (date: Date) => string
		/** wraps text shown as written: paths, printed values, names */
		readonly verbatim: (text: string) => string
		/** frames an expected string written without the locale */
		readonly cite: (text: string) => string
	}

	export interface Data<noun = string, keywordAlias extends string = string>
		extends Info {
		/** renders a noun where expected text goes */
		readonly expectedNoun: (noun: noun) => string
		/** renders one alternative of a missing value where expected text goes */
		readonly basis: (basis: MissingBasis, locale: Locale<noun>) => string
		readonly nouns: { readonly [id in NounId]: validateNoun<noun> }
		readonly keywordPhrases: {
			readonly [alias in keywordAlias]?: KeywordPhrase<noun>
		}
		readonly actual: ActualWriter<ArkErrorCode, noun>
		readonly problem: ProblemWriter<ArkErrorCode, noun>
		readonly message: MessageWriter<ArkErrorCode, noun>
	}

	export type Writers<noun = string> = {
		readonly [code in ArkErrorCode]: CodeWriters<code, noun>
	}

	export type CodeWriters<
		code extends ArkErrorCode = ArkErrorCode,
		noun = string
	> = {
		readonly expected: string | ExpectedWriter<code, noun>
		readonly actual?: string | ActualWriter<code, noun>
		readonly problem?: string | ProblemWriter<code, noun>
		readonly message?: string | MessageWriter<code, noun>
	}

	export type ExpectedContext<code extends ArkErrorCode = ArkErrorCode> =
		localeExpectedContext<code>

	export type ExpectedWriter<
		code extends ArkErrorCode = ArkErrorCode,
		noun = string
	> = (error: ExpectedContext<code>, locale: Locale<noun>) => string

	export type ActualWriter<
		code extends ArkErrorCode = ArkErrorCode,
		noun = string
	> = (
		data: getAssociatedDataForError<code>,
		error: ActualContext<code>,
		locale: Locale<noun>
	) => string

	export type ProblemWriter<
		code extends ArkErrorCode = ArkErrorCode,
		noun = string
	> = (error: ProblemContext<code>, locale: Locale<noun>) => string

	export type MessageWriter<
		code extends ArkErrorCode = ArkErrorCode,
		noun = string
	> = (error: MessageContext<code>, locale: Locale<noun>) => string

	export type KeywordPhrase<noun = string> = noun | KeywordWriters<noun>

	export type KeywordWriters<noun = string> = Omit<
		CodeWriters<ArkErrorCode, noun>,
		"expected"
	> & {
		readonly noun: noun
		readonly expected?: string | ExpectedWriter<ArkErrorCode, noun>
	}

	export type Complete<
		noun = string,
		keywordAlias extends string = string
	> = Locale<noun, keywordAlias> & {
		readonly keywordPhrases: {
			readonly [alias in keywordAlias]: KeywordPhrase<noun>
		}
	}
}

// a locale computes expected text from an error's data, not its English
type localeExpectedContext<code extends ArkErrorCode> =
	code extends unknown ? omit<ExpectedContext<code>, "description"> : never

// keyword writers are told apart from nouns by a noun key
type validateNoun<noun> = noun extends { readonly noun: unknown } ? never : noun

const normalizedLocales = new WeakMap<object, Locale>()

/** a locale completed from en, since an untyped or older one may lack entries */
export const normalizeLocale = (locale: Locale<any>): Locale => {
	const en = $ark.defaultConfig.locale
	if (locale === en) return en
	let normalized = normalizedLocales.get(locale)
	if (normalized === undefined) {
		normalized = completeFrom(en, locale)
		normalizedLocales.set(locale, normalized)
	}
	return normalized
}

const completeFrom = (en: Locale, locale: Locale<any>): Locale => {
	let completed: Record<string, unknown> | undefined
	const fill = (k: string, entry: unknown) => {
		completed ??= { ...locale }
		completed[k] = entry
	}
	let k: keyof Locale
	for (k in en) {
		const entry = locale[k] as any
		const enEntry = en[k] as any
		if (entry === undefined)
			// a keyword without a phrase renders its English description
			fill(k, k === "keywordPhrases" ? {} : enEntry)
		else if (k === "nouns") {
			if (Object.keys(enEntry).some(id => entry[id] === undefined))
				fill(k, { ...enEntry, ...entry })
		} else if (k !== "keywordPhrases" && typeof enEntry === "object") {
			// an error code's writers
			if (entry.expected === undefined)
				fill(k, { ...entry, expected: enEntry.expected })
		}
	}
	return (completed as Locale | undefined) ?? locale
}

/** the phrase a locale has for an error's keyword */
export const keywordPhraseOf = <noun>(
	error: { readonly meta?: ArkEnv.meta },
	locale: Locale<noun>
): Locale.KeywordPhrase<noun> | undefined => {
	const keyword = error.meta?.keyword
	// meta.keyword is any string, so it may name an Object.prototype key
	return (
			keyword === undefined ||
				!Object.prototype.hasOwnProperty.call(locale.keywordPhrases, keyword)
		) ?
			undefined
		:	locale.keywordPhrases[keyword]
}

const hasWriters = <noun>(
	phrase: Locale.KeywordPhrase<noun> | undefined
): phrase is Locale.KeywordWriters<noun> =>
	typeof phrase === "object" && phrase !== null && "noun" in phrase

/** the writer a locale has for an error's keyword in a slot other than expected */
export const keywordWriterOf = <
	slot extends "actual" | "problem" | "message",
	noun
>(
	error: { readonly meta?: ArkEnv.meta },
	locale: Locale<noun>,
	slot: slot
): Locale.KeywordWriters<noun>[slot] | undefined => {
	const phrase = keywordPhraseOf(error, locale)
	return hasWriters(phrase) ? phrase[slot] : undefined
}

/** renders a keyword phrase where expected text goes */
export const writeKeywordExpected = <noun>(
	phrase: Locale.KeywordPhrase<noun>,
	error: Locale.ExpectedContext,
	locale: Locale<noun>
): string =>
	!hasWriters(phrase) ? locale.expectedNoun(phrase)
	: phrase.expected === undefined ? locale.expectedNoun(phrase.noun)
	: typeof phrase.expected === "string" ? phrase.expected
	: phrase.expected(error, locale)

/** renders a missing value where expected text goes */
export const describeMissing = <noun>(
	missing: MissingValue,
	locale: Locale<noun>
): string => {
	if (missing.code === "intersection")
		return locale.expectedNoun(locale.nouns.unknown)
	if (missing.code !== "union") return describeBasis(missing, locale)
	if (missing.branches.length === 0)
		return locale.expectedNoun(locale.nouns.never)
	if (isBooleanPair(missing.branches))
		return locale.expectedNoun(locale.nouns.boolean)
	const branches: string[] = []
	for (const branch of missing.branches)
		appendUnique(branches, describeMissing(branch, locale))
	return locale.list(branches, "or")
}

// a unit or proto's description is authored, by its meta or a scope's
// writer, unless it is what arktype writes for it
const describeBasis = <noun>(
	basis: MissingBasis,
	locale: Locale<noun>
): string =>
	(
		(basis.code === "unit" || basis.code === "proto") &&
		basis.meta.keyword === undefined &&
		basis.description !==
			$ark.defaultConfig[basis.code].description(basis as never)
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
export const groupByPath = <noun>(
	union: Locale.ExpectedContext<"union">,
	locale: Locale<noun>
): PathGroup[] => {
	const groups: ArkError[][] = []
	for (const error of union.errors) {
		const group = groups.find(g => g[0].propString === error.propString)
		if (group) group.push(error)
		else groups.push([error])
	}
	return groups.map(group => {
		const expected: string[] = []
		if (isBooleanPair(group))
			expected.push(locale.expectedNoun(locale.nouns.boolean))
		else for (const error of group) appendUnique(expected, error.expected)
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
