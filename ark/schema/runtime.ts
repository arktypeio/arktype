import { flatMorph } from "@ark/util"
import type { ResolvedConfig } from "./config.ts"
import { errorWriters, errorWritersByCode } from "./shared/errorWriters.ts"
import type { ExpectedWriter } from "./shared/errors.ts"
import type { Locale } from "./shared/locale.ts"
import { configureLocale, defaultLocale } from "./shared/render.ts"

export * from "./shared/errors.ts"
export * from "./shared/transform.ts"
export * from "./shared/traversal.ts"
export { isAbsent } from "./shared/utils.ts"
export { arrayIndexMatcher } from "./structure/shared.ts"

// node error contexts carry their descriptions, so expected reads them rather than describing a node
const writeExpected: ExpectedWriter = ctx => ctx.description!

// en, as far as the runtime's writers read it
export const runtimeLocale = {
	keywordPhrases: {} as Record<string, Locale.KeywordPhrase>,
	...errorWriters
}

// unless arktype has resolved its config, which sets the locale itself
if (defaultLocale === undefined)
	configureLocale(undefined, runtimeLocale as never)

export const runtimeConfig: ResolvedConfig = Object.freeze({
	...flatMorph(errorWritersByCode, (code, writers) => [
		code,
		Object.freeze({ expected: writeExpected, ...errorWriters, ...writers })
	]),
	// errors are copied without generating code, so validation never needs eval
	jitless: true,
	onFail: null
}) as never
