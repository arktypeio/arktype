import type { ArkErrorCode, Locale as BaseLocale } from "@ark/schema"
import type { KeywordPhraseAlias } from "./keywords/phrases.ts"

/** the text arktype's errors render in, with a phrase per builtin keyword */
export type Locale = BaseLocale<KeywordPhraseAlias>

export declare namespace Locale {
	export type Info = BaseLocale.Info

	export type Data = BaseLocale.Data<KeywordPhraseAlias>

	export type Writers = BaseLocale.Writers

	export type CodeWriters<code extends ArkErrorCode = ArkErrorCode> =
		BaseLocale.CodeWriters<code>

	export type ExpectedContext<code extends ArkErrorCode = ArkErrorCode> =
		BaseLocale.ExpectedContext<code>

	export type ExpectedWriter<code extends ArkErrorCode = ArkErrorCode> =
		BaseLocale.ExpectedWriter<code>

	export type ActualWriter<code extends ArkErrorCode = ArkErrorCode> =
		BaseLocale.ActualWriter<code>

	export type ProblemWriter<code extends ArkErrorCode = ArkErrorCode> =
		BaseLocale.ProblemWriter<code>

	export type MessageWriter<code extends ArkErrorCode = ArkErrorCode> =
		BaseLocale.MessageWriter<code>

	export type KeywordPhrase = BaseLocale.KeywordPhrase

	export type KeywordWriters = BaseLocale.KeywordWriters

	export type KeywordExpectedWriter = BaseLocale.KeywordExpectedWriter

	export type Complete = BaseLocale.Complete<KeywordPhraseAlias>
}
