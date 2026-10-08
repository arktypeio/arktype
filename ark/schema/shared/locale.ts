import type { BuiltinObjectKind, Domain, ListType, omit } from "@ark/util"
import type {
	ActualContext,
	ArkErrorCode,
	ExpectedContext,
	getAssociatedDataForError,
	MessageContext,
	ProblemContext
} from "./errors.ts"

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
