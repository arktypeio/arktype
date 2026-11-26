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
	type LineContext,
	type MessageContext
} from "./errors.ts"
import type { ArkEnv } from "./declare.ts"
import { labeledPathOf } from "./issues.ts"
import { labelSharedBy } from "./listed.ts"

export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other"

/** a domain, a builtin object kind, or the types unknown and never */
export type NounId = Domain | BuiltinObjectKind | "unknown" | "never"

/** the flat alias of every builtin keyword that carries a localized phrase */
export type KeywordPhraseAlias =
	| "FormData.parsed"
	| "number.epoch"
	| "object.json"
	| "string.alpha"
	| "string.alphanumeric"
	| "string.base58"
	| "string.base64"
	| "string.base64.url"
	| "string.capitalize.preformatted"
	| "string.creditCard"
	| "string.date"
	| "string.date.epoch"
	| "string.date.iso"
	| "string.date.parse"
	| "string.digits"
	| "string.email"
	| "string.hex"
	| "string.integer"
	| "string.integer.parse"
	| "string.ip"
	| "string.ip.v4"
	| "string.ip.v6"
	| "string.json"
	| "string.json.parse"
	| "string.lower.preformatted"
	| "string.normalize.NFC.preformatted"
	| "string.normalize.NFD.preformatted"
	| "string.normalize.NFKC.preformatted"
	| "string.normalize.NFKD.preformatted"
	| "string.nonblank"
	| "string.numeric"
	| "string.numeric.parse"
	| "string.regex"
	| "string.semver"
	| "string.trim.preformatted"
	| "string.upper.preformatted"
	| "string.url"
	| "string.url.http"
	| "string.url.parse"
	| "string.uuid"
	| "string.uuid.v1"
	| "string.uuid.v2"
	| "string.uuid.v3"
	| "string.uuid.v4"
	| "string.uuid.v5"
	| "string.uuid.v6"
	| "string.uuid.v7"
	| "string.uuid.v8"

/**
 * A locale you write: its tag and any part you replace, each part you leave
 * out written as en writes it. Every key but `tag` is optional, so a locale
 * written against one minor version still type-checks against the next, which
 * may add an error code, a noun or a keyword. Annotate with `Locale.Complete`
 * to find what's untranslated instead.
 */
export type Locale<keywordAlias extends string = KeywordPhraseAlias> = {
	/** BCP 47 tag */
	readonly tag: string
} & {
	readonly [k in Exclude<
		keyof Locale.Data<keywordAlias>,
		"tag" | "nouns"
	>]?: Locale.Data<keywordAlias>[k]
} & {
	readonly nouns?: { readonly [id in NounId]?: string }
} & { readonly [code in ArkErrorCode]?: codeWritersOf<code> }

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

	export interface Data<keywordAlias extends string = KeywordPhraseAlias>
		extends Info {
		/** names expected text written without the locale, like a description */
		readonly cite: (text: string) => string
		/** names one alternative of a missing value */
		readonly basis: (basis: MissingBasis, locale: Resolved) => string
		/** each type's name, as the locale's "must be" takes it */
		readonly nouns: { readonly [id in NounId]: string }
		readonly keywordPhrases: {
			readonly [alias in keywordAlias]?: KeywordPhrase
		}
		readonly actual: ActualWriter
		/** the message of a keyword's phrase or of expected text you wrote */
		readonly message: MessageWriter
		/**
		 * an error's line of a summary: its message after the path it failed
		 * at. Only written below the root, and not for a union listing its
		 * branches' errors, each of which names its own path
		 */
		readonly line: LineWriter
	}

	export type Writers = {
		readonly [code in ArkErrorCode]: codeWritersOf<code>
	}

	/**
	 * A locale as its writers receive it: every part, those its author left
	 * out completed from en
	 */
	export type Resolved<keywordAlias extends string = KeywordPhraseAlias> =
		Data<keywordAlias> & Writers

	export type CodeWriters<code extends ArkErrorCode = ArkErrorCode> = {
		/**
		 * the sentence for an error of this code, without its subject. Without
		 * one, the locale's `message` writes it from `expected`
		 */
		readonly message?: string | MessageWriter<code>
		/** what unions list, as "must be" takes it */
		readonly expected?: string | ExpectedWriter<code>
		readonly actual?: string | ActualWriter<code>
	}

	export type ExpectedContext<code extends ArkErrorCode = ArkErrorCode> =
		localeExpectedContext<code>

	export type ExpectedWriter<code extends ArkErrorCode = ArkErrorCode> = (
		error: ExpectedContext<code>,
		locale: Resolved
	) => string

	export type ActualWriter<code extends ArkErrorCode = ArkErrorCode> = (
		data: getAssociatedDataForError<code>,
		error: ActualContext<code>,
		locale: Resolved
	) => string

	export type MessageWriter<code extends ArkErrorCode = ArkErrorCode> = (
		error: MessageContext<code>,
		locale: Resolved
	) => string

	export type LineWriter = (error: LineContext, locale: Resolved) => string

	export type KeywordPhrase = string | KeywordWriters

	export type KeywordWriters = Partial<Omit<CodeWriters, "expected">> & {
		readonly noun: string
		readonly expected?: string | KeywordExpectedWriter
	}

	/** describes an error, or a missing value by its basis */
	export type KeywordExpectedWriter = (
		error: ExpectedContext | MissingBasis,
		locale: Resolved
	) => string

	/**
	 * A locale with every part: a message and fragment for each code its
	 * errors are raised with, and a phrase for every keyword, which its
	 * unions may list. A minor version adding a code, noun or keyword adds
	 * it here, so annotate a locale with it to find what's untranslated,
	 * not one you publish
	 */
	export type Complete<keywordAlias extends string = KeywordPhraseAlias> =
		Resolved<keywordAlias> & {
			readonly [code in ArkErrorCode]: {
				readonly message: string | MessageWriter<code>
				readonly expected: string | ExpectedWriter<code>
			}
		} & {
			readonly keywordPhrases: {
				readonly [alias in keywordAlias]: KeywordPhrase
			}
		}
}

