import { envHasCsp, flatMorph, throwError } from "@ark/util"
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

// compiled code and the runtime it calls change together, so an artifact runs only on the version it was built for
export const abiVersion = 1

export const assertAbiVersion = (version: number): void => {
	if (version !== abiVersion)
		throwError(writeAbiVersionMismatchMessage(version, abiVersion))
}

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

export const runtimeConfig: ResolvedConfig = {
	...flatMorph(errorWritersByCode, (code, writers) => [
		code,
		{ expected: writeExpected, ...errorWriters, ...writers }
	]),
	jitless: envHasCsp(),
	onFail: null
} as never

export const writeAbiVersionMismatchMessage = <
	artifactVersion extends number,
	runtimeVersion extends number
>(
	artifactVersion: artifactVersion,
	runtimeVersion: runtimeVersion
): writeAbiVersionMismatchMessage<artifactVersion, runtimeVersion> =>
	`This artifact was built for version ${artifactVersion} of arktype's runtime, but version ${runtimeVersion} is installed. Rebuild it with the installed arktype.`

export type writeAbiVersionMismatchMessage<
	artifactVersion extends number,
	runtimeVersion extends number
> = `This artifact was built for version ${artifactVersion} of arktype's runtime, but version ${runtimeVersion} is installed. Rebuild it with the installed arktype.`
