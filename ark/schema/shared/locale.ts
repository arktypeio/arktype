import {
	appendUnique,
	type BuiltinObjectKind,
	type Domain,
	type ListType,
	type omit
} from "@ark/util"
import type { MissingBasis, MissingValue } from "../structure/required.ts"
import type {
	ActualContext,
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

// undescribed false and true, which a locale names as one
const isBooleanPair = (branches: readonly MissingValue[]) =>
	branches.length === 2 &&
	branches.every(
		branch =>
			branch.code === "unit" &&
			typeof branch.unit === "boolean" &&
			branch.meta.description === undefined
	)