type codeWritersOf<code extends ArkErrorCode> =
	code extends "required" ?
		// its data is the object around the key, not a value to print
		Locale.CodeWriters<code> & {
			readonly actual: string | Locale.ActualWriter<code>
		}
	:	Locale.CodeWriters<code>

// a locale computes expected text from an error's data, not its English
type localeExpectedContext<code extends ArkErrorCode> =
	code extends "required" ?
		omit<ExpectedContext<code>, "description" | "missingValueDescription">
	: code extends unknown ? omit<ExpectedContext<code>, "description">
	: never

const keywordPhraseOf = (
	error: { readonly meta?: ArkEnv.meta },
	locale: Locale.Resolved
): Locale.KeywordPhrase | undefined => {
	const keyword = error.meta?.keyword
	// meta.keyword is any string, so it may name an Object.prototype key
	return keyword === undefined || !hasOwn(locale.keywordPhrases, keyword) ?
			undefined
		:	(
				locale.keywordPhrases as Record<
					string,
					Locale.KeywordPhrase | undefined
				>
			)[keyword]
}

/** the writer a locale has for an error's keyword in a slot other than expected */
export const keywordWriterOf = <slot extends "actual" | "message">(
	error: { readonly meta?: ArkEnv.meta },
	locale: Locale.Resolved,
	slot: slot
): Locale.KeywordWriters[slot] | undefined => {
	const phrase = keywordPhraseOf(error, locale)
	return typeof phrase === "object" ? phrase[slot] : undefined
}

/** a locale's phrase for a keyword, if it has one, as expected text */
export const writeKeywordExpected = (
	error: Locale.ExpectedContext | MissingBasis,
	locale: Locale.Resolved
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
	locale: Locale.Resolved
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
	locale: Locale.Resolved
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
const describeBasis = (basis: MissingBasis, locale: Locale.Resolved): string =>
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
	/**
	 * the label each error's message names the value at the path by
	 * (`.label()`), if they agree, which is the subject in place of its key
	 */
	readonly named: string | undefined
	/**
	 * the path written before `named`, as a summary's line writes it: the
	 * path without the key it names, then a colon, or "" where that's all
	 */
	readonly namedAfter: string
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
	locale: Locale.Resolved
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
		const named = labelSharedBy(group)
		return {
			propString,
			// the union's title is its own value's, whatever its branches'
			label:
				(propString === union.propString ? labelOf(union) : undefined) ??
				sharedLabelOf(group),
			named,
			namedAfter: named === undefined ? "" : labeledPathOf(group[0]),
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
	locale: Locale.Resolved
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
	: (
		error.code === "undeclared" ||
		(error.code === "discriminant" && error.onKey)
	) ?
		// their meta is the object's around the key
		undefined
	:	error.meta?.title

// the label errors at one path agree on
const sharedLabelOf = (errors: readonly ArkError[]): string | undefined => {
	const labels = errors.map(error => labelOf(error as never))
	return labels.every(label => label === labels[0]) ? labels[0] : undefined
}
