import { flatMorph } from "@ark/util"
import type { ResolvedConfig } from "./config.ts"
import { errorWriters, errorWritersByCode } from "./shared/errorWriters.ts"
import type { ExpectedWriter } from "./shared/errors.ts"
import type { Locale } from "./shared/locale.ts"
import { configureLocale, defaultConfig } from "./shared/render.ts"

export { describePredicate } from "./shared/errorWriters.ts"
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

export const runtimeConfig: ResolvedConfig = Object.freeze({
	...flatMorph(errorWritersByCode, (code, writers) => [
		code,
		Object.freeze({ expected: writeExpected, ...errorWriters, ...writers })
	]),
	// errors are copied without generating code, so validation never needs eval
	jitless: true,
	onFail: null,
	locale: runtimeLocale
}) as never

// unless arktype has resolved its config, which sets the locale itself
if (defaultConfig === undefined) configureLocale(undefined, runtimeConfig)

// a node shape's $, which traversal reads only for its config
export const runtimeScope: { resolvedConfig: ResolvedConfig } = Object.freeze({
	resolvedConfig: runtimeConfig
})
