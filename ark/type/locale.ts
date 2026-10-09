import type { ArkErrorCode, Locale as BaseLocale } from "@ark/schema"
import type { KeywordPhraseAlias } from "./keywords/phrases.ts"

/** the text arktype's errors render in, with a phrase per builtin keyword */
export type Locale<noun = string> = BaseLocale<noun, KeywordPhraseAlias>

export declare namespace Locale {
	export type Info = BaseLocale.Info

	export type Data<noun = string> = BaseLocale.Data<noun, KeywordPhraseAlias>

	export type Writers<noun = string> = BaseLocale.Writers<noun>

	export type CodeWriters<
		code extends ArkErrorCode = ArkErrorCode,
		noun = string
	> = BaseLocale.CodeWriters<code, noun>

	export type ExpectedContext<code extends ArkErrorCode = ArkErrorCode> =
		BaseLocale.ExpectedContext<code>

	export type ExpectedWriter<
		code extends ArkErrorCode = ArkErrorCode,
		noun = string
	> = BaseLocale.ExpectedWriter<code, noun>

	export type ActualWriter<
		code extends ArkErrorCode = ArkErrorCode,
		noun = string
	> = BaseLocale.ActualWriter<code, noun>

	export type ProblemWriter<
		code extends ArkErrorCode = ArkErrorCode,
		noun = string
	> = BaseLocale.ProblemWriter<code, noun>

	export type MessageWriter<
		code extends ArkErrorCode = ArkErrorCode,
		noun = string
	> = BaseLocale.MessageWriter<code, noun>

	export type KeywordPhrase<noun = string> = BaseLocale.KeywordPhrase<noun>

	export type KeywordWriters<noun = string> = BaseLocale.KeywordWriters<noun>

	export type KeywordExpectedWriter<noun = string> =
		BaseLocale.KeywordExpectedWriter<noun>

	export type Complete<noun = string> = BaseLocale.Complete<
		noun,
		KeywordPhraseAlias
	>
}
