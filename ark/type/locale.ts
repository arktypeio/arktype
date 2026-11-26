import {
	messageIn as writeMessageIn,
	type ArkError,
	type ArkErrorCode,
	type Locale as BaseLocale
} from "@ark/schema"
import type { KeywordPhraseAlias } from "./keywords/phrases.ts"

/**
 * A locale you write: its tag and any part you replace, each part you leave
 * out written as en writes it, with a phrase for any builtin keyword
 */
export type Locale = BaseLocale<KeywordPhraseAlias>

export declare namespace Locale {
	export type Info = BaseLocale.Info

	export type Data = BaseLocale.Data<KeywordPhraseAlias>

	export type Writers = BaseLocale.Writers

	export type Resolved = BaseLocale.Resolved<KeywordPhraseAlias>

	export type CodeWriters<code extends ArkErrorCode = ArkErrorCode> =
		BaseLocale.CodeWriters<code>

	export type ExpectedContext<code extends ArkErrorCode = ArkErrorCode> =
		BaseLocale.ExpectedContext<code>

	export type ExpectedWriter<code extends ArkErrorCode = ArkErrorCode> =
		BaseLocale.ExpectedWriter<code>

	export type ActualWriter<code extends ArkErrorCode = ArkErrorCode> =
		BaseLocale.ActualWriter<code>

	export type MessageWriter<code extends ArkErrorCode = ArkErrorCode> =
		BaseLocale.MessageWriter<code>

	export type LineWriter = BaseLocale.LineWriter

	export type KeywordPhrase = BaseLocale.KeywordPhrase

	export type KeywordWriters = BaseLocale.KeywordWriters

	export type KeywordExpectedWriter = BaseLocale.KeywordExpectedWriter

	export type Complete = BaseLocale.Complete<KeywordPhraseAlias>
}

// @ark/schema's, typed by the Locale arktype exports, so a library re-exporting
// it declares it by arktype's root rather than by a path into @ark/schema
/**
 * Writes an error's `message` in `locale`: what `error.message` would be had
 * that locale been configured, never naming its path, e.g. `must be a string`
 * where its line of `summaryIn(locale)` is `name must be a string`.
 */
export const messageIn: (error: ArkError, locale: Locale) => string =
	writeMessageIn
